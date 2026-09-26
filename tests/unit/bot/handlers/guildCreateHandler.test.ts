// guildCreate ハンドラのテスト

const mockApplyBotPresence = vi.fn();
const ensureGuildMock = vi.fn();
const cancelScheduledDeletionMock = vi.fn();
const sendGuildJoinDmUsecaseMock = vi.fn();
const syncGuildTicketsMock = vi.fn();
const ticketRepository = { id: "ticket-repo" };

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
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/bot/services/botPresence", () => ({
  applyBotPresence: (...args: unknown[]) => mockApplyBotPresence(...args),
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildRegistryRepository: () => ({
    ensureGuild: (...args: unknown[]) => ensureGuildMock(...args),
    cancelScheduledDeletion: (...args: unknown[]) =>
      cancelScheduledDeletionMock(...args),
  }),
  getBotTicketRepository: () => ticketRepository,
}));
vi.mock("@/features/ticket/services/ticketChannelSync", () => ({
  syncGuildTickets: (...args: unknown[]) => syncGuildTicketsMock(...args),
}));
vi.mock("@/features/guild-settings/usecases/sendGuildJoinDmUsecase", () => ({
  sendGuildJoinDmUsecase: (...args: unknown[]) =>
    sendGuildJoinDmUsecaseMock(...args),
}));

import { handleGuildCreate } from "@/bot/handlers/guildCreateHandler";
import { logger } from "@/shared/utils/logger";

