// tests/unit/bot/features/guild-config/commands/guildConfigCommand.reset.test.ts
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

const resetGuildSettingsMock = vi.fn();
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    resetGuildSettings: resetGuildSettingsMock,
  }),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (d: string) => ({ kind: "success", description: d }),
  createWarningEmbed: (d: string, _o?: unknown) => ({
    kind: "warning",
    description: d,
  }),
}));

import { handleReset } from "@/bot/features/guild-config/commands/guildConfigCommand.reset";
import { GUILD_CONFIG_CUSTOM_ID } from "@/bot/features/guild-config/constants/guildConfig.constants";

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

// reset 確認ダイアログの表示・確認・キャンセルフローを検証
describe("bot/features/guild-config/commands/guildConfigCommand.reset", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("確認ダイアログが ephemeral で表示されること", async () => {
    const { interaction } = createInteraction();
    await handleReset(interaction, "guild-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("確認ボタン押下で resetGuildSettings と invalidateLocaleCache が呼ばれること", async () => {
    const { interaction, collectCb } = createInteraction();
    await handleReset(interaction, "guild-1");

    // collector の collect イベントをシミュレート
    const buttonInteraction = {
      customId: GUILD_CONFIG_CUSTOM_ID.RESET_CONFIRM,
      user: { id: "user-1" },
      update: vi.fn().mockResolvedValue(undefined),
    };
    await collectCb.collect(buttonInteraction);

    expect(resetGuildSettingsMock).toHaveBeenCalledWith("guild-1");
    expect(invalidateMock).toHaveBeenCalledWith("guild-1");
    expect(buttonInteraction.update).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });

  it("キャンセルボタン押下で resetGuildSettings が呼ばれないこと", async () => {
    const { interaction, collectCb } = createInteraction();
    await handleReset(interaction, "guild-1");

    const buttonInteraction = {
      customId: GUILD_CONFIG_CUSTOM_ID.RESET_CANCEL,
      user: { id: "user-1" },
      update: vi.fn().mockResolvedValue(undefined),
    };
    await collectCb.collect(buttonInteraction);

    expect(resetGuildSettingsMock).not.toHaveBeenCalled();
    expect(buttonInteraction.update).toHaveBeenCalled();
  });

  it("タイムアウト時にキャンセルメッセージに更新されること", async () => {
    const { interaction, collectCb } = createInteraction();
    await handleReset(interaction, "guild-1");

    // collector の end イベントをシミュレート
    await collectCb.end([], "time");

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });
});
