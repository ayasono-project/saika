import { EmbedBuilder, MessageFlags } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/shared/config/env", () => ({
  env: {
    OFFICIAL_URL: undefined,
    USER_MANUAL_URL: undefined,
    DASHBOARD_URL: undefined,
  },
}));

vi.mock("@/shared/config/appVersion", () => ({
  getAppVersion: vi.fn(() => "9.9.9"),
}));

import { executeAboutCommand } from "@/features/about/commands/aboutCommand.execute";
import { env } from "@/shared/config/env";
import { tInteraction } from "@/shared/locale/localeManager";

function createInteraction() {
  return {
    locale: "ja",
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe("features/about/commands/aboutCommand.execute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mutable = env as {
      OFFICIAL_URL?: string;
      USER_MANUAL_URL?: string;
      DASHBOARD_URL?: string;
    };
    mutable.OFFICIAL_URL = undefined;
    mutable.USER_MANUAL_URL = undefined;
    mutable.DASHBOARD_URL = undefined;
  });

  it("ephemeral で Embed を返信すること", async () => {
    const interaction = createInteraction();

    await executeAboutCommand(interaction as never);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
      flags: number;
    };
    expect(call.flags).toBe(MessageFlags.Ephemeral);
  });

  it("Embed タイトルとバージョンフィールドを含むこと", async () => {
    const interaction = createInteraction();

    await executeAboutCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const embed = call.embeds[0]!;
    expect(embed.data.title).toBe("about:embed.title");
    const fields = embed.data.fields!;
    expect(fields).toHaveLength(1);
    expect(fields[0]!.name).toBe("about:embed.field.name.version");
    expect(fields[0]!.value).toBe("v9.9.9");
  });

  it("OFFICIAL_URL 未設定時は公式サイトフィールドを含まないこと", async () => {
    const interaction = createInteraction();

    await executeAboutCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const embed = call.embeds[0]!;
    const fields = embed.data.fields!;
    expect(fields).toHaveLength(1);
    expect(
      fields.some((f) => f.name === "about:embed.field.name.official"),
    ).toBe(false);
  });

  it("OFFICIAL_URL 設定時は公式サイトフィールドを追加すること", async () => {
    (env as { OFFICIAL_URL?: string }).OFFICIAL_URL = "https://example.com";
    const interaction = createInteraction();

    await executeAboutCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const embed = call.embeds[0]!;
    const fields = embed.data.fields!;
    expect(fields).toHaveLength(2);
    expect(fields[1]!.name).toBe("about:embed.field.name.official");
    expect(tInteraction).toHaveBeenCalledWith(
      "ja",
      "about:embed.field.value.official",
      { url: "https://example.com" },
    );
  });

  it("USER_MANUAL_URL 設定時はマニュアルフィールドを追加すること", async () => {
    (env as { USER_MANUAL_URL?: string }).USER_MANUAL_URL =
      "https://example.com/manual";
    const interaction = createInteraction();

    await executeAboutCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const fields = call.embeds[0]!.data.fields!;
    expect(fields.some((f) => f.name === "about:embed.field.name.manual")).toBe(
      true,
    );
    expect(tInteraction).toHaveBeenCalledWith(
      "ja",
      "about:embed.field.value.manual",
      { url: "https://example.com/manual" },
    );
  });

  it("DASHBOARD_URL 設定時はダッシュボードフィールドを追加すること", async () => {
    (env as { DASHBOARD_URL?: string }).DASHBOARD_URL =
      "https://example.com/dash";
    const interaction = createInteraction();

    await executeAboutCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    const fields = call.embeds[0]!.data.fields!;
    expect(
      fields.some((f) => f.name === "about:embed.field.name.dashboard"),
    ).toBe(true);
  });

  it("URL が未設定なら死にリンクのフィールドを出さないこと", async () => {
    const interaction = createInteraction();

    await executeAboutCommand(interaction as never);

    const call = interaction.reply.mock.calls[0]![0] as {
      embeds: EmbedBuilder[];
    };
    // バージョンのみ（公式サイト・マニュアル・ダッシュボードはいずれも未設定）
    expect(call.embeds[0]!.data.fields!).toHaveLength(1);
  });

  it("interaction の locale が tInteraction に渡されること", async () => {
    const interaction = createInteraction();
    interaction.locale = "en-US";

    await executeAboutCommand(interaction as never);

    expect(tInteraction).toHaveBeenCalledWith("en-US", "about:embed.title");
  });
});
