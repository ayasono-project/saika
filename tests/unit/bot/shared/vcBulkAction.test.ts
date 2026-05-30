// tests/unit/bot/shared/vcBulkAction.test.ts

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

/** プレフィックス + コマンド interaction.id の customId を組む */
function confirmId(id: string): string {
  return `${VC_BULK_CONFIRM.CONFIRM_PREFIX}${id}`;
}
function cancelId(id: string): string {
  return `${VC_BULK_CONFIRM.CANCEL_PREFIX}${id}`;
}

/** 確認待ちセッションを seed するためのコマンド interaction */
function seedSession(
  id: string,
  session: Record<string, unknown>,
  memberIds: string[],
) {
  const cmdInteraction = {
    id,
    locale: "ja",
    reply: vi.fn().mockResolvedValue(undefined),
  };
  return presentBulkConfirm(
    cmdInteraction as never,
    session as never,
    memberIds,
  );
}

/** 切断対象メンバーを持つ VoiceChannel モックを作る */
function makeSourceChannel(memberIds: string[]) {
  const disconnect = vi.fn().mockResolvedValue(undefined);
  const setChannel = vi.fn().mockResolvedValue(undefined);
  const members = new Map(
    memberIds.map((mid) => [
      mid,
      { id: mid, voice: { disconnect, setChannel } },
    ]),
  );
  return {
    channel: { id: "ch-1", type: GUILD_VOICE, members },
    disconnect,
    setChannel,
  };
}

function makeButtonInteraction(customId: string, sourceChannel: unknown) {
  return {
    customId,
    locale: "ja",
    guild: {
      channels: { fetch: vi.fn().mockResolvedValue(sourceChannel) },
    },
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

describe("bot/shared/vcBulkAction", () => {
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

  it("confirm: 実行時点で対象VC全員を切断し public で結果を返す", async () => {
    await seedSession(
      "cmd-1",
      {
        action: "disconnect",
        guildId: "guild-1",
        invokerId: "inv-1",
        locale: "ja",
        sourceChannelId: "ch-1",
      },
      ["m-1", "m-2"],
    );
    const { channel, disconnect } = makeSourceChannel(["m-1", "m-2"]);
    const interaction = makeButtonInteraction(confirmId("cmd-1"), channel);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledTimes(2);
    expect(disconnect).toHaveBeenCalledWith("audit-reason");
    // ephemeral 確認ダイアログのボタンを除去
    expect(interaction.editReply).toHaveBeenCalledWith({ components: [] });
    // 結果は public（followUp）で送信
    expect(interaction.followUp).toHaveBeenCalledWith({
      embeds: [{ description: "action-log" }],
    });
  });

  it("confirm: move の場合は移動先へ setChannel する", async () => {
    await seedSession(
      "cmd-move",
      {
        action: "move",
        guildId: "guild-1",
        invokerId: "inv-1",
        locale: "ja",
        sourceChannelId: "ch-1",
        destinationChannelId: "dest-1",
      },
      ["m-1"],
    );
    const { channel, setChannel } = makeSourceChannel(["m-1"]);
    const interaction = makeButtonInteraction(confirmId("cmd-move"), channel);
    // 移動先VCも GuildVoice を返す
    interaction.guild.channels.fetch = vi.fn((id: string) =>
      Promise.resolve(
        id === "dest-1"
          ? { id: "dest-1", type: GUILD_VOICE, members: new Map() }
          : channel,
      ),
    );

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(setChannel).toHaveBeenCalledTimes(1);
    expect(interaction.followUp).toHaveBeenCalledTimes(1);
  });

  it("cancel: キャンセル応答を ephemeral で返し、処理しない", async () => {
    await seedSession(
      "cmd-2",
      {
        action: "disconnect",
        guildId: "guild-1",
        invokerId: "inv-1",
        locale: "ja",
        sourceChannelId: "ch-1",
      },
      ["m-1", "m-2"],
    );
    const { channel, disconnect } = makeSourceChannel(["m-1"]);
    const interaction = makeButtonInteraction(cancelId("cmd-2"), channel);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(disconnect).not.toHaveBeenCalled();
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

  it("実行時点で対象VCが空なら no-op エラーを返し public 送信しない", async () => {
    await seedSession(
      "cmd-3",
      {
        action: "disconnect",
        guildId: "guild-1",
        invokerId: "inv-1",
        locale: "ja",
        sourceChannelId: "ch-1",
      },
      ["m-1", "m-2"],
    );
    // 実行時点ではメンバー0人
    const { channel } = makeSourceChannel([]);
    const interaction = makeButtonInteraction(confirmId("cmd-3"), channel);

    await vcBulkActionButtonHandler.execute(interaction as never);

    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ components: [] }),
    );
    expect(interaction.followUp).not.toHaveBeenCalled();
  });
});
