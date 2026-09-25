// ギルド登録の照合と猶予切れギルド削除スイープの配線のテスト

const reconcileGuildsUsecaseMock = vi.fn();
const addJobMock = vi.fn();
const loggerInfoMock = vi.fn();
const loggerDebugMock = vi.fn();
const loggerErrorMock = vi.fn();

vi.mock("@/features/guild-settings/usecases/reconcileGuildsUsecase", () => ({
  reconcileGuildsUsecase: (...args: unknown[]) =>
    reconcileGuildsUsecaseMock(...args),
}));
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${prefixKey}] ${m}`;
  },
  tDefault: vi.fn((key: string) => key),
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: (...args: unknown[]) => loggerDebugMock(...args),
    info: (...args: unknown[]) => loggerInfoMock(...args),
    warn: vi.fn(),
    error: (...args: unknown[]) => loggerErrorMock(...args),
  },
}));
vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: { addJob: (...args: unknown[]) => addJobMock(...args) },
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildRegistryRepository: () => ({}),
  getBotTicketRepository: () => ({}),
  getBotBumpReminderManager: () => ({}),
}));

import { type Client, Collection } from "discord.js";
import {
  registerGuildDeletionJob,
  runGuildDeletionSweep,
} from "@/bot/services/guildDeletionSweep";

const guildsFetchMock = vi.fn();

// 参加ギルドの一覧は REST（guilds.fetch）から取る。キャッシュには、再接続後に消えた
// ギルド（stale）が残っている想定にして、照合がキャッシュを見ていないことも確かめる
const client = {
  guilds: {
    fetch: (...args: unknown[]) => guildsFetchMock(...args),
    cache: new Map([["stale", {}]]),
  },
} as unknown as Client;

/**
 * guilds.fetch が返す1ページ分のコレクションを作る
 * @param ids ページに含めるギルド ID（昇順）
 * @returns ID をキーにしたコレクション
 */
function guildPage(ids: string[]) {
  return new Collection(ids.map((id) => [id, {}]));
}

/**
 * 照合結果の既定値（何も変化しない）に部分的な上書きを重ねる
 * @param overrides 上書きする件数
 * @returns 照合結果
 */
function reconcileResult(
  overrides: Partial<{
    cancelledCount: number;
    scheduledCount: number;
    purgedCount: number;
  }> = {},
) {
  return { cancelledCount: 0, scheduledCount: 0, purgedCount: 0, ...overrides };
}

// 照合結果に応じたログ出し分け・例外の握りつぶし・ジョブ登録内容を検証する
describe("bot/services/guildDeletionSweep", () => {
  // 各ケースでモック呼び出し記録と既定の解決値をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    reconcileGuildsUsecaseMock.mockResolvedValue(reconcileResult());
    guildsFetchMock.mockResolvedValue(guildPage(["g1", "g2"]));
  });

  describe("runGuildDeletionSweep", () => {
    it("何も変化しなかったときは debug ログのみ出すこと", async () => {
      await runGuildDeletionSweep(client);

      expect(loggerDebugMock).toHaveBeenCalledWith(
        "[system:log_prefix.guild_deletion] system:guild_deletion.no_target",
      );
      expect(loggerInfoMock).not.toHaveBeenCalled();
    });

    it("変化した段だけ件数付きで info ログを出すこと", async () => {
      reconcileGuildsUsecaseMock.mockResolvedValueOnce(
        reconcileResult({ scheduledCount: 4, purgedCount: 3 }),
      );

      await runGuildDeletionSweep(client);

      expect(loggerInfoMock).toHaveBeenCalledTimes(2);
      expect(loggerInfoMock).toHaveBeenCalledWith(
        '[system:log_prefix.guild_deletion] system:guild_deletion.schedule_added:{"count":4}',
      );
      expect(loggerInfoMock).toHaveBeenCalledWith(
        '[system:log_prefix.guild_deletion] system:guild_deletion.purged:{"count":3}',
      );
    });

    it("参加中ギルドの予約を取り消したときは件数付きで info ログを出すこと", async () => {
      reconcileGuildsUsecaseMock.mockResolvedValueOnce(
        reconcileResult({ cancelledCount: 1 }),
      );

      await runGuildDeletionSweep(client);

      expect(loggerInfoMock).toHaveBeenCalledWith(
        '[system:log_prefix.guild_deletion] system:guild_deletion.schedule_cancelled:{"count":1}',
      );
    });

    it("REST で取得した参加中のギルド ID（キャッシュではない）と現在時刻をユースケースへ引き渡すこと", async () => {
      const now = new Date("2026-10-24T00:00:00.000Z");

      await runGuildDeletionSweep(client, now);

      expect(reconcileGuildsUsecaseMock).toHaveBeenCalledWith(
        expect.anything(),
        ["g1", "g2"],
        now,
      );
    });

    it("1ページが満杯のときは最後の ID を起点に次のページを取り、全ページ分を渡すこと", async () => {
      const firstPage = Array.from(
        { length: 200 },
        (_, i) => `g${String(i).padStart(3, "0")}`,
      );
      guildsFetchMock
        .mockResolvedValueOnce(guildPage(firstPage))
        .mockResolvedValueOnce(guildPage(["g200"]));

      await runGuildDeletionSweep(client);

      expect(guildsFetchMock).toHaveBeenNthCalledWith(1, { limit: 200 });
      expect(guildsFetchMock).toHaveBeenNthCalledWith(2, {
        limit: 200,
        after: "g199",
      });
      const joined = reconcileGuildsUsecaseMock.mock.calls[0][1] as string[];
      expect(joined).toHaveLength(201);
      expect(joined.at(-1)).toBe("g200");
    });

    it("参加ギルドの取得に失敗したら照合せずエラーログに落とすこと", async () => {
      const error = new Error("rest down");
      guildsFetchMock.mockRejectedValueOnce(error);

      await expect(runGuildDeletionSweep(client)).resolves.toBeUndefined();

      expect(reconcileGuildsUsecaseMock).not.toHaveBeenCalled();
      expect(loggerErrorMock).toHaveBeenCalledWith(
        "[system:log_prefix.guild_deletion] system:guild_deletion.sweep_failed",
        error,
      );
    });

    it("例外は伝播させずエラーログに落とすこと（Bot の稼働を止めない）", async () => {
      const error = new Error("db down");
      reconcileGuildsUsecaseMock.mockRejectedValueOnce(error);

      await expect(runGuildDeletionSweep(client)).resolves.toBeUndefined();

      expect(loggerErrorMock).toHaveBeenCalledWith(
        "[system:log_prefix.guild_deletion] system:guild_deletion.sweep_failed",
        error,
      );
    });
  });

  describe("registerGuildDeletionJob", () => {
    it("固定 ID・毎日 4 時・タイムゾーン指定・多重実行防止でジョブを登録すること", () => {
      registerGuildDeletionJob(client);

      expect(addJobMock).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "guild-settings:deletion-sweep",
          schedule: "0 4 * * *",
          timezone: "Asia/Tokyo",
          noOverlap: true,
        }),
      );
    });

    it("登録したタスクを実行すると参加中のギルドで照合が走ること", async () => {
      registerGuildDeletionJob(client);
      const task = addJobMock.mock.calls[0][0].task as () => Promise<void>;

      await task();

      expect(reconcileGuildsUsecaseMock).toHaveBeenCalledWith(
        expect.anything(),
        ["g1", "g2"],
        expect.any(Date),
      );
    });
  });
});
