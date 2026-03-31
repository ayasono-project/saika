// tests/unit/bot/features/sticky-message/handlers/stickyMessageChannelDeleteHandler.test.ts

import { ChannelType } from "discord.js";
import { handleStickyMessageChannelDelete } from "@/bot/features/sticky-message/handlers/stickyMessageChannelDeleteHandler";

const { cancelTimerMock, deleteByChannelMock, debugMock } = vi.hoisted(() => ({
  cancelTimerMock: vi.fn(),
  deleteByChannelMock: vi.fn(),
  debugMock: vi.fn(),
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageResendService: vi.fn(() => ({
    cancelTimer: cancelTimerMock,
  })),
  getBotStickyMessageConfigService: vi.fn(() => ({
    deleteByChannel: deleteByChannelMock,
  })),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: debugMock, error: vi.fn() },
}));

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
}));

describe("bot/features/sticky-message/handlers/stickyMessageChannelDeleteHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GuildText チャンネル削除時にタイマーをキャンセルし DB レコードを削除する", async () => {
    deleteByChannelMock.mockResolvedValue(0);
    const channel = { id: "ch-1", type: ChannelType.GuildText };

    await handleStickyMessageChannelDelete(channel as never);

    expect(cancelTimerMock).toHaveBeenCalledWith("ch-1");
    expect(deleteByChannelMock).toHaveBeenCalledWith("ch-1");
  });

  it("レコードが実際に削除された場合に debug ログを出力する", async () => {
    deleteByChannelMock.mockResolvedValue(1);
    const channel = { id: "ch-1", type: ChannelType.GuildText };

    await handleStickyMessageChannelDelete(channel as never);

    expect(debugMock).toHaveBeenCalledTimes(1);
  });

  it("レコードが削除されなかった場合はログを出力しない", async () => {
    deleteByChannelMock.mockResolvedValue(0);
    const channel = { id: "ch-1", type: ChannelType.GuildText };

    await handleStickyMessageChannelDelete(channel as never);

    expect(debugMock).not.toHaveBeenCalled();
  });

  it("テキスト以外のチャンネル（例: GuildVoice）はスキップする", async () => {
    const channel = { id: "vc-1", type: ChannelType.GuildVoice };

    await handleStickyMessageChannelDelete(channel as never);

    expect(cancelTimerMock).not.toHaveBeenCalled();
    expect(deleteByChannelMock).not.toHaveBeenCalled();
  });

  it("DB エラーが発生しても外部に再スローしない", async () => {
    deleteByChannelMock.mockRejectedValueOnce(new Error("db error"));
    const channel = {
      id: "ch-2",
      type: ChannelType.GuildText,
      guild: { id: "guild-1" },
    };

    // エラーが外に伝播しないこと
    await expect(
      handleStickyMessageChannelDelete(channel as never),
    ).resolves.toBeUndefined();

    expect(cancelTimerMock).toHaveBeenCalledWith("ch-2");
  });
});
