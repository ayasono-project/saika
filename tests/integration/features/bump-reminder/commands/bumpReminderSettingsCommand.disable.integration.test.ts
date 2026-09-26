/**
 * /bump-reminder-settings disable の結合テスト
 * 本物の BumpReminderManager と状態を持つ偽リポジトリを組み合わせ、
 * disable でギルドの予約が DB 上もタイマー上も取り消され、予約ごとのパネルも消えることを検証する。
 * あわせて、Bump の検知処理の途中で disable が完了した場合も予約とパネルが残らないことを検証する
 */

import type { Mock } from "vitest";
import { handleBumpReminderSettingsDisable } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.disable";
import {
  BUMP_REMINDER_STATUS,
  BUMP_SERVICES,
  type BumpServiceName,
  getReminderDelayMinutes,
} from "@/features/bump-reminder/constants/bumpReminderConstants";
import { handleBumpDetected } from "@/features/bump-reminder/handlers/bumpReminderHandler";
import { BumpReminderManager } from "@/features/bump-reminder/services/bumpReminderService";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (prefixKey: string, messageKey: string) =>
    `[${prefixKey}] ${messageKey}`,
  tDefault: (key: string) => key,
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: async () => (key: string) => key,
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) => ({ description }),
  createInfoEmbed: (description: string) => ({ description }),
}));

let currentManager: BumpReminderManager;
let currentRepository: ReturnType<typeof createFakeRepository>["repository"];
/** 設定の有効・無効（setBumpReminderEnabled で書き換わり、検知・送信の側が読む） */
let settingsEnabled = true;
const setEnabledMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderManager: () => currentManager,
  getBotBumpReminderRepository: () => currentRepository,
  getBotBumpReminderSettingsService: () => ({
    setBumpReminderEnabled: (...args: unknown[]) => setEnabledMock(...args),
    getBumpReminderSettingsOrDefault: async () => ({
      enabled: settingsEnabled,
      mentionUserIds: [],
    }),
  }),
}));

type FakeReminderRow = {
  id: string;
  guildId: string;
  channelId: string;
  panelMessageId: string | null;
  serviceName: BumpServiceName | null;
  status: string;
};

/**
 * create / updateStatus の結果を行として保持し、pending 行をギルド単位で引ける偽リポジトリを作る
 * @returns 偽リポジトリと、保持している行の配列
 */
