// tests/unit/bot/features/ticket/commands/ticketConfigCommand.execute.test.ts
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { TICKET_CONFIG_COMMAND } from "@/bot/features/ticket/commands/ticketCommand.constants";
import { executeTicketConfigCommand } from "@/bot/features/ticket/commands/ticketConfigCommand.execute";
import { ValidationError } from "@/shared/errors/customErrors";

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

vi.mock("@/bot/features/ticket/commands/usecases/ticketConfigSetup", () => ({
  handleTicketConfigSetup: (...args: unknown[]) => setupMock(...args),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketConfigTeardown", () => ({
  handleTicketConfigTeardown: (...args: unknown[]) => teardownMock(...args),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketConfigView", () => ({
  handleTicketConfigView: (...args: unknown[]) => viewMock(...args),
}));

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketConfigEditPanel",
  () => ({
    handleTicketConfigEditPanel: (...args: unknown[]) => editPanelMock(...args),
  }),
);

vi.mock("@/bot/features/ticket/commands/usecases/ticketConfigSetRoles", () => ({
  handleTicketConfigSetRoles: (...args: unknown[]) => setRolesMock(...args),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketConfigAddRoles", () => ({
  handleTicketConfigAddRoles: (...args: unknown[]) => addRolesMock(...args),
}));

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketConfigRemoveRoles",
  () => ({
    handleTicketConfigRemoveRoles: (...args: unknown[]) =>
      removeRolesMock(...args),
  }),
);

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketConfigSetAutoDelete",
  () => ({
    handleTicketConfigSetAutoDelete: (...args: unknown[]) =>
      setAutoDeleteMock(...args),
  }),
);

vi.mock(
  "@/bot/features/ticket/commands/usecases/ticketConfigSetMaxTickets",
  () => ({
    handleTicketConfigSetMaxTickets: (...args: unknown[]) =>
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

// executeTicketConfigCommand がサブコマンド名に応じて適切なハンドラーへ処理を
// 振り分けるルーティングロジックを検証する
describe("bot/features/ticket/commands/ticketConfigCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ensureManageGuildPermissionMock.mockReturnValue(undefined);
  });

  describe("validation", () => {
    it("guildId が null の場合に handleCommandError が呼ばれること", async () => {
      const interaction = createInteractionMock({ guildId: null });

      await executeTicketConfigCommand(interaction as never);

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

      await executeTicketConfigCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    });

    it("定義外のサブコマンドが渡された場合に handleCommandError が呼ばれること", async () => {
      const interaction = createInteractionMock({ subcommand: "unknown" });

      await executeTicketConfigCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });
  });

  describe("routing", () => {
    it("setup サブコマンドが handleTicketConfigSetup へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.SETUP,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(setupMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("teardown サブコマンドが handleTicketConfigTeardown へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.TEARDOWN,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(teardownMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("view サブコマンドが handleTicketConfigView へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.VIEW,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(viewMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("edit-panel サブコマンドが handleTicketConfigEditPanel へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.EDIT_PANEL,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(editPanelMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-roles サブコマンドが handleTicketConfigSetRoles へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_ROLES,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(setRolesMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("add-roles サブコマンドが handleTicketConfigAddRoles へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.ADD_ROLES,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(addRolesMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("remove-roles サブコマンドが handleTicketConfigRemoveRoles へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.REMOVE_ROLES,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(removeRolesMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-auto-delete サブコマンドが handleTicketConfigSetAutoDelete へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_AUTO_DELETE,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(setAutoDeleteMock).toHaveBeenCalledWith(interaction, "guild-1");
    });

    it("set-max-tickets サブコマンドが handleTicketConfigSetMaxTickets へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_MAX_TICKETS,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(setMaxTicketsMock).toHaveBeenCalledWith(interaction, "guild-1");
    });
  });

  describe("error propagation", () => {
    it("ユースケースが例外を投げた場合に handleCommandError へ委譲されること", async () => {
      const error = new Error("usecase error");
      viewMock.mockRejectedValue(error);
      const interaction = createInteractionMock({
        subcommand: TICKET_CONFIG_COMMAND.SUBCOMMAND.VIEW,
      });

      await executeTicketConfigCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    });
  });
});
