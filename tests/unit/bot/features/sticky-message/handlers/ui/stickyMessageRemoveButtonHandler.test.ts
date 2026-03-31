// tests/unit/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler.test.ts

import { ChannelType } from "discord.js";

const findByChannelMock = vi.fn();
const deleteMock = vi.fn().mockResolvedValue(undefined);
const tGuildMock = vi.fn(
  async (_guildId: string | undefined, key: string) => `[${key}]`,
);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageConfigService: vi.fn(() => ({
    findByChannel: findByChannelMock,
    delete: deleteMock,
  })),
}));

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
  tGuild: tGuildMock,
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((msg: string) => ({
    type: "info",
    description: msg,
  })),
  createSuccessEmbed: vi.fn((msg: string, opts?: object) => ({
    type: "success",
    description: msg,
    ...opts,
  })),
}));

function createButtonInteractionMock({
  guildId = "guild-1",
  userId = "user-1",
  guildChannelFetch = true,
  deleteMsgSuccess = true,
}: {
  guildId?: string | null;
  userId?: string;
  guildChannelFetch?: boolean;
  deleteMsgSuccess?: boolean;
} = {}) {
  const updateMock = vi.fn().mockResolvedValue(undefined);
  const replyMock = vi.fn().mockResolvedValue(undefined);
  const msgDeleteMock = deleteMsgSuccess
    ? vi.fn().mockResolvedValue(undefined)
    : vi.fn().mockRejectedValue(new Error("Not found"));
  const fetchMsgMock = vi.fn().mockResolvedValue({ delete: msgDeleteMock });

  return {
    guildId,
    user: { id: userId },
    update: updateMock,
    reply: replyMock,
    guild: guildChannelFetch
      ? {
          channels: {
            fetch: vi.fn(async () => ({
              type: ChannelType.GuildText,
              messages: { fetch: fetchMsgMock },
            })),
          },
        }
      : null,
    _updateMock: updateMock,
    _replyMock: replyMock,
    _msgDeleteMock: msgDeleteMock,
    _fetchMsgMock: fetchMsgMock,
  };
}

// stickyMessageRemoveButtonHandler のテスト
describe("bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler", () => {
  // 各テストでモック呼び出し記録をリセットし、deleteMock の初期値を再設定する
  beforeEach(() => {
    vi.clearAllMocks();
    deleteMock.mockResolvedValue(undefined);
  });

  it("REMOVE_BUTTON_CUSTOM_ID に完全一致する customId を正しく識別する", async () => {
    const { stickyMessageRemoveButtonHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler"
    );
    expect(
      stickyMessageRemoveButtonHandler.matches("sticky-message:remove-confirm"),
    ).toBe(true);
    expect(
      stickyMessageRemoveButtonHandler.matches("sticky-message:remove-select"),
    ).toBe(false);
  });

  it("セレクトメニューで何も選択せずにボタンを押した場合に情報メッセージを返す", async () => {
    const { stickyMessageRemoveButtonHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler"
    );
    const { stickyMessageRemoveSelections } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveState"
    );
    // 選択状態をセットしない
    stickyMessageRemoveSelections.delete("guild-1:user-1");

    const interaction = createButtonInteractionMock();

    await stickyMessageRemoveButtonHandler.execute(interaction as never);

    expect(interaction._replyMock).toHaveBeenCalledWith(
      expect.objectContaining({ ephemeral: true }),
    );
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("1チャンネル選択で削除成功し、Discord側メッセージも削除される", async () => {
    const { stickyMessageRemoveButtonHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler"
    );
    const { stickyMessageRemoveSelections } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveState"
    );
    stickyMessageRemoveSelections.set("guild-1:user-1", ["ch-1"]);
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      lastMessageId: "msg-1",
    });

    const interaction = createButtonInteractionMock();

    await stickyMessageRemoveButtonHandler.execute(interaction as never);

    expect(deleteMock).toHaveBeenCalledWith("sticky-1");
    expect(interaction._updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });

  it("複数チャンネル選択で一括削除成功する", async () => {
    const { stickyMessageRemoveButtonHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler"
    );
    const { stickyMessageRemoveSelections } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveState"
    );
    stickyMessageRemoveSelections.set("guild-1:user-1", ["ch-1", "ch-2"]);
    findByChannelMock
      .mockResolvedValueOnce({ id: "sticky-1", lastMessageId: "msg-1" })
      .mockResolvedValueOnce({ id: "sticky-2", lastMessageId: "msg-2" });

    const interaction = createButtonInteractionMock();

    await stickyMessageRemoveButtonHandler.execute(interaction as never);

    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(interaction._updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
  });

  it("Discord側メッセージが既に削除済みでも DB から削除成功する", async () => {
    const { stickyMessageRemoveButtonHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler"
    );
    const { stickyMessageRemoveSelections } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveState"
    );
    stickyMessageRemoveSelections.set("guild-1:user-1", ["ch-1"]);
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      lastMessageId: "msg-gone",
    });

    const interaction = createButtonInteractionMock({
      deleteMsgSuccess: false,
    });

    await expect(
      stickyMessageRemoveButtonHandler.execute(interaction as never),
    ).resolves.not.toThrow();
    expect(deleteMock).toHaveBeenCalledWith("sticky-1");
  });

  it("guildId が null の場合は早期リターンする", async () => {
    const { stickyMessageRemoveButtonHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler"
    );

    const interaction = createButtonInteractionMock({ guildId: null });

    await stickyMessageRemoveButtonHandler.execute(interaction as never);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(interaction._updateMock).not.toHaveBeenCalled();
  });

  it("設定が見つからないチャンネルはスキップされる", async () => {
    const { stickyMessageRemoveButtonHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler"
    );
    const { stickyMessageRemoveSelections } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveState"
    );
    stickyMessageRemoveSelections.set("guild-1:user-1", [
      "ch-1",
      "ch-not-found",
    ]);
    findByChannelMock
      .mockResolvedValueOnce({ id: "sticky-1", lastMessageId: null })
      .mockResolvedValueOnce(null);

    const interaction = createButtonInteractionMock();

    await stickyMessageRemoveButtonHandler.execute(interaction as never);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(deleteMock).toHaveBeenCalledWith("sticky-1");
  });
});
