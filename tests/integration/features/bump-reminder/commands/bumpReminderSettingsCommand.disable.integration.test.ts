/**
 * /bump-reminder-settings disable の結合テスト
 * 本物の BumpReminderManager と状態を持つ偽リポジトリを組み合わせ、
 * disable でギルドの予約が DB 上もタイマー上も取り消されることを検証する
 */

import type { Mock } from "vitest";
import { handleBumpReminderSettingsDisable } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.disable";
import {
  BUMP_REMINDER_STATUS,
  BUMP_SERVICES,
  type BumpServiceName,
} from "@/features/bump-reminder/constants/bumpReminderConstants";
import { BumpReminderManager } from "@/features/bump-reminder/services/bumpReminderService";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (prefixKey: string, messageKey: string) =>
    `[${prefixKey}] ${messageKey}`,
  tDefault: (key: string) => key,
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) => ({ description }),
}));

let currentManager: BumpReminderManager;
const setEnabledMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderManager: () => currentManager,
  getBotBumpReminderSettingsService: () => ({
    setBumpReminderEnabled: (...args: unknown[]) => setEnabledMock(...args),
  }),
}));

type FakeReminderRow = {
  id: string;
  guildId: string;
  serviceName: BumpServiceName | null;
  status: string;
};

/**
 * create / updateStatus の結果を行として保持する偽リポジトリを作る
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
          serviceName: serviceName ?? null,
          status: BUMP_REMINDER_STATUS.PENDING,
        };
        rows.push(row);
        return {
          ...row,
          channelId,
          scheduledAt,
          messageId: messageId ?? null,
          panelMessageId: panelMessageId ?? null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      },
    ),
    updateStatus: vi.fn(async (id: string, status: string) => {
      const row = rows.find((r) => r.id === id);
      if (row) row.status = status;
    }),
  };
  return { repository, rows };
}

const REMINDER_DELAY_MINUTES = 120;

// disable がギルドの全サービスの予約を取り消し、他ギルドには触れないことを検証
describe("features/bump-reminder/commands/bumpReminderSettingsCommand.disable (integration)", () => {
  let rows: FakeReminderRow[];
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
    currentManager = new BumpReminderManager(fake.repository as never);
    setEnabledMock.mockResolvedValue(undefined);

    disboardTask = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    dissokuTask = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    otherGuildTask = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    await currentManager.setReminder(
      "guild-1",
      "channel-1",
      undefined,
      undefined,
      REMINDER_DELAY_MINUTES,
      disboardTask,
      BUMP_SERVICES.DISBOARD,
    );
    await currentManager.setReminder(
      "guild-1",
      "channel-1",
      undefined,
      undefined,
      REMINDER_DELAY_MINUTES,
      dissokuTask,
      BUMP_SERVICES.DISSOKU,
    );
    await currentManager.setReminder(
      "guild-2",
      "channel-2",
      undefined,
      undefined,
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
      reply: vi.fn().mockResolvedValue(undefined),
    };

    await handleBumpReminderSettingsDisable(interaction as never, "guild-1");
    await vi.advanceTimersByTimeAsync((REMINDER_DELAY_MINUTES + 1) * 60 * 1000);

    expect(disboardTask).not.toHaveBeenCalled();
    expect(dissokuTask).not.toHaveBeenCalled();
    expect(otherGuildTask).toHaveBeenCalledTimes(1);
  });
});
