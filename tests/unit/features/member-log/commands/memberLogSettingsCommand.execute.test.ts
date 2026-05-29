// tests/unit/bot/features/member-log/commands/memberLogSettingsCommand.execute.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { MEMBER_LOG_SETTINGS_COMMAND } from "@/features/member-log/commands/memberLogSettingsCommand.constants";
import { executeMemberLogSettingsCommand } from "@/features/member-log/commands/memberLogSettingsCommand.execute";

// ---- モック定義 ----
const setChannelMock = vi.fn();
const enableMock = vi.fn();
const disableMock = vi.fn();
const setJoinMessageMock = vi.fn();
const setLeaveMessageMock = vi.fn();
const viewMock = vi.fn();

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
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
}));

vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.setChannel",
  () => ({
    handleMemberLogSettingsSetChannel: (...args: unknown[]) =>
      setChannelMock(...args),
  }),
);

vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.enable",
  () => ({
    handleMemberLogSettingsEnable: (...args: unknown[]) => enableMock(...args),
  }),
);

vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.disable",
  () => ({
    handleMemberLogSettingsDisable: (...args: unknown[]) =>
      disableMock(...args),
  }),
);

vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.setJoinMessage",
  () => ({
    handleMemberLogSettingsSetJoinMessage: (...args: unknown[]) =>
      setJoinMessageMock(...args),
  }),
);

vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.setLeaveMessage",
  () => ({
    handleMemberLogSettingsSetLeaveMessage: (...args: unknown[]) =>
      setLeaveMessageMock(...args),
  }),
);

vi.mock("@/features/member-log/commands/memberLogSettingsCommand.view", () => ({
  handleMemberLogSettingsView: (...args: unknown[]) => viewMock(...args),
}));

const clearJoinMessageMock = vi.fn();
vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.clearJoinMessage",
  () => ({
    handleMemberLogSettingsClearJoinMessage: (...args: unknown[]) =>
      clearJoinMessageMock(...args),
  }),
);

const clearLeaveMessageMock = vi.fn();
vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.clearLeaveMessage",
  () => ({
    handleMemberLogSettingsClearLeaveMessage: (...args: unknown[]) =>
      clearLeaveMessageMock(...args),
  }),
);

const resetMock = vi.fn();
vi.mock(
  "@/features/member-log/commands/memberLogSettingsCommand.reset",
  () => ({
    handleMemberLogSettingsReset: (...args: unknown[]) => resetMock(...args),
  }),
);

vi.mock("@/bot/shared/permissionGuards", () => ({
  ensureManageGuildPermission: vi.fn(),
}));

// ---- ヘルパー ----

/** テスト用 interaction モックを生成する */
function makeInteraction(
  overrides: { guildId?: string | null; subcommand?: string } = {},
) {
  return {
    guildId: overrides.guildId !== undefined ? overrides.guildId : "guild-1",
    locale: "ja",
    memberPermissions: { has: vi.fn(() => true) },
    options: {
      getSubcommand: vi.fn(
        () =>
          overrides.subcommand ?? MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
      ),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// executeMemberLogSettingsCommand のルーティング・バリデーション・エラー委譲を検証
describe("bot/features/member-log/commands/memberLogSettingsCommand.execute", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Guild 外実行・不明サブコマンドの検証分岐を確認
  describe("validation", () => {
    it("guildId が null の場合に ValidationError が handleCommandError へ伝わることを確認", async () => {
      const interaction = makeInteraction({ guildId: null });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });

    it("未定義のサブコマンドを受け取った場合に ValidationError が handleCommandError へ伝わることを確認", async () => {
      const interaction = makeInteraction({ subcommand: "unknown-sub" });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });
  });

  // 各サブコマンドが対応するハンドラへ委譲されることを確認
  describe("routing", () => {
    it("set-channel サブコマンドが handleMemberLogSettingsSetChannel へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_CHANNEL,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(setChannelMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("enable サブコマンドが handleMemberLogSettingsEnable へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.ENABLE,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(enableMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("disable サブコマンドが handleMemberLogSettingsDisable へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.DISABLE,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(disableMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-join-message サブコマンドが handleMemberLogSettingsSetJoinMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_JOIN_MESSAGE,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(setJoinMessageMock).toHaveBeenCalledWith(interaction);
    });

    it("set-leave-message サブコマンドが handleMemberLogSettingsSetLeaveMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_LEAVE_MESSAGE,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(setLeaveMessageMock).toHaveBeenCalledWith(interaction);
    });

    it("view サブコマンドが handleMemberLogSettingsView へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(viewMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("clear-join-message サブコマンドが handleMemberLogSettingsClearJoinMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_JOIN_MESSAGE,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(clearJoinMessageMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("clear-leave-message サブコマンドが handleMemberLogSettingsClearLeaveMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_LEAVE_MESSAGE,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(clearLeaveMessageMock).toHaveBeenCalledWith(
        interaction,
        "guild-1",
      );
    });

    it("reset サブコマンドが handleMemberLogSettingsReset へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.RESET,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(resetMock).toHaveBeenCalledWith(interaction, "guild-1");
    });
  });

  // サブハンドラが例外を投げた場合も handleCommandError へ委譲されることを確認
  describe("error propagation", () => {
    it("サブハンドラが例外を投げた場合に handleCommandError が呼ばれることを確認", async () => {
      const error = new Error("sub-handler error");
      enableMock.mockRejectedValue(error);
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.ENABLE,
      });

      await executeMemberLogSettingsCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    });
  });
});
