import { ChannelType } from "discord.js";
import {
  presentBulkConfirm,
  VC_BULK_CONFIRM,
  vcBulkActionButtonHandler,
} from "@/bot/shared/vcBulkAction";

const formatActionLogMock = vi.fn((..._a: unknown[]) => ({
  description: "action-log",
}));
const resolveAuditReasonMock = vi.fn((..._a: unknown[]) => "audit-reason");

vi.mock("@/bot/shared/vcActionLog", () => ({
  formatActionLog: (...a: unknown[]) => formatActionLogMock(...a),
  resolveAuditReason: (...a: unknown[]) => resolveAuditReasonMock(...a),
  formatMentionList: (_locale: string, ids: string[]) =>
    ids.map((id) => `<@${id}>`).join(" "),
}));

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (desc: string, opts?: { title?: string }) => ({
    type: "success",
    description: desc,
    title: opts?.title,
  }),
  createWarningEmbed: (desc: string, opts?: { title?: string }) => ({
    type: "warning",
    description: desc,
    title: opts?.title,
  }),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (_l: string, key: string) => key,
  logCommand: (commandName: string, key: string) => `[${commandName}] ${key}`,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: vi.fn() },
}));

const GUILD_VOICE = ChannelType.GuildVoice;
const SOURCE_CHANNEL_ID = "ch-1";
const AFK_CHANNEL_ID = "afk-1";

/** プレフィックス + コマンド interaction.id の customId を組む */
function confirmId(id: string): string {
  return `${VC_BULK_CONFIRM.CONFIRM_PREFIX}${id}`;
}
function cancelId(id: string): string {
  return `${VC_BULK_CONFIRM.CANCEL_PREFIX}${id}`;
}

/** /afk 一括移動の確認待ちセッションを seed する */
function seedSession(id: string, memberIds: string[]) {
  const cmdInteraction = {
    id,
    locale: "ja",
    reply: vi.fn().mockResolvedValue(undefined),
  };
  return presentBulkConfirm(
    cmdInteraction as never,
    {
      action: "afk",
      guildId: "guild-1",
      invokerId: "inv-1",
      locale: "ja",
      sourceChannelId: SOURCE_CHANNEL_ID,
      destinationChannelId: AFK_CHANNEL_ID,
    },
    memberIds,
  );
}

/** 移動対象メンバーを持つ VoiceChannel モックを作る */
function makeSourceChannel(memberIds: string[]) {
  const setChannel = vi.fn().mockResolvedValue(undefined);
  const members = new Map(
    memberIds.map((mid) => [mid, { id: mid, voice: { setChannel } }]),
  );
  return {
    channel: { id: SOURCE_CHANNEL_ID, type: GUILD_VOICE, members },
    setChannel,
  };
}

const afkChannel = {
  id: AFK_CHANNEL_ID,
  type: GUILD_VOICE,
  members: new Map(),
};

