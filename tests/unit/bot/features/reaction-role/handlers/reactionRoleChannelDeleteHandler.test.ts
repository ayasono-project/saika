// tests/unit/bot/features/reaction-role/handlers/reactionRoleChannelDeleteHandler.test.ts
// リアクションロールパネルチャンネル削除検知ハンドラのテスト

const mockConfigService = {
  findAllByGuild: vi.fn(),
  delete: vi.fn(),
};

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelConfigService: () => mockConfigService,
}));

import { handleReactionRoleChannelDelete } from "@/bot/features/reaction-role/handlers/reactionRoleChannelDeleteHandler";
import { logger } from "@/shared/utils/logger";

// チャンネル削除時のパネル設定クリーンアップ動作を検証する
describe("bot/features/reaction-role/handlers/reactionRoleChannelDeleteHandler", () => {
  // 各テストでモックをリセットしてテスト間の干渉を防ぐ
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guildId がない場合は何もしない", async () => {
    const channel = { id: "ch-1" };
    await handleReactionRoleChannelDelete(channel as never);
    expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
  });

  it("パネルのチャンネルIDと一致しない場合は削除しない", async () => {
    mockConfigService.findAllByGuild.mockResolvedValue([
      {
        id: "panel-1",
        guildId: "guild-1",
        channelId: "other-ch",
        messageId: "msg-1",
      },
    ]);

    const channel = { id: "ch-1", guildId: "guild-1" };
    await handleReactionRoleChannelDelete(channel as never);

    expect(mockConfigService.delete).not.toHaveBeenCalled();
  });

  it("チャンネルIDと一致するパネルが1つの場合に削除しログ出力する", async () => {
    mockConfigService.findAllByGuild.mockResolvedValue([
      {
        id: "panel-1",
        guildId: "guild-1",
        channelId: "ch-1",
        messageId: "msg-1",
      },
    ]);
    mockConfigService.delete.mockResolvedValue(undefined);

    const channel = { id: "ch-1", guildId: "guild-1" };
    await handleReactionRoleChannelDelete(channel as never);

    expect(mockConfigService.delete).toHaveBeenCalledWith("panel-1");
    expect(logger.info).toHaveBeenCalled();
  });

  it("チャンネルIDと一致するパネルが複数の場合にすべて削除する", async () => {
    mockConfigService.findAllByGuild.mockResolvedValue([
      {
        id: "panel-1",
        guildId: "guild-1",
        channelId: "ch-1",
        messageId: "msg-1",
      },
      {
        id: "panel-2",
        guildId: "guild-1",
        channelId: "ch-1",
        messageId: "msg-2",
      },
      {
        id: "panel-3",
        guildId: "guild-1",
        channelId: "other-ch",
        messageId: "msg-3",
      },
    ]);
    mockConfigService.delete.mockResolvedValue(undefined);

    const channel = { id: "ch-1", guildId: "guild-1" };
    await handleReactionRoleChannelDelete(channel as never);

    expect(mockConfigService.delete).toHaveBeenCalledTimes(2);
    expect(mockConfigService.delete).toHaveBeenCalledWith("panel-1");
    expect(mockConfigService.delete).toHaveBeenCalledWith("panel-2");
    expect(logger.info).toHaveBeenCalled();
  });

  it("findAllByGuild がエラーを投げた場合はエラーログを出力する", async () => {
    mockConfigService.findAllByGuild.mockRejectedValue(new Error("db error"));

    const channel = { id: "ch-1", guildId: "guild-1" };
    await handleReactionRoleChannelDelete(channel as never);

    expect(logger.error).toHaveBeenCalled();
  });
});
