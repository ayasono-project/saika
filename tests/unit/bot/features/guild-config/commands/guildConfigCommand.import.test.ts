// tests/unit/bot/features/guild-config/commands/guildConfigCommand.import.test.ts
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

const validateImportDataMock = vi.fn();
const importConfigMock = vi.fn();
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    validateImportData: validateImportDataMock,
    importConfig: importConfigMock,
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (d: string) => ({ kind: "success", description: d }),
  createErrorEmbed: (d: string) => ({ kind: "error", description: d }),
  createWarningEmbed: (d: string, _o?: unknown) => ({
    kind: "warning",
    description: d,
  }),
}));

// fetch モック
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { handleImport } from "@/bot/features/guild-config/commands/guildConfigCommand.import";
import { GUILD_CONFIG_CUSTOM_ID } from "@/bot/features/guild-config/constants/guildConfig.constants";

function createInteraction(guildChannels: string[] = []) {
  const collectCb: Record<string, (...args: unknown[]) => void> = {};
  const channelCache = new Map(guildChannels.map((id) => [id, { id }]));
  return {
    interaction: {
      locale: "ja",
      guildId: "guild-1",
      user: { id: "user-1" },
      guild: {
        channels: { cache: channelCache },
        roles: { cache: new Map() },
      },
      options: {
        getAttachment: vi.fn(() => ({ url: "https://example.com/file.json" })),
      },
      reply: vi.fn().mockResolvedValue({
        createMessageComponentCollector: vi.fn(() => ({
          on: vi.fn((event: string, cb: (...args: unknown[]) => void) => {
            collectCb[event] = cb;
          }),
          stop: vi.fn(),
        })),
      }),
      editReply: vi.fn().mockResolvedValue(undefined),
    } as unknown as ChatInputCommandInteraction,
    collectCb,
  };
}

// import のバリデーション・確認ダイアログ・インポート実行・キャンセルを検証
describe("bot/features/guild-config/commands/guildConfigCommand.import", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("JSONパースエラーの場合はエラーメッセージを返すこと", async () => {
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve("invalid json"),
    });
    const { interaction } = createInteraction();
    await handleImport(interaction, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          {
            kind: "error",
            description: "guildConfig:user-response.import_invalid_json",
          },
        ],
      }),
    );
  });

  it("バリデーションエラーの場合はエラーメッセージを返すこと", async () => {
    const validJson = JSON.stringify({ version: 999 });
    fetchMock.mockResolvedValue({ text: () => Promise.resolve(validJson) });
    validateImportDataMock.mockReturnValue(
      "guildConfig:user-response.import_unsupported_version",
    );

    const { interaction } = createInteraction();
    await handleImport(interaction, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [
          {
            kind: "error",
            description: "guildConfig:user-response.import_unsupported_version",
          },
        ],
      }),
    );
  });

  it("バリデーション通過時は確認ダイアログが表示されること", async () => {
    const data = { version: 1, guildId: "guild-1", config: { locale: "ja" } };
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    validateImportDataMock.mockReturnValue(null);

    const { interaction } = createInteraction();
    await handleImport(interaction, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("確認ボタン押下で importConfig と invalidateLocaleCache が呼ばれること", async () => {
    const data = { version: 1, guildId: "guild-1", config: { locale: "ja" } };
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    validateImportDataMock.mockReturnValue(null);

    const { interaction, collectCb } = createInteraction();
    await handleImport(interaction, "guild-1");

    const buttonInteraction = {
      customId: GUILD_CONFIG_CUSTOM_ID.IMPORT_CONFIRM,
      user: { id: "user-1" },
      update: vi.fn().mockResolvedValue(undefined),
    };
    await collectCb.collect(buttonInteraction);

    expect(importConfigMock).toHaveBeenCalled();
    expect(invalidateMock).toHaveBeenCalledWith("guild-1");
  });

  it("キャンセルボタン押下で importConfig が呼ばれないこと", async () => {
    const data = { version: 1, guildId: "guild-1", config: { locale: "ja" } };
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    validateImportDataMock.mockReturnValue(null);

    const { interaction, collectCb } = createInteraction();
    await handleImport(interaction, "guild-1");

    const buttonInteraction = {
      customId: GUILD_CONFIG_CUSTOM_ID.IMPORT_CANCEL,
      user: { id: "user-1" },
      update: vi.fn().mockResolvedValue(undefined),
    };
    await collectCb.collect(buttonInteraction);

    expect(importConfigMock).not.toHaveBeenCalled();
  });

  it("チャンネル/ロールが不在の場合は警告付きで確認ダイアログが表示されること", async () => {
    const data = {
      version: 1,
      guildId: "guild-1",
      config: { locale: "ja", errorChannelId: "missing-ch" },
    };
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    validateImportDataMock.mockReturnValue(null);

    // missing-ch はチャンネルキャッシュに含まれない
    const { interaction } = createInteraction([]);
    await handleImport(interaction, "guild-1");

    // 警告付きの確認ダイアログが表示されること
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("AFK・メンバーログ・Bumpリマインダーのリソースが不在の場合も警告付きで表示されること", async () => {
    const data = {
      version: 1,
      guildId: "guild-1",
      config: {
        locale: "ja",
        afk: { channelId: "missing-afk-ch" },
        memberLog: { channelId: "missing-ml-ch" },
        bumpReminder: { mentionRoleId: "missing-role" },
      },
    };
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    validateImportDataMock.mockReturnValue(null);

    // すべてのリソースがキャッシュに存在しない
    const { interaction } = createInteraction([]);
    await handleImport(interaction, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("タイムアウト時にキャンセルメッセージに更新されること", async () => {
    const data = { version: 1, guildId: "guild-1", config: { locale: "ja" } };
    fetchMock.mockResolvedValue({
      text: () => Promise.resolve(JSON.stringify(data)),
    });
    validateImportDataMock.mockReturnValue(null);

    const { interaction, collectCb } = createInteraction();
    await handleImport(interaction, "guild-1");
    await collectCb.end([], "time");

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });
});
