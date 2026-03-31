// tests/unit/bot/features/guild-config/commands/guildConfigCommand.execute.test.ts
import type { ChatInputCommandInteraction } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
  localeManager: { invalidateLocaleCache: vi.fn() },
}));

const handleSetLocaleMock = vi.fn();
const handleSetErrorChannelMock = vi.fn();
const handleViewMock = vi.fn();
const handleResetMock = vi.fn();
const handleResetAllMock = vi.fn();
const handleExportMock = vi.fn();
const handleImportMock = vi.fn();

vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.setLocale",
  () => ({
    handleSetLocale: (...args: unknown[]) => handleSetLocaleMock(...args),
  }),
);
vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.setErrorChannel",
  () => ({
    handleSetErrorChannel: (...args: unknown[]) =>
      handleSetErrorChannelMock(...args),
  }),
);
vi.mock("@/bot/features/guild-config/commands/guildConfigCommand.view", () => ({
  handleView: (...args: unknown[]) => handleViewMock(...args),
}));
vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.reset",
  () => ({
    handleReset: (...args: unknown[]) => handleResetMock(...args),
  }),
);
vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.resetAll",
  () => ({
    handleResetAll: (...args: unknown[]) => handleResetAllMock(...args),
  }),
);
vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.export",
  () => ({
    handleExport: (...args: unknown[]) => handleExportMock(...args),
  }),
);
vi.mock(
  "@/bot/features/guild-config/commands/guildConfigCommand.import",
  () => ({
    handleImport: (...args: unknown[]) => handleImportMock(...args),
  }),
);

import { executeGuildConfigCommand } from "@/bot/features/guild-config/commands/guildConfigCommand.execute";

function createInteraction(
  subcommand: string,
  overrides?: Record<string, unknown>,
) {
  return {
    guildId: "guild-1",
    locale: "ja",
    memberPermissions: { has: vi.fn(() => true) },
    options: { getSubcommand: vi.fn(() => subcommand) },
    ...overrides,
  } as unknown as ChatInputCommandInteraction;
}

// サブコマンドルーティングと権限チェックを検証
describe("bot/features/guild-config/commands/guildConfigCommand.execute", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guildId が null の場合は ValidationError をスローすること", async () => {
    const interaction = createInteraction("view", { guildId: null });
    await expect(executeGuildConfigCommand(interaction)).rejects.toThrow();
  });

  it("ManageGuild 権限がない場合は ValidationError をスローすること", async () => {
    const interaction = createInteraction("view", {
      memberPermissions: { has: vi.fn(() => false) },
    });
    await expect(executeGuildConfigCommand(interaction)).rejects.toThrow();
  });

  it.each([
    ["set-locale", handleSetLocaleMock],
    ["set-error-channel", handleSetErrorChannelMock],
    ["view", handleViewMock],
    ["reset", handleResetMock],
    ["reset-all", handleResetAllMock],
    ["export", handleExportMock],
    ["import", handleImportMock],
  ])("サブコマンド '%s' が正しいハンドラに委譲されること", async (subcommand, mock) => {
    const interaction = createInteraction(subcommand);
    await executeGuildConfigCommand(interaction);
    expect(mock).toHaveBeenCalledWith(interaction, "guild-1");
  });

  it("不正なサブコマンドの場合は ValidationError をスローすること", async () => {
    const interaction = createInteraction("invalid-command");
    await expect(executeGuildConfigCommand(interaction)).rejects.toThrow();
  });
});
