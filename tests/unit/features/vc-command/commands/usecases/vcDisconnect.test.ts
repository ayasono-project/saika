// tests/unit/features/vc-command/commands/usecases/vcDisconnect.test.ts

import { ValidationError } from "@ayasono/shared/core";
import { executeVcDisconnect } from "@/features/vc-command/commands/usecases/vcDisconnect";

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

function createInteraction() {
  return {
    locale: "ja",
    user: { id: "inv-1" },
    options: { getString: vi.fn((): string | null => null) },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe("features/vc-command/usecases/vcDisconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveAuditReasonMock.mockReturnValue("audit-reason");
    formatActionLogMock.mockReturnValue({ description: "log" });
  });

  it("target 未指定（none）の場合は ValidationError を投げる", async () => {
    resolveVcActionTargetMock.mockReturnValue({ kind: "none" });
    const interaction = createInteraction();

    await expect(
      executeVcDisconnect(interaction as never, "guild-1"),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("target=member: 個別切断し public で formatActionLog Embed を返す", async () => {
    resolveVcActionTargetMock.mockReturnValue({
      kind: "member",
      userId: "tgt-1",
    });
    const disconnectMock = vi.fn().mockResolvedValue(undefined);
    fetchMemberInVoiceMock.mockResolvedValue({
      voice: { disconnect: disconnectMock },
    });
    const interaction = createInteraction();
    interaction.options.getString = vi.fn(() => "荒らし");

    await executeVcDisconnect(interaction as never, "guild-1");

    expect(disconnectMock).toHaveBeenCalledWith("audit-reason");
    expect(resolveAuditReasonMock).toHaveBeenCalledWith(
      "disconnect",
      "ja",
      "荒らし",
    );
    expect(formatActionLogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "disconnect",
        invokerId: "inv-1",
        targetUserId: "tgt-1",
        reason: "荒らし",
      }),
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "log" }],
    });
    expect(presentBulkConfirmMock).not.toHaveBeenCalled();
    expect(loggerInfoMock).toHaveBeenCalledTimes(1);
  });

  it("target=channel: 確認ダイアログを受付時点の対象メンバーつきで表示する", async () => {
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
    const interaction = createInteraction();

    await executeVcDisconnect(interaction as never, "guild-1");

    expect(presentBulkConfirmMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        action: "disconnect",
        guildId: "guild-1",
        invokerId: "inv-1",
        sourceChannelId: "ch-1",
      }),
      ["u-1", "u-2"],
    );
    expect(interaction.reply).not.toHaveBeenCalled();
  });
});
