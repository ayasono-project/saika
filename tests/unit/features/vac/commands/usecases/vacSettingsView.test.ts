// tests/unit/bot/features/vac/commands/usecases/vacSettingsView.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { MessageFlags } from "discord.js";
import type { Mock } from "vitest";
import { getBotVacSettingsService } from "@/bot/services/botCompositionRoot";
import { createInfoEmbed } from "@/bot/utils/messageResponse";
import { presentVacSettingsView } from "@/features/vac/commands/presenters/vacSettingsViewPresenter";
import { handleVacSettingsView } from "@/features/vac/commands/usecases/vacSettingsView";

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
  getBotVacSettingsService: vi.fn(),
}));

vi.mock("@/features/vac/commands/presenters/vacSettingsViewPresenter", () => ({
  presentVacSettingsView: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((description: string, options?: object) => ({
    description,
    options,
  })),
}));

describe("bot/features/vac/commands/usecases/vacSettingsView", () => {
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
      handleVacSettingsView(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ギルドが存在する場合にinfoエンベッドを構築してエフェメラルで返答する", async () => {
    const getVacSettingsOrDefault = vi.fn().mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["trigger-1"],
      createdChannels: [],
    });
    (getBotVacSettingsService as Mock).mockReturnValue({
      getVacSettingsOrDefault,
    });

    (presentVacSettingsView as Mock).mockResolvedValue({
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

    await handleVacSettingsView(interaction as never, "guild-1");

    expect(getVacSettingsOrDefault).toHaveBeenCalledWith("guild-1");
    expect(presentVacSettingsView).toHaveBeenCalledWith(
      interaction.guild,
      "ja",
      {
        enabled: true,
        triggerChannelIds: ["trigger-1"],
        createdChannels: [],
      },
    );

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