function createFakeRepository() {
  const rows: FakeReminderRow[] = [];
  let sequence = 0;
  const repository = {
    create: vi.fn(
      async (
        guildId: string,
        channelId: string,
        scheduledAt: Date,
        messageId?: string,
        panelMessageId?: string,
        serviceName?: BumpServiceName,
      ) => {
        sequence += 1;
        const row: FakeReminderRow = {
          id: `reminder-${sequence}`,
          guildId,
          channelId,
          panelMessageId: panelMessageId ?? null,
          serviceName: serviceName ?? null,
          status: BUMP_REMINDER_STATUS.PENDING,
        };
        rows.push(row);
        return {
          ...row,
          scheduledAt,
          messageId: messageId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    ),
    updateStatus: vi.fn(async (id: string, status: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
    }),
    findPendingByGuild: vi.fn(async (guildId: string) =>
      rows
        .filter(
          (r) =>
            r.guildId === guildId && r.status === BUMP_REMINDER_STATUS.PENDING,
        )
        .map((r) => ({ ...r })),
    ),
    findPendingByGuildAndService: vi.fn(
      async (guildId: string, serviceName: BumpServiceName) => {
        const row = rows.find(
          (r) =>
            r.guildId === guildId &&
            r.serviceName === serviceName &&
            r.status === BUMP_REMINDER_STATUS.PENDING,
        );
        return row ? { ...row } : null;
      },
    ),
  };
  return { repository, rows };
}

/**
 * 投稿済みのパネルメッセージを保持し、取得・削除できる偽の Discord クライアントを作る
 * @param panelMessageIds チャンネルに残っているパネルメッセージID
 * @returns 偽クライアント、送信先チャンネル、残っているパネルメッセージIDの集合
 */
function createFakeClient(panelMessageIds: string[]) {
  const remainingPanels = new Set(panelMessageIds);
  const channel = {
    isTextBased: () => true,
    isSendable: () => true,
    // パネル・リマインドの送信（既定では送信済みのメッセージを返すだけ）
    send: vi.fn(async (_payload: unknown) => ({ id: "sent-message" })),
    messages: {
      fetch: vi.fn(async (messageId: string) => {
        if (!remainingPanels.has(messageId)) {
          throw new Error("Unknown Message");
        }
        return {
          delete: vi.fn(async () => {
            remainingPanels.delete(messageId);
          }),
        };
      }),
    },
  };
  const client = { channels: { fetch: vi.fn(async () => channel) } };
  return { client, channel, remainingPanels };
}

const REMINDER_DELAY_MINUTES = 120;

// disable がギルドの全サービスの予約を取り消し、他ギルドには触れないことを検証
describe("features/bump-reminder/commands/bumpReminderSettingsCommand.disable (integration)", () => {
  let rows: FakeReminderRow[];
  let fakeClient: ReturnType<typeof createFakeClient>;
  let disboardTask: Mock<() => Promise<void>>;
  let dissokuTask: Mock<() => Promise<void>>;
  let otherGuildTask: Mock<() => Promise<void>>;

  // 予約の発火を時刻で確かめるため fake timers にし、対象ギルドに2サービス・別ギルドに1件の予約を入れる
  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-26T00:00:00.000Z"));
    jobScheduler.stopAll();

    const fake = createFakeRepository();
    rows = fake.rows;
    currentRepository = fake.repository;
    currentManager = new BumpReminderManager(fake.repository as never);
    settingsEnabled = true;
    setEnabledMock.mockImplementation(
      async (_guildId: string, enabled: boolean) => {
        settingsEnabled = enabled;
      },
    );
    fakeClient = createFakeClient([
      "panel-disboard",
      "panel-dissoku",
      "panel-other",
    ]);

    disboardTask = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    dissokuTask = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    otherGuildTask = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await currentManager.setReminder(
      "guild-1",
      "channel-1",
      undefined,
      "panel-disboard",
      REMINDER_DELAY_MINUTES,
      disboardTask,
      BUMP_SERVICES.DISBOARD,
    );
    await currentManager.setReminder(
      "guild-1",
      "channel-1",
      undefined,
      "panel-dissoku",
      REMINDER_DELAY_MINUTES,
      dissokuTask,
      BUMP_SERVICES.DISSOKU,
    );
    await currentManager.setReminder(
      "guild-2",
      "channel-2",
      undefined,
      "panel-other",
      REMINDER_DELAY_MINUTES,
      otherGuildTask,
      BUMP_SERVICES.DISBOARD,
    );
  });

  // 残ったジョブとタイマーを片付け、他のテストへ持ち越さない
  afterEach(() => {
    jobScheduler.stopAll();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("disable 後、対象ギルドの予約は全サービスとも cancelled になり pending が残らない", async () => {
    const interaction = {
      locale: "ja",
      client: fakeClient.client,
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsDisable(interaction as never, "guild-1");

    const guild1Rows = rows.filter((r) => r.guildId === "guild-1");
    expect(guild1Rows).toHaveLength(2);
    expect(
      guild1Rows.every((r) => r.status === BUMP_REMINDER_STATUS.CANCELLED),
    ).toBe(true);
    expect(rows.find((r) => r.guildId === "guild-2")?.status).toBe(
      BUMP_REMINDER_STATUS.PENDING,
    );
    expect(setEnabledMock).toHaveBeenCalledWith("guild-1", false);
  });

  it("disable 後に予定時刻を過ぎても、対象ギルドの予約は発火せず別ギルドの予約だけが発火する", async () => {
    const interaction = {
      locale: "ja",
      client: fakeClient.client,
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsDisable(interaction as never, "guild-1");
    await vi.advanceTimersByTimeAsync((REMINDER_DELAY_MINUTES + 1) * 60 * 1000);

    expect(disboardTask).not.toHaveBeenCalled();
    expect(dissokuTask).not.toHaveBeenCalled();
    expect(otherGuildTask).toHaveBeenCalledTimes(1);
  });

  // 取り消した予約は送信されず、送信後のパネル削除も走らないため、disable で消さないと
  // 「リマインドが通知されます」のパネルが残り続ける（回帰テスト）
  it("disable で対象ギルドの予約のパネルは全サービスとも消え、別ギルドのパネルは残る", async () => {
    const interaction = {
      locale: "ja",
      client: fakeClient.client,
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsDisable(interaction as never, "guild-1");

    expect([...fakeClient.remainingPanels]).toEqual(["panel-other"]);
  });

  // 検知側が最初に設定を読んでから予約を登録するまで（パネルの送信を待つ間）に disable が完了すると、
  // 取り消しはまだ無い予約を拾えない。検知側が登録後に設定を読み直して取り消すことを確かめる（回帰テスト）
  describe("Bump の検知処理の途中で disable が完了した場合", () => {
    /**
     * 新しいパネルの送信を待っている間に disable を完了させてから、検知処理を最後まで走らせる
     * @returns 実行完了を示す Promise
     */
    async function detectBumpWhileDisabling(): Promise<void> {
      const interaction = {
        locale: "ja",
        client: fakeClient.client,
        reply: vi.fn().mockResolvedValue(undefined),
      };
      fakeClient.channel.send.mockImplementationOnce(async () => {
        await handleBumpReminderSettingsDisable(
          interaction as never,
          "guild-1",
        );
        fakeClient.remainingPanels.add("panel-new");
        return { id: "panel-new" };
      });

      await handleBumpDetected(
        fakeClient.client as never,
        "guild-1",
        "channel-1",
        "bump-message-1",
        BUMP_SERVICES.DISBOARD,
      );
    }

    it("検知が登録した予約も cancelled になり、送ったパネルも消える", async () => {
      await detectBumpWhileDisabling();

      const guild1Rows = rows.filter((r) => r.guildId === "guild-1");
      // 事前の2件に、検知処理が登録した1件が加わる
      expect(guild1Rows).toHaveLength(3);
      expect(
        guild1Rows.every((r) => r.status === BUMP_REMINDER_STATUS.CANCELLED),
      ).toBe(true);
      expect(fakeClient.remainingPanels.has("panel-new")).toBe(false);
      expect(
        currentManager.hasReminder("guild-1", BUMP_SERVICES.DISBOARD),
      ).toBe(false);
    });

    it("予定時刻の前に有効へ戻しても、無効にする前の Bump のリマインドは届かない", async () => {
      await detectBumpWhileDisabling();

      settingsEnabled = true;
      await vi.advanceTimersByTimeAsync(
        (getReminderDelayMinutes() + 1) * 60 * 1000,
      );

      // 送信はパネルの1回だけで、リマインドは送られない
      expect(fakeClient.channel.send).toHaveBeenCalledTimes(1);
    });
  });
});
