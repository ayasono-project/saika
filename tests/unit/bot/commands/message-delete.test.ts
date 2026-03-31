// tests/unit/bot/commands/message-delete.test.ts

const executeMessageDeleteCommandMock = vi.fn();
const handleCommandErrorMock = vi.fn();

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
}));

vi.mock(
  "@/bot/features/message-delete/commands/messageDeleteCommand.execute",
  () => ({
    executeMessageDeleteCommand: (...args: unknown[]) =>
      executeMessageDeleteCommandMock(...args),
  }),
);

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

vi.mock(
  "@/bot/features/message-delete/commands/messageDeleteCommand.constants",
  () => ({
    MSG_DEL_COMMAND: {
      NAME: "message-delete",
      OPTION: {
        COUNT: "count",
        USER: "user",
        KEYWORD: "keyword",
        AFTER: "after",
        BEFORE: "before",
      },
    },
  }),
);

import { messageDeleteCommand } from "@/bot/commands/message-delete";

// messageDeleteCommand ラッパーのエラーハンドリング委譲を検証
describe("bot/commands/message-delete", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("execute が executeMessageDeleteCommand へ委譲すること", async () => {
    executeMessageDeleteCommandMock.mockResolvedValue(undefined);
    const interaction = { id: "test" };

    await messageDeleteCommand.execute(interaction as never);

    expect(executeMessageDeleteCommandMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("executeMessageDeleteCommand が例外を投げた場合に handleCommandError へ委譲すること", async () => {
    const error = new Error("delete error");
    executeMessageDeleteCommandMock.mockRejectedValue(error);
    const interaction = { id: "test" };

    await messageDeleteCommand.execute(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, error);
  });
});
