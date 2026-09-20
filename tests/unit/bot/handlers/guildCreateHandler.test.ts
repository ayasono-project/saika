// guildCreate ハンドラのテスト

const mockApplyBotPresence = vi.fn();

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

import { handleGuildCreate } from "@/bot/handlers/guildCreateHandler";
import { logger } from "@/shared/utils/logger";

describe("bot/handlers/guildCreateHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("参加したギルドの情報をログ出力すること", () => {
    const guild = { id: "guild-1", name: "Test Guild", client: {} };

    handleGuildCreate(guild as never);

    expect(logger.info).toHaveBeenCalledWith(
      '[system:log_prefix.guild_create] system:guild_create.joined:{"guildId":"guild-1","guildName":"Test Guild"}',
    );
  });

  it("プレゼンスを更新すること", () => {
    const client = {};
    const guild = { id: "guild-1", name: "Test Guild", client };

    handleGuildCreate(guild as never);

    expect(mockApplyBotPresence).toHaveBeenCalledWith(client);
  });
});
