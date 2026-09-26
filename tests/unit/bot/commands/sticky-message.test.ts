const executeStickyMessageCommandMock = vi.fn();
const handleCommandErrorMock = vi.fn();

vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    base: "desc",
    localizations: { "en-US": "desc" },
  }),
  getChoiceLocalizations: vi
    .fn()
    .mockImplementation((_ns: string, _key: string, value: string) => ({
      name: "test",
      name_localizations: { "en-US": "test", "en-GB": "test" },
      value,
    })),
}));

vi.mock(
  "@/features/sticky-message/commands/stickyMessageCommand.execute",
  () => ({
    executeStickyMessageCommand: (...args: unknown[]) =>
      executeStickyMessageCommandMock(...args),
  }),
);

vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: (...args: unknown[]) => handleCommandErrorMock(...args),
}));

vi.mock(
  "@/features/sticky-message/commands/stickyMessageCommand.constants",
  async () => {
    const actual = await vi.importActual(
      "@/features/sticky-message/commands/stickyMessageCommand.constants",
    );
    return actual;
  },
);

import { ChannelType } from "discord.js";
import { stickyMessageCommand } from "@/bot/commands/sticky-message";
import { STICKY_MESSAGE_COMMAND } from "@/features/sticky-message/commands/stickyMessageCommand.constants";

// stickyMessageCommand ラッパーのエラーハンドリング委譲を検証
describe("bot/commands/sticky-message", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("execute が executeStickyMessageCommand へ委譲すること", async () => {
    executeStickyMessageCommandMock.mockResolvedValue(undefined);
    const interaction = { id: "test" };

    await stickyMessageCommand.execute(interaction as never);

    expect(executeStickyMessageCommandMock).toHaveBeenCalledWith(interaction);
    expect(handleCommandErrorMock).not.toHaveBeenCalled();
  });

  it("executeStickyMessageCommand が例外を投げた場合に handleCommandError へ委譲すること", async () => {
    const error = new Error("sticky error");
    executeStickyMessageCommandMock.mockRejectedValue(error);
    const interaction = { id: "test" };

    await stickyMessageCommand.execute(interaction as never);

    expect(handleCommandErrorMock).toHaveBeenCalledWith(interaction, error);
  });

  it.each([
    STICKY_MESSAGE_COMMAND.SUBCOMMAND.SET,
    STICKY_MESSAGE_COMMAND.SUBCOMMAND.UPDATE,
  ])(
    "%s の channel オプションは選択時点で通常のテキストチャンネルだけに絞られていること",
    (subcommandName) => {
      const json = stickyMessageCommand.data.toJSON();
      const subcommand = json.options?.find((o) => o.name === subcommandName) as
        | { options?: { name: string; channel_types?: ChannelType[] }[] }
        | undefined;
      const channelOption = subcommand?.options?.find(
        (o) => o.name === STICKY_MESSAGE_COMMAND.OPTION.CHANNEL,
      );

      expect(channelOption?.channel_types).toEqual([ChannelType.GuildText]);
    },
  );
});
