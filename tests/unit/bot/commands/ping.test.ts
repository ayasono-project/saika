// tests/unit/bot/commands/ping.test.ts

const executePingCommandMock = vi.fn();
const handleCommandErrorMock = vi.fn();

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
}));

vi.mock("@/bot/features/ping/commands/pingCommand.execute", () => ({
  executePingCommand: (...args: unknown[]) => executePingCommandMock(...args),
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

import { pingCommand } from "@/bot/commands/ping";

// pingCommand ラッパーのエラーハンドリング委譲を検証
describe("bot/commands/ping", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("execute が executePingCommand へ委譲すること", async () => {
    executePingCommandMock.mockResolvedValue(undefined);
    const interaction = { id: "test" };

    await pingCommand.execute(interaction as never);

    expect(executePingCommandMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("executePingCommand が例外を投げた場合に handleCommandError へ委譲すること", async () => {
    const error = new Error("ping error");
    executePingCommandMock.mockRejectedValue(error);
    const interaction = { id: "test" };

    await pingCommand.execute(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, error);
  });
});