/** 対象VC / AFK チャンネルを id で返す guild.channels.fetch を持つボタン interaction */
function makeButtonInteraction(
  customId: string,
  sourceChannel: unknown,
  destinationChannel: unknown = afkChannel,
) {
  return {
    customId,
    locale: "ja",
    guild: {
      channels: {
        fetch: vi.fn((id: string) =>
          Promise.resolve(
            id === AFK_CHANNEL_ID ? destinationChannel : sourceChannel,
          ),
        ),
      },
    },
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

// /afk 一括移動の確認ダイアログ → 実行 / キャンセル / 失効 / 空振りの各フローを検証する
describe("bot/shared/vcBulkAction", () => {
  // 各ケースでモック呼び出し記録をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    formatActionLogMock.mockReturnValue({ description: "action-log" });
    resolveAuditReasonMock.mockReturnValue("audit-reason");
  });

  describe("vcBulkActionButtonHandler.matches", () => {
    it("confirm / cancel プレフィックスにのみ一致する", () => {
      expect(vcBulkActionButtonHandler.matches(confirmId("x"))).toBe(true);
      expect(vcBulkActionButtonHandler.matches(cancelId("x"))).toBe(true);
      expect(vcBulkActionButtonHandler.matches("other:foo")).toBe(false);
    });
  });

  it("confirm: 実行時点で対象VC全員を AFK チャンネルへ移動し public で結果を返す", async () => {
    await seedSession("cmd-1", ["m-1", "m-2"]);
    const { channel, setChannel } = makeSourceChannel(["m-1", "m-2"]);
    const interaction = makeButtonInteraction(confirmId("cmd-1"), channel);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1);
    expect(setChannel).toHaveBeenCalledTimes(2);
    expect(setChannel).toHaveBeenCalledWith(afkChannel, "audit-reason");
    // ephemeral 確認ダイアログのボタンを除去
    expect(interaction.editReply).toHaveBeenCalledWith({ components: [] });
    // 結果は public（followUp）で送信
    expect(interaction.followUp).toHaveBeenCalledWith({
      embeds: [{ description: "action-log" }],
    });
    expect(formatActionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "afk",
        targetUserIds: ["m-1", "m-2"],
        failureUserIds: [],
        destinationChannelId: AFK_CHANNEL_ID,
      }),
    );
  });

  it("confirm: 一部メンバーの移動に失敗しても残りを続行し失敗内訳を結果に渡す", async () => {
    await seedSession("cmd-partial", ["m-1", "m-2"]);
    const { channel, setChannel } = makeSourceChannel(["m-1", "m-2"]);
    setChannel.mockRejectedValueOnce(new Error("Missing Permissions"));
    const interaction = makeButtonInteraction(
      confirmId("cmd-partial"),
      channel,
    );

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(setChannel).toHaveBeenCalledTimes(2);
    expect(formatActionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserIds: ["m-1", "m-2"],
        failureUserIds: ["m-1"],
      }),
    );
    expect(interaction.followUp).toHaveBeenCalledTimes(1);
  });

  it("confirm: 移動先の AFK チャンネルが消えていた場合は全員を失敗扱いにして結果を返す", async () => {
    await seedSession("cmd-nodest", ["m-1", "m-2"]);
    const { channel, setChannel } = makeSourceChannel(["m-1", "m-2"]);
    const interaction = makeButtonInteraction(
      confirmId("cmd-nodest"),
      channel,
      null,
    );

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(setChannel).not.toHaveBeenCalled();
    expect(formatActionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        targetUserIds: ["m-1", "m-2"],
        failureUserIds: ["m-1", "m-2"],
      }),
    );
    expect(interaction.followUp).toHaveBeenCalledTimes(1);
  });

  it("cancel: キャンセル応答を ephemeral で返し、処理しない", async () => {
    await seedSession("cmd-2", ["m-1", "m-2"]);
    const { channel, setChannel } = makeSourceChannel(["m-1"]);
    const interaction = makeButtonInteraction(cancelId("cmd-2"), channel);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(setChannel).not.toHaveBeenCalled();
    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("セッション失効時（タイムアウト）はタイムアウト応答を返す", async () => {
    const { channel } = makeSourceChannel(["m-1"]);
    const interaction = makeButtonInteraction(confirmId("missing"), channel);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(interaction.update).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
    expect(interaction.deferUpdate).not.toHaveBeenCalled();
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("guild が無い（DM 等）場合は応答確保後に何もせず終了する", async () => {
    await seedSession("cmd-noguild", ["m-1"]);
    const { channel } = makeSourceChannel(["m-1"]);
    const interaction = {
      ...makeButtonInteraction(confirmId("cmd-noguild"), channel),
      guild: null,
    };

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1);
    expect(interaction.editReply).not.toHaveBeenCalled();
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("実行時点で対象VCが空なら no-op エラーを返し public 送信しない", async () => {
    await seedSession("cmd-3", ["m-1", "m-2"]);
    // 実行時点ではメンバー0人
    const { channel } = makeSourceChannel([]);
    const interaction = makeButtonInteraction(confirmId("cmd-3"), channel);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
    expect(interaction.followUp).not.toHaveBeenCalled();
  });

  it("実行時点で対象VCが消えていた場合も no-op エラーを返し public 送信しない", async () => {
    await seedSession("cmd-4", ["m-1"]);
    const interaction = makeButtonInteraction(confirmId("cmd-4"), null);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
    expect(interaction.followUp).not.toHaveBeenCalled();
  });
});
