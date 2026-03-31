// tests/unit/bot/commands/afk.test.ts

const executeAfkCommandMock = vi.fn();
const handleCommandErrorMock = vi.fn();

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
}));

vi.mock("@/bot/features/afk/commands/afkCommand.execute", () => ({
  executeAfkCommand: (...args: unknown[]) => executeAfkCommandMock(...args),
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

import { afkCommand } from "@/bot/commands/afk";

// afkCommand ラッパーの execute 委譲とエラーハンドリングを検証
describe("bot/commands/afk", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("execute が executeAfkCommand へ委譲すること", async () => {
    executeAfkCommandMock.mockResolvedValue(undefined);
    const interaction = { id: "test" };

    await afkCommand.execute(interaction as never);

    expect(executeAfkCommandMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("executeAfkCommand が例外を投げた場合に handleCommandError へ委譲すること", async () => {
    const error = new Error("test error");
    executeAfkCommandMock.mockRejectedValue(error);
    const interaction = { id: "test" };

    await afkCommand.execute(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, error);
  });

  it("コマンド名が afk であること", () => {
    expect(afkCommand.data.name).toBe("afk");
  });
});
