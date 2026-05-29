// tests/unit/bot/features/bump-reminder/commands/bumpReminderSettingsCommand.execute.test.ts
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { BUMP_REMINDER_SETTINGS_COMMAND } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.constants";
import { executeBumpReminderSettingsCommand } from "@/features/bump-reminder/commands/bumpReminderSettingsCommand.execute";

const ensureManageGuildPermissionMock = vi.fn();
const enableMock = vi.fn();
const disableMock = vi.fn();
const setMentionMock = vi.fn();
const removeMentionMock = vi.fn();
const removeUsersMock = vi.fn();
const resetMock = vi.fn();
const showMock = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tDefault: vi.fn((key: string) => `default:${key}`),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
}));

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.guard",
  () => ({
    ensureManageGuildPermission: (...args: unknown[]) =>
      ensureManageGuildPermissionMock(...args),
  }),
);

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.enable",
  () => ({
    handleBumpReminderSettingsEnable: (...args: unknown[]) =>
      enableMock(...args),
  }),
);

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.disable",
  () => ({
    handleBumpReminderSettingsDisable: (...args: unknown[]) =>
      disableMock(...args),
  }),
);

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.setMention",
  () => ({
    handleBumpReminderSettingsSetMention: (...args: unknown[]) =>
      setMentionMock(...args),
  }),
);

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.removeMention",
  () => ({
    handleBumpReminderSettingsRemoveMention: (...args: unknown[]) =>
      removeMentionMock(...args),
  }),
);

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.removeUsers",
  () => ({
    handleBumpReminderSettingsRemoveUsers: (...args: unknown[]) =>
      removeUsersMock(...args),
  }),
);

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.reset",
  () => ({
    handleBumpReminderSettingsReset: (...args: unknown[]) => resetMock(...args),
  }),
);

vi.mock(
  "@/features/bump-reminder/commands/bumpReminderSettingsCommand.view",
  () => ({
    handleBumpReminderSettingsView: (...args: unknown[]) => showMock(...args),
  }),
);

function createInteraction(subcommand: string) {
  return {
    guildId: "guild-1",
    options: {
      getSubcommand: vi.fn(() => subcommand),
    },
  };
}

// executeBumpReminderSettingsCommand がサブコマンド名に応じて適切なハンドラーへ処理を
// 振り分けるルーティングロジックを検証する
describe("bot/features/bump-reminder/commands/bumpReminderSettingsCommand.execute", () => {
  // 権限チェックがデフォルトで通過するよう設定し、ルーティング以外の要因でテストが失敗しないようにする
  beforeEach(() => {
    vi.clearAllMocks();
    ensureManageGuildPermissionMock.mockResolvedValue(undefined);
  });

  it("enable サブコマンドを対応するハンドラーへルーティングする", async () => {
    const interaction = createInteraction(
      BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.ENABLE,
    );

    await executeBumpReminderSettingsCommand(interaction as never);

    expect(enableMock).toHaveBeenCalledWith(interaction, "guild-1");
  });

  it("view サブコマンドを対応するハンドラーへルーティングする", async () => {
    const interaction = createInteraction(
      BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
    );

    await executeBumpReminderSettingsCommand(interaction as never);

    expect(showMock).toHaveBeenCalledWith(interaction, "guild-1");
  });

  it("remove-mention-users サブコマンドを対応するハンドラーへルーティングする", async () => {
    const interaction = createInteraction(
      BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_MENTION_USERS,
    );

    await executeBumpReminderSettingsCommand(interaction as never);

    expect(removeUsersMock).toHaveBeenCalledWith(interaction, "guild-1");
  });

  it("reset サブコマンドを対応するハンドラーへルーティングする", async () => {
    const interaction = createInteraction(
      BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.RESET,
    );

    await executeBumpReminderSettingsCommand(interaction as never);

    expect(resetMock).toHaveBeenCalledWith(interaction, "guild-1");
  });

  it("guildId が null の場合に handleCommandError へ委譲されること", async () => {
    const interaction = {
      guildId: null,
      options: { getSubcommand: vi.fn(() => "enable") },
    };

    await executeBumpReminderSettingsCommand(interaction as never);

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("未定義のサブコマンドが渡された場合は handleCommandError に委譲し、サイレントに無視しないことを保証", async () => {
    const interaction = createInteraction("unknown");

    await executeBumpReminderSettingsCommand(interaction as never);

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });
});
