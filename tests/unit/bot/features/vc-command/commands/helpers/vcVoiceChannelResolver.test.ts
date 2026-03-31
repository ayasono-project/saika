// tests/unit/bot/features/vc-command/commands/helpers/vcVoiceChannelResolver.test.ts

import { ChannelType } from "discord.js";
import { resolveVoiceChannelForEdit } from "@/bot/features/vc-command/commands/helpers/vcVoiceChannelResolver";
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
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

describe("bot/features/vc-command/commands/helpers/vcVoiceChannelResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("存在しないチャンネルIDの場合にValidationErrorをスローする", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    };

    await expect(
      resolveVoiceChannelForEdit(interaction as never, "missing-id"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ボイスチャンネルでない場合にValidationErrorをスローする", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "text-ch",
            type: ChannelType.GuildText,
          }),
        },
      },
    };

    await expect(
      resolveVoiceChannelForEdit(interaction as never, "text-ch"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("ボイスチャンネルの場合にチャンネルオブジェクトを返す", async () => {
    const voiceChannel = {
      id: "voice-1",
      type: ChannelType.GuildVoice,
    };
    const interaction = {
      locale: "ja",
      guild: {
        channels: {
          fetch: vi.fn().mockResolvedValue(voiceChannel),
        },
      },
    };

    const result = await resolveVoiceChannelForEdit(
      interaction as never,
      "voice-1",
    );

    expect(result).toBe(voiceChannel);
  });
});
