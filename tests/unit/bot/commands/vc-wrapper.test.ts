// tests/unit/bot/commands/vc-wrapper.test.ts

const executeVcCommandMock = vi.fn();
const handleCommandErrorMock = vi.fn();

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
}));

vi.mock("@/bot/features/vc-command/commands/vcCommand.execute", () => ({
  executeVcCommand: (...args: unknown[]) => executeVcCommandMock(...args),
}));

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

vi.mock("@/bot/features/vc-command/commands/vcCommand.constants", () => ({
  VC_COMMAND: {
    NAME: "vc",
    SUBCOMMAND: { RENAME: "rename", LIMIT: "limit" },
    OPTION: { NAME: "name", LIMIT: "limit" },
    LIMIT_MIN: 0,
    LIMIT_MAX: 99,
  },
}));

import { vcCommand } from "@/bot/commands/vc";

// vcCommand ラッパーのエラーハンドリング委譲を検証
describe("bot/commands/vc (wrapper)", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("execute が executeVcCommand へ委譲すること", async () => {
    executeVcCommandMock.mockResolvedValue(undefined);
    const interaction = { id: "test" };

    await vcCommand.execute(interaction as never);

    expect(executeVcCommandMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("executeVcCommand が例外を投げた場合に handleCommandError へ委譲すること", async () => {
    const error = new Error("vc error");
    executeVcCommandMock.mockRejectedValue(error);
    const interaction = { id: "test" };

    await vcCommand.execute(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, error);
  });
});
