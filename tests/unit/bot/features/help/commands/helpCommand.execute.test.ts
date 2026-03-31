// tests/unit/bot/features/help/commands/helpCommand.execute.test.ts

import { EmbedBuilder, MessageFlags } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/shared/config/env", () => ({
  env: {
    USER_MANUAL_URL: undefined,
  },
}));

import { executeHelpCommand } from "@/bot/features/help/commands/helpCommand.execute";
import { env } from "@/shared/config/env";
import { tInteraction } from "@/shared/locale/localeManager";

function createInteraction() {
  return {
    locale: "ja",
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe("bot/features/help/commands/helpCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (env as { USER_MANUAL_URL?: string }).USER_MANUAL_URL = undefined;
  });

  it("ephemeral で Embed を返信すること", async () => {
    const interaction = createInteraction();

    await executeHelpCommand(interaction as never);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
      flags: number;
    };
    expect(call.flags).toBe(MessageFlags.Ephemeral);
  });

  it("Embed に3つのフィールド（基本・設定・操作）を含むこと", async () => {
    const interaction = createInteraction();

    await executeHelpCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const embed = call.embeds[0]!;
    const fields = embed.data.fields!;
    expect(fields).toHaveLength(3);
    expect(fields[0]!.name).toBe("help:embed.field.name.basic");
    expect(fields[1]!.name).toBe("help:embed.field.name.config");
    expect(fields[2]!.name).toBe("help:embed.field.name.action");
  });

  it("Embed タイトルが設定されること", async () => {
    const interaction = createInteraction();

    await executeHelpCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const embed = call.embeds[0]!;
    expect(embed.data.title).toBe("help:embed.title.help");
  });

  it("USER_MANUAL_URL 未設定時は description が設定されないこと", async () => {
    const interaction = createInteraction();

    await executeHelpCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const embed = call.embeds[0]!;
    expect(embed.data.description).toBeUndefined();
  });

  it("USER_MANUAL_URL 設定時は description にマニュアルリンクが含まれること", async () => {
    (env as { USER_MANUAL_URL?: string }).USER_MANUAL_URL =
      "https://example.com/manual";
    const interaction = createInteraction();

    await executeHelpCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const embed = call.embeds[0]!;
    expect(embed.data.description).toBe("help:embed.description.help");
    expect(tInteraction).toHaveBeenCalledWith(
      "ja",
      "help:embed.description.help",
      { url: "https://example.com/manual" },
    );
  });

  it("interaction の locale が tInteraction に渡されること", async () => {
    const interaction = createInteraction();
    interaction.locale = "en-US";

    await executeHelpCommand(interaction as never);

    expect(tInteraction).toHaveBeenCalledWith("en-US", "help:embed.title.help");
  });
});
