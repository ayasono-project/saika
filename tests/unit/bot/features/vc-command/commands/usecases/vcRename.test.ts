// tests/unit/bot/features/vc-command/commands/usecases/vcRename.test.ts

import { DiscordAPIError, MessageFlags, RESTJSONErrorCodes } from "discord.js";
import type { Mock } from "vitest";
import { resolveVoiceChannelForEdit } from "@/bot/features/vc-command/commands/helpers/vcVoiceChannelResolver";
import { executeVcRename } from "@/bot/features/vc-command/commands/usecases/vcRename";
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
  tInteraction: vi.fn(
    (_locale: string, key: string, params?: Record<string, unknown>) => {
      if (key === "vc:user-response.renamed") {
        return `renamed:${String(params?.name)}`;
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

describe("bot/features/vc-command/commands/usecases/vcRename", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("チャンネルをリネームしてエフェメラルで成功応答する", async () => {
    const edit = vi.fn().mockResolvedValue(undefined);
    (resolveVoiceChannelForEdit as Mock).mockResolvedValue({ edit });

    const reply = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      locale: "ja",
      options: { getString: vi.fn(() => "My VC") },
      reply,
    };

    await executeVcRename(interaction as never, "voice-1");

    expect(edit).toHaveBeenCalledWith({ name: "My VC" });
    expect(createSuccessEmbed).toHaveBeenCalledWith("renamed:My VC");
    expect(reply).toHaveBeenCalledWith({
      embeds: [{ description: "renamed:My VC" }],
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
      options: { getString: vi.fn(() => "My VC") },
      reply: vi.fn(),
    };

    await expect(executeVcRename(interaction as never, "voice-1")).rejects.toBe(
      apiError,
    );
  });

  it("resolverの失敗を呼び出し元に伝播する", async () => {
    (resolveVoiceChannelForEdit as Mock).mockRejectedValue(
      new Error("not managed"),
    );

    const interaction = {
      locale: "ja",
      options: { getString: vi.fn(() => "My VC") },
      reply: vi.fn(),
    };

    await expect(
      executeVcRename(interaction as never, "voice-1"),
    ).rejects.toThrow("not managed");
  });
});
