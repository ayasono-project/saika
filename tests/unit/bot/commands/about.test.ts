// tests/unit/bot/commands/about.test.ts

const executeAboutCommandMock = vi.fn();
const handleCommandErrorMock = vi.fn();

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    base: "desc",
    localizations: { "en-US": "desc" },
  }),
}));

vi.mock("@/features/about/commands/aboutCommand.execute", () => ({
  executeAboutCommand: (...args: unknown[]) => executeAboutCommandMock(...args),
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

import { aboutCommand } from "@/bot/commands/about";

// aboutCommand ラッパーのエラーハンドリング委譲を検証
describe("bot/commands/about", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("execute が executeAboutCommand へ委譲すること", async () => {
    executeAboutCommandMock.mockResolvedValue(undefined);
    const interaction = { id: "test" };

    await aboutCommand.execute(interaction as never);

    expect(executeAboutCommandMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("executeAboutCommand が例外を投げた場合に handleCommandError へ委譲すること", async () => {
    const error = new Error("about error");
    executeAboutCommandMock.mockRejectedValue(error);
    const interaction = { id: "test" };

    await aboutCommand.execute(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, error);
  });
});
