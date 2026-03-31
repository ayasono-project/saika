// tests/unit/bot/features/guild-config/commands/guildConfigCommand.setLocale.test.ts
import type { ChatInputCommandInteraction } from "discord.js";

const invalidateMock = vi.hoisted(() => vi.fn());
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: invalidateMock },
}));

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("@/shared/utils/logger", () => ({ logger: loggerMock }));

const updateLocaleMock = vi.fn();
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    updateLocale: updateLocaleMock,
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (d: string) => ({ kind: "success", description: d }),
}));

import { handleSetLocale } from "@/bot/features/guild-config/commands/guildConfigCommand.setLocale";

function createInteraction(locale: string) {
  return {
    locale: "ja",
    user: { id: "user-1" },
    options: {
      getString: vi.fn(() => locale),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChatInputCommandInteraction;
}

// set-locale サブコマンドの言語設定フローを検証
describe("bot/features/guild-config/commands/guildConfigCommand.setLocale", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("locale が ja の場合は 日本語 (ja) ラベルで応答すること", async () => {
    const interaction = createInteraction("ja");
    await handleSetLocale(interaction, "guild-1");

    expect(updateLocaleMock).toHaveBeenCalledWith("guild-1", "ja");
    expect(invalidateMock).toHaveBeenCalledWith("guild-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("locale が en の場合は English (en) ラベルで応答すること", async () => {
    const interaction = createInteraction("en");
    await handleSetLocale(interaction, "guild-1");

    expect(updateLocaleMock).toHaveBeenCalledWith("guild-1", "en");
    expect(invalidateMock).toHaveBeenCalledWith("guild-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });
});
