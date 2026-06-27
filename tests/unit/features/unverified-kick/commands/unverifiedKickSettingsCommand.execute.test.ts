// tests/unit/features/unverified-kick/commands/unverifiedKickSettingsCommand.execute.test.ts

import type { ChatInputCommandInteraction } from "discord.js";

const mocks = vi.hoisted(() => ({
  getSettingsOrDefault: vi.fn(),
  followUp: vi.fn(),
  handleView: vi.fn(),
  handleSetDmMessage: vi.fn(),
  handleSetNotifyMessage: vi.fn(),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotUnverifiedKickSettingsService: () => ({
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
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.view",
  () => ({
    handleUnverifiedKickView: (...args: unknown[]) => mocks.handleView(...args),
  }),
);
vi.mock(
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.dmMessage",
  () => ({
    handleUnverifiedKickSetDmMessage: (...args: unknown[]) =>
      mocks.handleSetDmMessage(...args),
    handleUnverifiedKickSetNotifyMessage: (...args: unknown[]) =>
      mocks.handleSetNotifyMessage(...args),
    handleUnverifiedKickClearDmMessage: vi.fn(),
    handleUnverifiedKickClearNotifyMessage: vi.fn(),
  }),
);
vi.mock(
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.simple",
  () => ({
    handleUnverifiedKickSetVerifiedRole: vi.fn(),
    handleUnverifiedKickSetGraceDays: vi.fn(),
    handleUnverifiedKickSetWarnDays: vi.fn(),
    handleUnverifiedKickClearWarnDays: vi.fn(),
    handleUnverifiedKickSetNotifyChannel: vi.fn(),
    handleUnverifiedKickClearNotifyChannel: vi.fn(),
    handleUnverifiedKickSetLogChannel: vi.fn(),
    handleUnverifiedKickClearLogChannel: vi.fn(),
    handleUnverifiedKickEnable: vi.fn(),
    handleUnverifiedKickDisable: vi.fn(),
  }),
);
vi.mock(
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.markerRole",
  () => ({
    handleUnverifiedKickSetMarkerRole: vi.fn(),
    handleUnverifiedKickClearMarkerRole: vi.fn(),
  }),
);
vi.mock(
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.exempt",
  () => ({
    handleUnverifiedKickExemptAdd: vi.fn(),
    handleUnverifiedKickExemptRemove: vi.fn(),
    handleUnverifiedKickExemptList: vi.fn(),
  }),
);
vi.mock(
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.preview",
  () => ({ handleUnverifiedKickPreview: vi.fn() }),
);
vi.mock(
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.reset",
  () => ({ handleUnverifiedKickReset: vi.fn() }),
);
vi.mock(
  "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.schedule",
  () => ({
    handleUnverifiedKickSetTimezone: vi.fn(),
    handleUnverifiedKickSetRunHour: vi.fn(),
    handleUnverifiedKickMentionEnable: vi.fn(),
    handleUnverifiedKickMentionDisable: vi.fn(),
  }),
);

import { executeUnverifiedKickSettingsCommand } from "@/features/unverified-kick/commands/unverifiedKickSettingsCommand.execute";

// 廃止プレースホルダー案内の followUp 送信ロジック（モーダル判定）を検証
describe("unverified-kick/unverifiedKickSettingsCommand.execute", () => {
  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handleView.mockResolvedValue(undefined);
    mocks.handleSetDmMessage.mockResolvedValue(undefined);
    mocks.handleSetNotifyMessage.mockResolvedValue(undefined);
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
    notifyTemplate: null,
    dmTemplate: null,
  };

  it("廃止プレースホルダーなし + 非モーダルコマンド → followUp が呼ばれない", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue(baseSettings);
    const interaction = createInteraction("view");
    await executeUnverifiedKickSettingsCommand(interaction);
    expect(mocks.followUp).not.toHaveBeenCalled();
  });

  it("notifyTemplate に廃止プレースホルダーあり + view（非モーダル）→ followUp が呼ばれる", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      notifyTemplate: "{markerRole} の方へ",
    });
    const interaction = createInteraction("view");
    await executeUnverifiedKickSettingsCommand(interaction);
    expect(mocks.followUp).toHaveBeenCalledTimes(1);
    // ephemeral フラグが付いていること
    const [callArg] = mocks.followUp.mock.calls[0] as [Record<string, unknown>];
    expect(callArg.flags).toBeDefined();
  });

  it("dmTemplate に廃止プレースホルダーあり + view（非モーダル）→ followUp が呼ばれる", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      dmTemplate: "対象: {markerRole}",
    });
    const interaction = createInteraction("view");
    await executeUnverifiedKickSettingsCommand(interaction);
    expect(mocks.followUp).toHaveBeenCalledTimes(1);
  });

  it("廃止プレースホルダーあり + set-dm-message（モーダル）→ followUp が呼ばれない", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      dmTemplate: "{markerRole}",
    });
    const interaction = createInteraction("set-dm-message");
    await executeUnverifiedKickSettingsCommand(interaction);
    expect(mocks.followUp).not.toHaveBeenCalled();
  });

  it("廃止プレースホルダーあり + set-notify-message（モーダル）→ followUp が呼ばれない", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      notifyTemplate: "{markerRole}",
    });
    const interaction = createInteraction("set-notify-message");
    await executeUnverifiedKickSettingsCommand(interaction);
    expect(mocks.followUp).not.toHaveBeenCalled();
  });

  it("廃止プレースホルダーあり + exempt グループ（非モーダル）→ followUp が呼ばれる", async () => {
    mocks.getSettingsOrDefault.mockResolvedValue({
      ...baseSettings,
      notifyTemplate: "{markerRole}",
    });
    const interaction = createInteraction("list", "exempt");
    await executeUnverifiedKickSettingsCommand(interaction);
    expect(mocks.followUp).toHaveBeenCalledTimes(1);
  });
});
