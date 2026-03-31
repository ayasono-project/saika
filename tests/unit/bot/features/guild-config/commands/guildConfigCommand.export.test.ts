// tests/unit/bot/features/guild-config/commands/guildConfigCommand.export.test.ts
import type { ChatInputCommandInteraction } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const loggerMock = vi.hoisted(() => ({
  debug: vi.fn(),
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
}));
vi.mock("@/shared/utils/logger", () => ({ logger: loggerMock }));

const exportConfigMock = vi.fn();
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    exportConfig: exportConfigMock,
  }),
}));

const createSuccessEmbedMock = vi.fn((d: string) => ({
  kind: "success",
  description: d,
}));
const createErrorEmbedMock = vi.fn((d: string) => ({
  kind: "error",
  description: d,
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (d: string, _o?: unknown) => createSuccessEmbedMock(d),
  createErrorEmbed: (d: string, _o?: unknown) => createErrorEmbedMock(d),
}));

import { handleExport } from "@/bot/features/guild-config/commands/guildConfigCommand.export";

function createInteraction() {
  return {
    locale: "ja",
    reply: vi.fn().mockResolvedValue(undefined),
  } as unknown as ChatInputCommandInteraction;
}

// export のエクスポートデータ生成・添付ファイル返信・設定なし時のエラー返信を検証
describe("bot/features/guild-config/commands/guildConfigCommand.export", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が存在する場合は JSONファイル添付で成功返信すること", async () => {
    exportConfigMock.mockResolvedValue({
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      guildId: "guild-1",
      config: { locale: "ja" },
    });
    const interaction = createInteraction();
    await handleExport(interaction, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: 64,
        files: expect.arrayContaining([expect.any(Object)]),
      }),
    );
    expect(createSuccessEmbedMock).toHaveBeenCalled();
  });

  it("設定が存在しない場合はエラーメッセージを返すこと", async () => {
    exportConfigMock.mockResolvedValue(null);
    const interaction = createInteraction();
    await handleExport(interaction, "guild-1");

    expect(createErrorEmbedMock).toHaveBeenCalledWith(
      "guildConfig:user-response.export_empty",
    );
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });
});
