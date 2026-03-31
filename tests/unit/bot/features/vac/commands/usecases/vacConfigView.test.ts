// tests/unit/bot/features/vac/commands/usecases/vacConfigView.test.ts

import { MessageFlags } from "discord.js";
import type { Mock } from "vitest";
import { presentVacConfigView } from "@/bot/features/vac/commands/presenters/vacConfigViewPresenter";
import { handleVacConfigView } from "@/bot/features/vac/commands/usecases/vacConfigView";
import { getBotVacConfigService } from "@/bot/services/botCompositionRoot";
import { createInfoEmbed } from "@/bot/utils/messageResponse";
import { ValidationError } from "@/shared/errors/customErrors";

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
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacConfigService: vi.fn(),
}));

vi.mock(
  "@/bot/features/vac/commands/presenters/vacConfigViewPresenter",
  () => ({
    presentVacConfigView: vi.fn(),
  }),
);

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((description: string, options?: object) => ({
    description,
    options,
  })),
}));

describe("bot/features/vac/commands/usecases/vacConfigView", () => {
  // view ユースケースの前提チェックと返信ペイロードを検証
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ギルドコンテキストが存在しない場合にValidationErrorをスローする", async () => {
    const interaction = {
      guild: null,
      reply: vi.fn(),
    };

    await expect(
      handleVacConfigView(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ギルドが存在する場合にinfoエンベッドを構築してエフェメラルで返答する", async () => {
    const getVacConfigOrDefault = vi.fn().mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });
    (getBotVacConfigService as Mock).mockReturnValue({
      getVacConfigOrDefault,
    });

    (presentVacConfigView as Mock).mockResolvedValue({
      title: "VAC設定",
      fieldTrigger: "トリガー",
      triggerChannels: "<#trigger-1> (TOP)",
      fieldCreatedDetails: "作成済みVC",
      createdVcDetails: "作成済みVCなし",
    });

    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      locale: "ja",
      guild: { id: "guild-1" },
      reply,
    };

    await handleVacConfigView(interaction as never, "guild-1");

    expect(getVacConfigOrDefault).toHaveBeenCalledWith("guild-1");
    expect(presentVacConfigView).toHaveBeenCalledWith(interaction.guild, "ja", {
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });

    expect(createInfoEmbed).toHaveBeenCalledWith("", {
      title: "VAC設定",
      fields: [
        {
          name: "トリガー",
          value: "<#trigger-1> (TOP)",
          inline: false,
        },
        {
          name: "作成済みVC",
          value: "作成済みVCなし",
          inline: false,
        },
      ],
    });

    expect(reply).toHaveBeenCalledWith({
      embeds: [{ description: "", options: expect.any(Object) }],
      flags: MessageFlags.Ephemeral,
    });
  });
});
