// tests/unit/bot/features/guild-settings/commands/guildSettingsCommand.resetAll.test.ts
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

const deleteAllConfigMock = vi.fn();
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildSettingsService: () => ({
    deleteAllSettings: deleteAllConfigMock,
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (d: string) => ({ kind: "success", description: d }),
  createWarningEmbed: (d: string, _o?: unknown) => ({
    kind: "warning",
    description: d,
  }),
}));

import { handleResetAll } from "@/features/guild-settings/commands/guildSettingsCommand.resetAll";
import { GUILD_SETTINGS_CUSTOM_ID } from "@/features/guild-settings/constants/guildSettings.constants";

function createInteraction() {
  const collectCb: Record<string, (...args: unknown[]) => void> = {};
  return {
    interaction: {
      locale: "ja",
      user: { id: "user-1" },
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

// reset-all 確認ダイアログの表示・確認・キャンセルフローを検証
describe("bot/features/guild-settings/commands/guildSettingsCommand.resetAll", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("確認ダイアログが削除対象フィールド付きで表示されること", async () => {
    const { interaction } = createInteraction();
    await handleResetAll(interaction, "guild-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("確認ボタン押下で deleteAllSettings と invalidateLocaleCache が呼ばれること", async () => {
    const { interaction, collectCb } = createInteraction();
    await handleResetAll(interaction, "guild-1");

    const buttonInteraction = {
      customId: GUILD_SETTINGS_CUSTOM_ID.RESET_ALL_CONFIRM,
      user: { id: "user-1" },
      update: vi.fn().mockResolvedValue(undefined),
    };
    await collectCb.collect(buttonInteraction);

    expect(deleteAllConfigMock).toHaveBeenCalledWith("guild-1");
    expect(invalidateMock).toHaveBeenCalledWith("guild-1");
  });

  it("キャンセルボタン押下で deleteAllSettings が呼ばれないこと", async () => {
    const { interaction, collectCb } = createInteraction();
    await handleResetAll(interaction, "guild-1");

    const buttonInteraction = {
      customId: GUILD_SETTINGS_CUSTOM_ID.RESET_ALL_CANCEL,
      user: { id: "user-1" },
      update: vi.fn().mockResolvedValue(undefined),
    };
    await collectCb.collect(buttonInteraction);

    expect(deleteAllConfigMock).not.toHaveBeenCalled();
  });

  it("タイムアウト時にキャンセルメッセージに更新されること", async () => {
    const { interaction, collectCb } = createInteraction();
    await handleResetAll(interaction, "guild-1");
    await collectCb.end([], "time");
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });
});
