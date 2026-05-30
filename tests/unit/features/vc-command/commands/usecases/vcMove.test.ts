// tests/unit/features/vc-command/commands/usecases/vcMove.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { ChannelType } from "discord.js";
import { executeVcMove } from "@/features/vc-command/commands/usecases/vcMove";

const resolveVcActionTargetMock = vi.fn();
const fetchMemberInVoiceMock = vi.fn();
const fetchNonEmptyVoiceChannelMock = vi.fn();
const presentBulkConfirmMock = vi.fn().mockResolvedValue(undefined);
const formatActionLogMock = vi.fn((..._a: unknown[]) => ({
  description: "log",
}));
const resolveAuditReasonMock = vi.fn((..._a: unknown[]) => "audit-reason");
const loggerInfoMock = vi.fn();

vi.mock("@/bot/shared/vcActionTarget", () => ({
  resolveVcActionTarget: (...a: unknown[]) => resolveVcActionTargetMock(...a),
  fetchMemberInVoice: (...a: unknown[]) => fetchMemberInVoiceMock(...a),
  fetchNonEmptyVoiceChannel: (...a: unknown[]) =>
    fetchNonEmptyVoiceChannelMock(...a),
}));

vi.mock("@/bot/shared/vcActionLog", () => ({
  formatActionLog: (...a: unknown[]) => formatActionLogMock(...a),
  resolveAuditReason: (...a: unknown[]) => resolveAuditReasonMock(...a),
}));

vi.mock("@/bot/shared/vcBulkAction", () => ({
  presentBulkConfirm: (...a: unknown[]) => presentBulkConfirmMock(...a),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logCommand: (commandName: string, key: string) => `[${commandName}] ${key}`,
  tInteraction: (_l: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { info: (...a: unknown[]) => loggerInfoMock(...a) },
}));

const GUILD_VOICE = ChannelType.GuildVoice;

function createInteraction(toChannel: unknown) {
  const fetchChannelMock = vi.fn().mockResolvedValue({
    id: "dest-1",
    type: GUILD_VOICE,
  });
  return {
    locale: "ja",
    user: { id: "inv-1" },
    options: {
      getString: vi.fn(() => null),
      getChannel: vi.fn(() => toChannel),
    },
    guild: { channels: { fetch: fetchChannelMock } },
    reply: vi.fn().mockResolvedValue(undefined),
    fetchChannelMock,
  };
}

describe("features/vc-command/usecases/vcMove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuditReasonMock.mockReturnValue("audit-reason");
    formatActionLogMock.mockReturnValue({ description: "log" });
  });

  it("to が VC でない場合は ValidationError を投げる", async () => {
    const interaction = createInteraction({ id: "dest-1", type: 0 });

    await expect(
      executeVcMove(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("target 未指定（none）の場合は ValidationError を投げる", async () => {
    resolveVcActionTargetMock.mockReturnValue({ kind: "none" });
    const interaction = createInteraction({ id: "dest-1", type: GUILD_VOICE });

    await expect(
      executeVcMove(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("target=member: 個別移動し public で formatActionLog Embed を返す", async () => {
    resolveVcActionTargetMock.mockReturnValue({
      kind: "member",
      userId: "tgt-1",
    });
    const setChannelMock = vi.fn().mockResolvedValue(undefined);
    fetchMemberInVoiceMock.mockResolvedValue({
      voice: { setChannel: setChannelMock },
    });
    const interaction = createInteraction({ id: "dest-1", type: GUILD_VOICE });

    await executeVcMove(interaction as never, "guild-1");

    expect(setChannelMock).toHaveBeenCalledTimes(1);
    expect(formatActionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "move",
        targetUserId: "tgt-1",
        destinationChannelId: "dest-1",
      }),
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "log" }],
    });
  });

  it("target=channel かつ移動元と移動先が同一の場合は ValidationError を投げる", async () => {
    resolveVcActionTargetMock.mockReturnValue({
      kind: "channel",
      channelId: "dest-1",
    });
    const interaction = createInteraction({ id: "dest-1", type: GUILD_VOICE });

    await expect(
      executeVcMove(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(presentBulkConfirmMock).not.toHaveBeenCalled();
  });

  it("target=channel: 確認ダイアログを移動先つきで表示する", async () => {
    resolveVcActionTargetMock.mockReturnValue({
      kind: "channel",
      channelId: "ch-1",
    });
    fetchNonEmptyVoiceChannelMock.mockResolvedValue({
      id: "ch-1",
      members: new Map([
        ["u-1", { id: "u-1" }],
        ["u-2", { id: "u-2" }],
      ]),
    });
    const interaction = createInteraction({ id: "dest-1", type: GUILD_VOICE });

    await executeVcMove(interaction as never, "guild-1");

    expect(presentBulkConfirmMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        action: "move",
        sourceChannelId: "ch-1",
        destinationChannelId: "dest-1",
      }),
      ["u-1", "u-2"],
    );
  });
});
