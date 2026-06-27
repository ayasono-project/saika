// tests/unit/features/inactive-kick/commands/inactiveKickSettingsCommand.execute.test.ts

import type { ChatInputCommandInteraction } from "discord.js";

const mocks = vi.hoisted(() => ({
  getSettingsOrDefault: vi.fn(),
  followUp: vi.fn(),
  handleView: vi.fn(),
  handleSetWeekWarnMessage: vi.fn(),
  handleSetFinalWarnMessage: vi.fn(),
  handleSetKickMessage: vi.fn(),
  logger: { error: vi.fn() },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotInactiveKickSettingsService: () => ({
    getSettingsOrDefault: mocks.getSettingsOrDefault,
  }),
}));
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
}));
vi.mock("@/bot/shared/permissionGuards", () => ({
  ensureManageGuildPermission: vi.fn(),
}));
vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: async () => (key: string) => key,
}));
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.view",
  () => ({
    handleInactiveKickView: (...args: unknown[]) => mocks.handleView(...args),
  }),
);
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.messages",
  () => ({
    handleInactiveKickSetWeekWarnMessage: (...args: unknown[]) =>
      mocks.handleSetWeekWarnMessage(...args),
    handleInactiveKickSetFinalWarnMessage: (...args: unknown[]) =>
      mocks.handleSetFinalWarnMessage(...args),
    handleInactiveKickSetKickMessage: (...args: unknown[]) =>
      mocks.handleSetKickMessage(...args),
    handleInactiveKickClearWeekWarnMessage: vi.fn(),
    handleInactiveKickClearFinalWarnMessage: vi.fn(),
    handleInactiveKickClearKickMessage: vi.fn(),
  }),
);
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.simple",
  () => ({
    handleInactiveKickSetChannel: vi.fn(),
    handleInactiveKickSetThreshold: vi.fn(),
    handleInactiveKickEnable: vi.fn(),
    handleInactiveKickDisable: vi.fn(),
  }),
);
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.markerRole",
  () => ({
    handleInactiveKickSetMarkerRole: vi.fn(),
    handleInactiveKickClearMarkerRole: vi.fn(),
  }),
);
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.preview",
  () => ({ handleInactiveKickPreview: vi.fn() }),
);
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.reset",
  () => ({ handleInactiveKickReset: vi.fn() }),
);
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.schedule",
  () => ({
    handleInactiveKickSetTimezone: vi.fn(),
    handleInactiveKickSetRunHour: vi.fn(),
    handleInactiveKickMentionEnable: vi.fn(),
    handleInactiveKickMentionDisable: vi.fn(),
  }),
);
vi.mock(
  "@/features/inactive-kick/commands/inactiveKickSettingsCommand.whitelist",
  () => ({
    handleInactiveKickWhitelistAdd: vi.fn(),
    handleInactiveKickWhitelistRemove: vi.fn(),
    handleInactiveKickWhitelistList: vi.fn(),
  }),
);

import { executeInactiveKickSettingsCommand } from "@/features/inactive-kick/commands/inactiveKickSettingsCommand.execute";

// 廃止プレースホルダー案内の followUp 送信ロジック（モーダル判定）を検証
describe("inactive-kick/inactiveKickSettingsCommand.execute", () => {
  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handleView.mockResolvedValue(undefined);
    mocks.handleSetWeekWarnMessage.mockResolvedValue(undefined);
    mocks.handleSetFinalWarnMessage.mockResolvedValue(undefined);
    mocks.handleSetKickMessage.mockResolvedValue(undefined);
  });

  function createInteraction(
    subcommand: string,
    group: string | null = null,
    overrides: Record<string, unknown> = {},
  ): ChatInputCommandInteraction {
    return {
      guildId: "g1",
      memberPermissions: { has: vi.fn(() => true) },
      options: {
        getSubcommand: vi.fn(() => subcommand),
        getSubcommandGroup: vi.fn(() => group),
      },
      followUp: mocks.followUp.mockResolvedValue(undefined),
      ...overrides,
    } as unknown as ChatInputCommandInteraction;
  }

  const baseSettings = {
    weekWarnMessage: null,
    finalWarnMessage: null,
    kickMessage: null,
  };

  it("廃止プレースホルダーなし + 非モーダルコマンド → followUp が呼ばれない", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue(baseSettings);
    const interaction = createInteraction("view");
    await executeInactiveKickSettingsCommand(interaction);
    expect(mocks.followUp).not.toHaveBeenCalled();
  });

  it("weekWarnMessage に廃止プレースホルダーあり + view（非モーダル）→ followUp が呼ばれる", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      weekWarnMessage: "あと {daysLeft} 日",
    });
    const interaction = createInteraction("view");
    await executeInactiveKickSettingsCommand(interaction);
    expect(mocks.followUp).toHaveBeenCalledTimes(1);
    // ephemeral フラグが付いていること
    const [callArg] = mocks.followUp.mock.calls[0] as [Record<string, unknown>];
    expect(callArg.flags).toBeDefined();
  });

  it("kickMessage に廃止プレースホルダーあり + view（非モーダル）→ followUp が呼ばれる", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      kickMessage: "{markerRole} の方",
    });
    const interaction = createInteraction("view");
    await executeInactiveKickSettingsCommand(interaction);
    expect(mocks.followUp).toHaveBeenCalledTimes(1);
  });

  it("廃止プレースホルダーあり + set-week-warn-message（モーダル）→ followUp が呼ばれない", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      weekWarnMessage: "{daysLeft}",
    });
    const interaction = createInteraction("set-week-warn-message");
    await executeInactiveKickSettingsCommand(interaction);
    expect(mocks.followUp).not.toHaveBeenCalled();
  });

  it("廃止プレースホルダーあり + set-final-warn-message（モーダル）→ followUp が呼ばれない", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      finalWarnMessage: "{daysLeft}",
    });
    const interaction = createInteraction("set-final-warn-message");
    await executeInactiveKickSettingsCommand(interaction);
    expect(mocks.followUp).not.toHaveBeenCalled();
  });

  it("廃止プレースホルダーあり + set-kick-message（モーダル）→ followUp が呼ばれない", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      kickMessage: "{markerRole}",
    });
    const interaction = createInteraction("set-kick-message");
    await executeInactiveKickSettingsCommand(interaction);
    expect(mocks.followUp).not.toHaveBeenCalled();
  });

  it("廃止プレースホルダーあり + whitelist グループ（非モーダル）→ followUp が呼ばれる", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      weekWarnMessage: "{daysLeft}",
    });
    const interaction = createInteraction("list", "whitelist");
    await executeInactiveKickSettingsCommand(interaction);
    expect(mocks.followUp).toHaveBeenCalledTimes(1);
  });
});
