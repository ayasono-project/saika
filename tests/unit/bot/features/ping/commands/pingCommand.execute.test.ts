// tests/unit/bot/features/ping/commands/pingCommand.execute.test.ts
import { executePingCommand } from "@/bot/features/ping/commands/pingCommand.execute";
import { createSuccessEmbed } from "@/bot/utils/messageResponse";

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
  tGuild: vi.fn(),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((description: string) => ({ description })),
  createSuccessEmbed: vi.fn((description: string) => ({ description })),
}));

function createInteraction() {
  return {
    guildId: "guild-1",
    locale: "ja",
    createdTimestamp: 1_000,
    client: { ws: { ping: 42 } },
    reply: vi.fn().mockResolvedValue(undefined),
    fetchReply: vi.fn().mockResolvedValue({ createdTimestamp: 1_130 }),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

describe("bot/features/ping/commands/pingCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("計測中メッセージを返信し、レイテンシ embed で編集する", async () => {
    const interaction = createInteraction();

    await executePingCommand(interaction as never);

    // tInteraction returns the key as-is
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "ping:user-response.measuring" }],
    });
    expect(createSuccessEmbed).toHaveBeenCalledWith(
      "ping:user-response.result",
    );
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [{ description: "ping:user-response.result" }],
    });
  });

  it("interaction の locale が使用されること", async () => {
    const interaction = createInteraction();
    interaction.locale = "en-US" as never;

    await executePingCommand(interaction as never);

    const { tInteraction } = await import("@/shared/locale/localeManager");
    expect(tInteraction).toHaveBeenCalledWith(
      "en-US",
      "ping:user-response.measuring",
    );
  });
});
