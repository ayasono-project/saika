// tests/unit/bot/features/vc-command/commands/usecases/vcVoiceChannelGuard.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { ChannelType } from "discord.js";
import type { Mock } from "vitest";
import { getManagedVoiceChannel } from "@/bot/features/vc-command/commands/usecases/vcVoiceChannelGuard";
import {
  getBotVacSettingsService,
  getBotVcRecruitRepository,
} from "@/bot/services/botCompositionRoot";

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
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacSettingsService: vi.fn(),
  getBotVcRecruitRepository: vi.fn(),
}));

function createInteraction(voiceChannel: unknown) {
  return {
    locale: "ja",
    user: { id: "user-1" },
    guild: {
      members: {
        fetch: vi.fn().mockResolvedValue({
          voice: { channel: voiceChannel },
        }),
      },
    },
  };
}

describe("bot/features/vc-command/commands/usecases/vcVoiceChannelGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("メンバーがボイスチャンネルに在籍していない場合にValidationErrorをスローする", async () => {
    const interaction = createInteraction(null);

    await expect(
      getManagedVoiceChannel(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("VAC管理下のVCに在籍している場合にボイスチャンネルIDを返す", async () => {
    (getBotVacSettingsService as Mock).mockReturnValue({
      isManagedVacChannel: vi.fn().mockResolvedValue(true),
    });

    const interaction = createInteraction({
      id: "voice-1",
      type: ChannelType.GuildVoice,
    });

    const result = await getManagedVoiceChannel(
      interaction as never,
      "guild-1",
    );

    expect(result).toEqual({ id: "voice-1" });
    expect(getBotVcRecruitRepository).not.toHaveBeenCalled();
  });

  it("VC募集で作成されたVCに在籍している場合にボイスチャンネルIDを返す", async () => {
    (getBotVacSettingsService as Mock).mockReturnValue({
      isManagedVacChannel: vi.fn().mockResolvedValue(false),
    });
    (getBotVcRecruitRepository as Mock).mockReturnValue({
      isCreatedVcRecruitChannel: vi.fn().mockResolvedValue(true),
    });

    const interaction = createInteraction({
      id: "voice-1",
      type: ChannelType.GuildVoice,
    });

    const result = await getManagedVoiceChannel(
      interaction as never,
      "guild-1",
    );

    expect(result).toEqual({ id: "voice-1" });
  });

  it("どの機能にも管理されていないVCの場合にValidationErrorをスローする", async () => {
    (getBotVacSettingsService as Mock).mockReturnValue({
      isManagedVacChannel: vi.fn().mockResolvedValue(false),
    });
    (getBotVcRecruitRepository as Mock).mockReturnValue({
      isCreatedVcRecruitChannel: vi.fn().mockResolvedValue(false),
    });

    const interaction = createInteraction({
      id: "voice-1",
      type: ChannelType.GuildVoice,
    });

    await expect(
      getManagedVoiceChannel(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
