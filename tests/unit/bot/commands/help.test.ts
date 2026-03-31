// tests/unit/bot/commands/help.test.ts

const executeHelpCommandMock = vi.fn();
const handleCommandErrorMock = vi.fn();

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
}));

vi.mock("@/bot/features/help/commands/helpCommand.execute", () => ({
  executeHelpCommand: (...args: unknown[]) => executeHelpCommandMock(...args),
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

import { helpCommand } from "@/bot/commands/help";

// helpCommand ラッパーのエラーハンドリング委譲を検証
describe("bot/commands/help", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("execute が executeHelpCommand へ委譲すること", async () => {
    executeHelpCommandMock.mockResolvedValue(undefined);
    const interaction = { id: "test" };

    await helpCommand.execute(interaction as never);

    expect(executeHelpCommandMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("executeHelpCommand が例外を投げた場合に handleCommandError へ委譲すること", async () => {
    const error = new Error("help error");
    executeHelpCommandMock.mockRejectedValue(error);
    const interaction = { id: "test" };

    await helpCommand.execute(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, error);
  });
});