// 参加ログ・親レコード作成・削除予約の取り消し・チケットの同期・DM 送信・プレゼンス更新と、
// 親レコード作成・同期の失敗時の継続、Bot が扱えないチケットの件数の DM への受け渡しを検証する
describe("bot/handlers/guildCreateHandler", () => {
  // 各ケースでモック呼び出し記録と既定の解決値をリセットし、テスト間の影響を断つ
  beforeEach(() => {
    vi.clearAllMocks();
    ensureGuildMock.mockResolvedValue(undefined);
    cancelScheduledDeletionMock.mockResolvedValue(null);
    sendGuildJoinDmUsecaseMock.mockResolvedValue(undefined);
    syncGuildTicketsMock.mockResolvedValue({
      inaccessibleCount: 0,
      notified: false,
    });
  });

  it("参加したギルドの情報をログ出力すること", async () => {
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(logger.info).toHaveBeenCalledWith(
      '[system:log_prefix.guild_create] system:guild_create.joined:{"guildId":"guild-1","guildName":"Test Guild"}',
    );
  });

  it("FK 先となるギルドの親レコードを作成すること", async () => {
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(ensureGuildMock).toHaveBeenCalledWith("guild-1");
  });

  it("猶予中の削除予約を取り消すこと", async () => {
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(cancelScheduledDeletionMock).toHaveBeenCalledWith("guild-1");
  });

  it("予約が無かった場合は DM へ null を渡すこと（新規導入として扱わせる）", async () => {
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(sendGuildJoinDmUsecaseMock).toHaveBeenCalledWith(guild, null, 0);
  });

  it("取り消した予約日時をそのまま DM へ渡すこと（再導入として扱わせる）", async () => {
    const deleteAt = new Date("2026-10-24T00:00:00.000Z");
    cancelScheduledDeletionMock.mockResolvedValueOnce(deleteAt);
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(sendGuildJoinDmUsecaseMock).toHaveBeenCalledWith(guild, deleteAt, 0);
  });

  it("親レコードの処理が失敗しても DM は送ること（新規導入扱いで案内だけは届ける）", async () => {
    ensureGuildMock.mockRejectedValueOnce(new Error("db down"));
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(sendGuildJoinDmUsecaseMock).toHaveBeenCalledWith(guild, null, 0);
  });

  it("プレゼンスを更新すること", async () => {
    const client = {};
    const guild = { id: "guild-1", name: "Test Guild", client };

    await handleGuildCreate(guild as never);

    expect(mockApplyBotPresence).toHaveBeenCalledWith(client);
  });

  it("親レコード作成が失敗してもエラーログのみで継続し、プレゼンスは更新されること", async () => {
    const error = new Error("db down");
    ensureGuildMock.mockRejectedValueOnce(error);
    const client = {};
    const guild = { id: "guild-1", name: "Test Guild", client };

    await expect(handleGuildCreate(guild as never)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      '[system:log_prefix.guild_create] system:guild_create.registry_failed:{"guildId":"guild-1"}',
      error,
    );
    expect(mockApplyBotPresence).toHaveBeenCalledWith(client);
  });

  it("チケットの状態を Discord に合わせ、Bot が入れないチケットのチャンネルは管理者に知らせる指定で同期すること（再導入時のタイマー組み直し・消されたチャンネルの片付け・上書きが消えたチャンネルの通知）", async () => {
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(syncGuildTicketsMock).toHaveBeenCalledWith(guild, ticketRepository, {
      notifyInaccessibleChannels: true,
    });
  });

  it("チケットの同期が失敗してもエラーログのみで、DM（件数は分からないので載せない）とプレゼンス更新は済んでいること", async () => {
    const error = new Error("sync failed");
    syncGuildTicketsMock.mockRejectedValueOnce(error);
    const client = {};
    const guild = { id: "guild-1", name: "Test Guild", client };

    await expect(handleGuildCreate(guild as never)).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalledWith(
      '[system:log_prefix.ticket] ticket:log.ticket_channel_sync_failed:{"guildId":"guild-1"}',
      error,
    );
    expect(sendGuildJoinDmUsecaseMock).toHaveBeenCalledWith(guild, null, 0);
    expect(mockApplyBotPresence).toHaveBeenCalledWith(client);
  });

  it("チケットの同期を DM より先に行うこと（エラー通知チャンネルへ届かなかった件数を DM に載せるため）", async () => {
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    await handleGuildCreate(guild as never);

    expect(syncGuildTicketsMock.mock.invocationCallOrder[0]).toBeLessThan(
      sendGuildJoinDmUsecaseMock.mock.invocationCallOrder[0],
    );
  });

  // Bot を外して入れ直したときの、Bot が扱えないチケットのチャンネルの知らせ方を検証
  describe("Bot が扱えないチケットのチャンネルの件数を DM に載せるか", () => {
    it("扱えないチケットがあり、エラー通知チャンネルへ届かなかった（Bot が入れない・未設定）ときは、その件数を DM に渡すこと", async () => {
      syncGuildTicketsMock.mockResolvedValueOnce({
        inaccessibleCount: 3,
        notified: false,
      });
      const deleteAt = new Date("2026-10-24T00:00:00.000Z");
      cancelScheduledDeletionMock.mockResolvedValueOnce(deleteAt);
      const guild = { id: "guild-1", name: "Test Guild", client: {} };

      await handleGuildCreate(guild as never);

      expect(sendGuildJoinDmUsecaseMock).toHaveBeenCalledWith(
        guild,
        deleteAt,
        3,
      );
    });

    it("エラー通知チャンネルへ届いたときは、DM には件数を渡さないこと（二重に知らせない）", async () => {
      syncGuildTicketsMock.mockResolvedValueOnce({
        inaccessibleCount: 3,
        notified: true,
      });
      const guild = { id: "guild-1", name: "Test Guild", client: {} };

      await handleGuildCreate(guild as never);

      expect(sendGuildJoinDmUsecaseMock).toHaveBeenCalledWith(guild, null, 0);
    });

    it("扱えないチケットが無ければ、DM には件数を渡さないこと", async () => {
      syncGuildTicketsMock.mockResolvedValueOnce({
        inaccessibleCount: 0,
        notified: false,
      });
      const guild = { id: "guild-1", name: "Test Guild", client: {} };

      await handleGuildCreate(guild as never);

      expect(sendGuildJoinDmUsecaseMock).toHaveBeenCalledWith(guild, null, 0);
    });
  });
});
