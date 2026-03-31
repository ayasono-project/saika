// tests/unit/bot/features/member-log/commands/memberLogConfigCommand.execute.test.ts
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { MEMBER_LOG_CONFIG_COMMAND } from "@/bot/features/member-log/commands/memberLogConfigCommand.constants";
import { executeMemberLogConfigCommand } from "@/bot/features/member-log/commands/memberLogConfigCommand.execute";
import { ValidationError } from "@/shared/errors/customErrors";

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
  "@/bot/features/member-log/commands/memberLogConfigCommand.setChannel",
  () => ({
    handleMemberLogConfigSetChannel: (...args: unknown[]) =>
      setChannelMock(...args),
  }),
);

vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.enable",
  () => ({
    handleMemberLogConfigEnable: (...args: unknown[]) => enableMock(...args),
  }),
);

vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.disable",
  () => ({
    handleMemberLogConfigDisable: (...args: unknown[]) => disableMock(...args),
  }),
);

vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.setJoinMessage",
  () => ({
    handleMemberLogConfigSetJoinMessage: (...args: unknown[]) =>
      setJoinMessageMock(...args),
  }),
);

vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.setLeaveMessage",
  () => ({
    handleMemberLogConfigSetLeaveMessage: (...args: unknown[]) =>
      setLeaveMessageMock(...args),
  }),
);

vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.view",
  () => ({
    handleMemberLogConfigView: (...args: unknown[]) => viewMock(...args),
  }),
);

const clearJoinMessageMock = vi.fn();
vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.clearJoinMessage",
  () => ({
    handleMemberLogConfigClearJoinMessage: (...args: unknown[]) =>
      clearJoinMessageMock(...args),
  }),
);

const clearLeaveMessageMock = vi.fn();
vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.clearLeaveMessage",
  () => ({
    handleMemberLogConfigClearLeaveMessage: (...args: unknown[]) =>
      clearLeaveMessageMock(...args),
  }),
);

const resetMock = vi.fn();
vi.mock(
  "@/bot/features/member-log/commands/memberLogConfigCommand.reset",
  () => ({
    handleMemberLogConfigReset: (...args: unknown[]) => resetMock(...args),
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
        () => overrides.subcommand ?? MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.VIEW,
      ),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// executeMemberLogConfigCommand のルーティング・バリデーション・エラー委譲を検証
describe("bot/features/member-log/commands/memberLogConfigCommand.execute", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Guild 外実行・不明サブコマンドの検証分岐を確認
  describe("validation", () => {
    it("guildId が null の場合に ValidationError が handleCommandError へ伝わることを確認", async () => {
      const interaction = makeInteraction({ guildId: null });

      await executeMemberLogConfigCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });

    it("未定義のサブコマンドを受け取った場合に ValidationError が handleCommandError へ伝わることを確認", async () => {
      const interaction = makeInteraction({ subcommand: "unknown-sub" });

      await executeMemberLogConfigCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });
  });

  // 各サブコマンドが対応するハンドラへ委譲されることを確認
  describe("routing", () => {
    it("set-channel サブコマンドが handleMemberLogConfigSetChannel へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_CHANNEL,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(setChannelMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("enable サブコマンドが handleMemberLogConfigEnable へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.ENABLE,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(enableMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("disable サブコマンドが handleMemberLogConfigDisable へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.DISABLE,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(disableMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-join-message サブコマンドが handleMemberLogConfigSetJoinMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_JOIN_MESSAGE,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(setJoinMessageMock).toHaveBeenCalledWith(interaction);
    });

    it("set-leave-message サブコマンドが handleMemberLogConfigSetLeaveMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_LEAVE_MESSAGE,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(setLeaveMessageMock).toHaveBeenCalledWith(interaction);
    });

    it("view サブコマンドが handleMemberLogConfigView へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.VIEW,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(viewMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("clear-join-message サブコマンドが handleMemberLogConfigClearJoinMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.CLEAR_JOIN_MESSAGE,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(clearJoinMessageMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("clear-leave-message サブコマンドが handleMemberLogConfigClearLeaveMessage へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.CLEAR_LEAVE_MESSAGE,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(clearLeaveMessageMock).toHaveBeenCalledWith(
        interaction,
        "guild-1",
      );
    });

    it("reset サブコマンドが handleMemberLogConfigReset へ委譲されることを確認", async () => {
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.RESET,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(resetMock).toHaveBeenCalledWith(interaction, "guild-1");
    });
  });

  // サブハンドラが例外を投げた場合も handleCommandError へ委譲されることを確認
  describe("error propagation", () => {
    it("サブハンドラが例外を投げた場合に handleCommandError が呼ばれることを確認", async () => {
      const error = new Error("sub-handler error");
      enableMock.mockRejectedValue(error);
      const interaction = makeInteraction({
        subcommand: MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.ENABLE,
      });

      await executeMemberLogConfigCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    });
  });
});
