// tests/unit/bot/features/ticket/commands/ticketCommand.execute.test.ts
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";
import { TICKET_COMMAND } from "@/bot/features/ticket/commands/ticketCommand.constants";
import { executeTicketCommand } from "@/bot/features/ticket/commands/ticketCommand.execute";
import { ValidationError } from "@/shared/errors/customErrors";

const handleTicketCloseMock = vi.fn();
const handleTicketOpenMock = vi.fn();
const handleTicketDeleteMock = vi.fn();

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

vi.mock("@/bot/features/ticket/commands/usecases/ticketClose", () => ({
  handleTicketClose: (...args: unknown[]) => handleTicketCloseMock(...args),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketOpen", () => ({
  handleTicketOpen: (...args: unknown[]) => handleTicketOpenMock(...args),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketDelete", () => ({
  handleTicketDelete: (...args: unknown[]) => handleTicketDeleteMock(...args),
}));

function createInteractionMock({
  guildId = "guild-1",
  subcommand = "close",
}: {
  guildId?: string | null;
  subcommand?: string;
} = {}) {
  return {
    guildId,
    locale: "ja",
    options: {
      getSubcommand: vi.fn(() => subcommand),
    },
  };
}

// executeTicketCommand がサブコマンド名に応じて適切なハンドラーへ処理を
// 振り分けるルーティングロジックを検証する
describe("bot/features/ticket/commands/ticketCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validation", () => {
    it("guildId が null の場合に handleCommandError が呼ばれること", async () => {
      const interaction = createInteractionMock({ guildId: null });

      await executeTicketCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });

    it("定義外のサブコマンドが渡された場合に handleCommandError が呼ばれること", async () => {
      const interaction = createInteractionMock({ subcommand: "unknown" });

      await executeTicketCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(
        interaction,
        expect.any(ValidationError),
      );
    });
  });

  describe("routing", () => {
    it("close サブコマンドが handleTicketClose へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_COMMAND.SUBCOMMAND.CLOSE,
      });

      await executeTicketCommand(interaction as never);

      expect(handleTicketCloseMock).toHaveBeenCalledWith(interaction);
    });

    it("open サブコマンドが handleTicketOpen へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_COMMAND.SUBCOMMAND.OPEN,
      });

      await executeTicketCommand(interaction as never);

      expect(handleTicketOpenMock).toHaveBeenCalledWith(interaction);
    });

    it("delete サブコマンドが handleTicketDelete へ委譲されること", async () => {
      const interaction = createInteractionMock({
        subcommand: TICKET_COMMAND.SUBCOMMAND.DELETE,
      });

      await executeTicketCommand(interaction as never);

      expect(handleTicketDeleteMock).toHaveBeenCalledWith(interaction);
    });
  });

  describe("error propagation", () => {
    it("ユースケースが例外を投げた場合に handleCommandError へ委譲されること", async () => {
      const error = new Error("usecase error");
      handleTicketCloseMock.mockRejectedValue(error);
      const interaction = createInteractionMock({
        subcommand: TICKET_COMMAND.SUBCOMMAND.CLOSE,
      });

      await executeTicketCommand(interaction as never);

      expect(handleCommandError).toHaveBeenCalledWith(interaction, error);
    });
  });
});
