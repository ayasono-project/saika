// tests/unit/bot/features/reaction-role/commands/reactionRoleSettingsCommand.execute.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { REACTION_ROLE_SETTINGS_COMMAND } from "@/bot/features/reaction-role/commands/reactionRoleCommand.constants";
import { executeReactionRoleSettingsCommand } from "@/bot/features/reaction-role/commands/reactionRoleSettingsCommand.execute";

const ensureManageGuildPermissionMock = vi.fn();
const setupMock = vi.fn();
const teardownMock = vi.fn();
const viewMock = vi.fn();
const editPanelMock = vi.fn();
const addButtonMock = vi.fn();
const removeButtonMock = vi.fn();
const editButtonMock = vi.fn();

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

vi.mock("@/bot/shared/permissionGuards", () => ({
  ensureManageGuildPermission: (...args: unknown[]) =>
    ensureManageGuildPermissionMock(...args),
}));

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleSettingsSetup",
  () => ({
    handleReactionRoleSettingsSetup: (...args: unknown[]) => setupMock(...args),
  }),
);

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleSettingsTeardown",
  () => ({
    handleReactionRoleSettingsTeardown: (...args: unknown[]) =>
      teardownMock(...args),
  }),
);

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleSettingsView",
  () => ({
    handleReactionRoleSettingsView: (...args: unknown[]) => viewMock(...args),
  }),
);

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleSettingsEditPanel",
  () => ({
    handleReactionRoleSettingsEditPanel: (...args: unknown[]) =>
      editPanelMock(...args),
  }),
);

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleSettingsAddButton",
  () => ({
    handleReactionRoleSettingsAddButton: (...args: unknown[]) =>
      addButtonMock(...args),
  }),
);

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleSettingsRemoveButton",
  () => ({
    handleReactionRoleSettingsRemoveButton: (...args: unknown[]) =>
      removeButtonMock(...args),
  }),
);

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleSettingsEditButton",
  () => ({
    handleReactionRoleSettingsEditButton: (...args: unknown[]) =>
      editButtonMock(...args),
  }),
);

function createInteractionMock({
  guildId = "guild-1",
  subcommand = "setup",
}: {
  guildId?: string | null;
  subcommand?: string;
} = {}) {
  return {
    guildId,
    locale: "ja",
    memberPermissions: { has: vi.fn(() => true) },
    options: {
      getSubcommand: vi.fn(() => subcommand),
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

// executeReactionRoleSettingsCommand がサブコマンド名に応じて適切なハンドラーへ処理を
// 振り分けるルーティングロジックを検証する
describe("bot/features/reaction-role/commands/reactionRoleSettingsCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureManageGuildPermissionMock.mockReturnValue(undefined);
  });

  describe("validation", () => {
    it("guildId が null の場合に ValidationError がスローされること", async () => {
      const interaction = createInteractionMock({ guildId: null });

      await expect(
        executeReactionRoleSettingsCommand(interaction as never),
      ).rejects.toThrow(ValidationError);
    });

    it("ManageGuild 権限がない場合にエラーがスローされること", async () => {
      const error = new ValidationError("権限不足");
      ensureManageGuildPermissionMock.mockImplementation(() => {
        throw error;
      });
      const interaction = createInteractionMock();

      await expect(
        executeReactionRoleSettingsCommand(interaction as never),
      ).rejects.toThrow(error);
    });

    it("定義外のサブコマンドが渡された場合に ValidationError がスローされること", async () => {
      const interaction = createInteractionMock({ subcommand: "unknown" });

      await expect(
        executeReactionRoleSettingsCommand(interaction as never),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("routing", () => {
    it("setup サブコマンドが handleReactionRoleSettingsSetup へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.SETUP,
      });

      await executeReactionRoleSettingsCommand(interaction as never);

      expect(setupMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("teardown サブコマンドが handleReactionRoleSettingsTeardown へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN,
      });

      await executeReactionRoleSettingsCommand(interaction as never);

      expect(teardownMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("view サブコマンドが handleReactionRoleSettingsView へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
      });

      await executeReactionRoleSettingsCommand(interaction as never);

      expect(viewMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("edit-panel サブコマンドが handleReactionRoleSettingsEditPanel へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.EDIT_PANEL,
      });

      await executeReactionRoleSettingsCommand(interaction as never);

      expect(editPanelMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("add-button サブコマンドが handleReactionRoleSettingsAddButton へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.ADD_BUTTON,
      });

      await executeReactionRoleSettingsCommand(interaction as never);

      expect(addButtonMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("remove-button サブコマンドが handleReactionRoleSettingsRemoveButton へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_BUTTON,
      });

      await executeReactionRoleSettingsCommand(interaction as never);

      expect(removeButtonMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("edit-button サブコマンドが handleReactionRoleSettingsEditButton へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.EDIT_BUTTON,
      });

      await executeReactionRoleSettingsCommand(interaction as never);

      expect(editButtonMock).toHaveBeenCalledWith(interaction, "guild-1");
    });
  });

  describe("error propagation", () => {
    it("ユースケースが例外を投げた場合にエラーが伝播すること", async () => {
      const error = new Error("usecase error");
      viewMock.mockRejectedValue(error);
      const interaction = createInteractionMock({
        subcommand: REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
      });

      await expect(
        executeReactionRoleSettingsCommand(interaction as never),
      ).rejects.toThrow(error);
    });
  });
});
