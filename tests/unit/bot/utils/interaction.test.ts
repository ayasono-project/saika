// tests/unit/bot/utils/interaction.test.ts

import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import type { Mock } from "vitest";
import { safeReply } from "@/bot/utils/interaction";

type InteractionLike = {
  replied: boolean;
  deferred: boolean;
  reply: Mock<(arg: unknown) => Promise<void>>;
  followUp: Mock<(arg: unknown) => Promise<void>>;
};

// Interaction の最小モックを生成するヘルパー
function createInteraction(
  overrides?: Partial<InteractionLike>,
): InteractionLike {
  return {
    replied: false,
    deferred: false,
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// DiscordAPIError として扱えるエラーインスタンスを組み立てるヘルパー
function createDiscordApiError(code: number): DiscordAPIError {
  const error = Object.assign(new Error("discord api error"), { code });
  Object.setPrototypeOf(error, DiscordAPIError.prototype);
  return error as DiscordAPIError;
}

describe("shared/utils/interaction safeReply", () => {
  // 応答状態ごとの reply/followUp 分岐と例外ハンドリングを検証
  it("interaction が未応答の場合は reply が使われることを確認", async () => {
    const interaction = createInteraction();

    await safeReply(interaction as never, { content: "hello" });

    expect(interaction.reply).toHaveBeenCalledWith({ content: "hello" });
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("interaction が応答済みの場合は followUp が使われることを確認", async () => {
    const interaction = createInteraction({ replied: true });

    await safeReply(interaction as never, { content: "hello" });

    expect(interaction.followUp).toHaveBeenCalledWith({ content: "hello" });
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("interaction が defer 済みの場合は followUp が使われることを確認", async () => {
    const interaction = createInteraction({ deferred: true });

    await safeReply(interaction as never, { content: "hello" });

    expect(interaction.followUp).toHaveBeenCalledWith({ content: "hello" });
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("UnknownInteraction の Discord API エラーが無視されることを確認", async () => {
    // 期限切れInteractionは安全に無視されること
    const interaction = createInteraction({
      reply: vi
        .fn<(arg: unknown) => Promise<void>>()
        .mockRejectedValueOnce(
          createDiscordApiError(RESTJSONErrorCodes.UnknownInteraction),
        ),
    });

    await expect(
      safeReply(interaction as never, { content: "ignored" }),
    ).resolves.toBeUndefined();
  });

  it("InteractionHasAlreadyBeenAcknowledged の Discord API エラーが無視されることを確認", async () => {
    // 応答済みエラーは再送処理で握りつぶすこと
    const interaction = createInteraction({
      reply: vi
        .fn<(arg: unknown) => Promise<void>>()
        .mockRejectedValueOnce(
          createDiscordApiError(
            RESTJSONErrorCodes.InteractionHasAlreadyBeenAcknowledged,
          ),
        ),
    });

    await expect(
      safeReply(interaction as never, { content: "ignored" }),
    ).resolves.toBeUndefined();
  });

  it("無視対象外の Discord API エラーが再送出されることを確認", async () => {
    // 無視対象以外の Discord API エラーは呼び出し元へ送出すること
    const interaction = createInteraction({
      reply: vi
        .fn<(arg: unknown) => Promise<void>>()
        .mockRejectedValueOnce(
          createDiscordApiError(RESTJSONErrorCodes.UnknownUser),
        ),
    });

    await expect(
      safeReply(interaction as never, { content: "boom" }),
    ).rejects.toBeInstanceOf(DiscordAPIError);
  });

  it("Discord 以外のエラーが再送出されることを確認", async () => {
    // DiscordAPIError 以外の例外も握りつぶさず再送出すること
    const interaction = createInteraction({
      reply: vi
        .fn<(arg: unknown) => Promise<void>>()
        .mockRejectedValueOnce(new Error("unexpected")),
    });

    await expect(
      safeReply(interaction as never, { content: "boom" }),
    ).rejects.toThrow("unexpected");
  });
});
