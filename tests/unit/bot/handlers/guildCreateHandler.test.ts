// guildCreate ハンドラのテスト

const mockApplyBotPresence = vi.fn();
const ensureGuildMock = vi.fn();

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
  }),
}));

import { handleGuildCreate } from "@/bot/handlers/guildCreateHandler";
import { logger } from "@/shared/utils/logger";

// 参加ログ・親レコード作成・プレゼンス更新と、親レコード作成失敗時の継続を検証する
describe("bot/handlers/guildCreateHandler", () => {
  // 各ケースでモック呼び出し記録と既定の解決値をリセットし、テスト間の影響を断つ
  beforeEach(() => {
    vi.clearAllMocks();
    ensureGuildMock.mockResolvedValue(undefined);
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
});
