// tests/unit/bot/features/ticket/commands/ticketSettingsCommand.execute.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { TICKET_SETTINGS_COMMAND } from "@/bot/features/ticket/commands/ticketCommand.constants";
import { executeTicketSettingsCommand } from "@/bot/features/ticket/commands/ticketSettingsCommand.execute";

const ensureManageGuildPermissionMock = vi.fn();
const setupMock = vi.fn();
const teardownMock = vi.fn();
const viewMock = vi.fn();
const editPanelMock = vi.fn();
const setRolesMock = vi.fn();
const addRolesMock = vi.fn();
const removeRolesMock = vi.fn();
const setAutoDeleteMock = vi.fn();
const setMaxTicketsMock = vi.fn();

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

vi.mock("@/bot/shared/permissionGuards", () => ({
  ensureManageGuildPermission: (...args: unknown[]) =>
    ensureManageGuildPermissionMock(...args),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketSettingsSetup", () => ({
  handleTicketSettingsSetup: (...args: unknown[]) => setupMock(...args),
}));

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketSettingsTeardown",
  () => ({
    handleTicketSettingsTeardown: (...args: unknown[]) => teardownMock(...args),
  }),
);

vi.mock("@/bot/features/ticket/commands/usecases/ticketSettingsView", () => ({
  handleTicketSettingsView: (...args: unknown[]) => viewMock(...args),
}));

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketSettingsEditPanel",
  () => ({
    handleTicketSettingsEditPanel: (...args: unknown[]) =>
      editPanelMock(...args),
  }),
);

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketSettingsSetRoles",
  () => ({
    handleTicketSettingsSetRoles: (...args: unknown[]) => setRolesMock(...args),
  }),
);

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketSettingsAddRoles",
  () => ({
    handleTicketSettingsAddRoles: (...args: unknown[]) => addRolesMock(...args),
  }),
);

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketSettingsRemoveRoles",
  () => ({
    handleTicketSettingsRemoveRoles: (...args: unknown[]) =>
      removeRolesMock(...args),
  }),
);

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketSettingsSetAutoDelete",
  () => ({
    handleTicketSettingsSetAutoDelete: (...args: unknown[]) =>
      setAutoDeleteMock(...args),
  }),
);

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketSettingsSetMaxTickets",
  () => ({
    handleTicketSettingsSetMaxTickets: (...args: unknown[]) =>
      setMaxTicketsMock(...args),
  }),
);

function createInteractionMock({
  guildId = "guild-1",
  subcommand = "view",
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

// executeTicketSettingsCommand がサブコマンド名に応じて適切なハンドラーへ処理を
// 振り分けるルーティングロジックを検証する
describe("bot/features/ticket/commands/ticketSettingsCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureManageGuildPermissionMock.mockReturnValue(undefined);
  });

  describe("validation", () => {
    it("guildId が null の場合に handleCommandError が呼ばれること", async () => {
      const interaction = createInteractionMock({ guildId: null });

      await executeTicketSettingsCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });

    it("ManageGuild 権限がない場合に handleCommandError が呼ばれること", async () => {
      const error = new ValidationError("権限不足");
      ensureManageGuildPermissionMock.mockImplementation(() => {
        throw error;
      });
      const interaction = createInteractionMock();

      await executeTicketSettingsCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    });

    it("定義外のサブコマンドが渡された場合に handleCommandError が呼ばれること", async () => {
      const interaction = createInteractionMock({ subcommand: "unknown" });

      await executeTicketSettingsCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });
  });

  describe("routing", () => {
    it("setup サブコマンドが handleTicketSettingsSetup へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.SETUP,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(setupMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("teardown サブコマンドが handleTicketSettingsTeardown へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(teardownMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("view サブコマンドが handleTicketSettingsView へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(viewMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("edit-panel サブコマンドが handleTicketSettingsEditPanel へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.EDIT_PANEL,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(editPanelMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-roles サブコマンドが handleTicketSettingsSetRoles へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_ROLES,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(setRolesMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("add-roles サブコマンドが handleTicketSettingsAddRoles へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.ADD_ROLES,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(addRolesMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("remove-roles サブコマンドが handleTicketSettingsRemoveRoles へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_ROLES,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(removeRolesMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-auto-delete サブコマンドが handleTicketSettingsSetAutoDelete へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_AUTO_DELETE,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(setAutoDeleteMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-max-tickets サブコマンドが handleTicketSettingsSetMaxTickets へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_MAX_TICKETS,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(setMaxTicketsMock).toHaveBeenCalledWith(interaction, "guild-1");
    });
  });

  describe("error propagation", () => {
    it("ユースケースが例外を投げた場合に handleCommandError へ委譲されること", async () => {
      const error = new Error("usecase error");
      viewMock.mockRejectedValue(error);
      const interaction = createInteractionMock({
        subcommand: TICKET_SETTINGS_COMMAND.SUBCOMMAND.VIEW,
      });

      await executeTicketSettingsCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    });
  });
});
