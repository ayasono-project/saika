// tests/unit/bot/features/vc-command/commands/usecases/vcLimit.test.ts

import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import type { Mock } from "vitest";
import { resolveVoiceChannelForEdit } from "@/bot/features/vc-command/commands/helpers/vcVoiceChannelResolver";
import { executeVcLimit } from "@/bot/features/vc-command/commands/usecases/vcLimit";
import { createSuccessEmbed } from "@/bot/utils/messageResponse";
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
  tInteraction: vi.fn(
    (_locale: string, key: string, params?: Record<string, unknown>) => {
      if (key === "vc:user-response.unlimited") {
        return "unlimited";
      }
      if (key === "vc:user-response.limit_changed") {
        return `limit:${String(params?.limit)}`;
      }
      return key;
    },
  ),
}));

vi.mock(
  "@/bot/features/vc-command/commands/helpers/vcVoiceChannelResolver",
  () => ({
    resolveVoiceChannelForEdit: vi.fn(),
  }),
);

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn((description: string) => ({ description })),
}));

describe("bot/features/vc-command/commands/usecases/vcLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("許容範囲外の上限値が渡された場合にValidationErrorをスローする", async () => {
    const interaction = {
      locale: "ja",
      options: { getInteger: vi.fn(() => 100) },
      reply: vi.fn(),
    };

    await expect(
      executeVcLimit(interaction as never, "voice-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("上限0を設定して無制限ラベルで成功応答する", async () => {
    const edit = vi.fn().mockResolvedValue(undefined);
    (resolveVoiceChannelForEdit as Mock).mockResolvedValue({ edit });

    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      locale: "ja",
      options: { getInteger: vi.fn(() => 0) },
      reply,
    };

    await executeVcLimit(interaction as never, "voice-1");

    expect(edit).toHaveBeenCalledWith({ userLimit: 0 });
    expect(createSuccessEmbed).toHaveBeenCalledWith("limit:unlimited");
    expect(reply).toHaveBeenCalledWith({
      embeds: [{ description: "limit:unlimited" }],
      flags: MessageFlags.Ephemeral,
    });
  });

  it("channel.edit で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する", async () => {
    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "PATCH",
      "/channels/voice-1",
      {},
    );
    const edit = vi.fn().mockRejectedValue(apiError);
    (resolveVoiceChannelForEdit as Mock).mockResolvedValue({ edit });

    const interaction = {
      locale: "ja",
      options: { getInteger: vi.fn(() => 5) },
      reply: vi.fn(),
    };

    await expect(executeVcLimit(interaction as never, "voice-1")).rejects.toBe(
      apiError,
    );
  });

  it("チャンネル上限を数値で設定して数値ラベルで成功応答する", async () => {
    const edit = vi.fn().mockResolvedValue(undefined);
    (resolveVoiceChannelForEdit as Mock).mockResolvedValue({ edit });

    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      locale: "ja",
      options: { getInteger: vi.fn(() => 8) },
      reply,
    };

    await executeVcLimit(interaction as never, "voice-1");

    expect(edit).toHaveBeenCalledWith({ userLimit: 8 });
    expect(createSuccessEmbed).toHaveBeenCalledWith("limit:8");
    expect(reply).toHaveBeenCalledWith({
      embeds: [{ description: "limit:8" }],
      flags: MessageFlags.Ephemeral,
    });
  });
});
