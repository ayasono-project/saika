import { deleteBumpPanelMessage } from "@/features/bump-reminder/handlers/usecases/deleteBumpPanel";

const loggerDebugMock = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: (...args: unknown[]) => loggerDebugMock(...args),
  },
}));

/**
 * パネルメッセージを持つテキストチャンネルと、それを返すクライアントのモックを作る
 * @param overrides チャンネル取得・メッセージ取得・削除の差し替え
 * @returns クライアント・チャンネル・削除関数のモック
 */
function createClientWithPanel(
  overrides: {
    channelsFetch?: ReturnType<typeof vi.fn>;
    messagesFetch?: ReturnType<typeof vi.fn>;
    deleteMessage?: ReturnType<typeof vi.fn>;
    isTextBased?: boolean;
  } = {},
) {
  const deleteMessage =
    overrides.deleteMessage ?? vi.fn().mockResolvedValue(undefined);
  const channel = {
    isTextBased: () => overrides.isTextBased ?? true,
    messages: {
      fetch:
        overrides.messagesFetch ??
        vi.fn().mockResolvedValue({ delete: deleteMessage }),
    },
  };
  const client = {
    channels: {
      fetch: overrides.channelsFetch ?? vi.fn().mockResolvedValue(channel),
    },
  };
  return { client, channel, deleteMessage };
}

// パネル削除の共通関数が、無い・消せない場合も呼び出し元を止めずに終わることを検証
describe("features/bump-reminder/handlers/usecases/deleteBumpPanel", () => {
  // ケースごとにログの呼び出し記録を消す
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("パネルのチャンネルからメッセージを取得して削除し、削除ログを残す", async () => {
    const { client, channel, deleteMessage } = createClientWithPanel();

    await deleteBumpPanelMessage(client as never, "ch-1", "panel-1", "g-1");

    expect(client.channels.fetch).toHaveBeenCalledWith("ch-1");
    expect(channel.messages.fetch).toHaveBeenCalledWith("panel-1");
    expect(deleteMessage).toHaveBeenCalledTimes(1);
    expect(loggerDebugMock).toHaveBeenCalledWith(
      expect.stringContaining("bumpReminder:log.scheduler_panel_deleted"),
    );
  });

  it.each([null, undefined])(
    "panelMessageId が %s の場合はチャンネルを取得しない",
    async (panelMessageId) => {
      const { client } = createClientWithPanel();

      await deleteBumpPanelMessage(
        client as never,
        "ch-1",
        panelMessageId,
        "g-1",
      );

      expect(client.channels.fetch).not.toHaveBeenCalled();
    },
  );

  it("チャンネルの取得に失敗した場合は何もせず終わる", async () => {
    const { client, channel } = createClientWithPanel({
      channelsFetch: vi.fn().mockRejectedValue(new Error("Unknown Channel")),
    });

    await expect(
      deleteBumpPanelMessage(client as never, "ch-1", "panel-1", "g-1"),
    ).resolves.toBeUndefined();
    expect(channel.messages.fetch).not.toHaveBeenCalled();
  });

  it("テキストチャンネルでない場合はメッセージを取得しない", async () => {
    const { client, channel } = createClientWithPanel({ isTextBased: false });

    await deleteBumpPanelMessage(client as never, "ch-1", "panel-1", "g-1");

    expect(channel.messages.fetch).not.toHaveBeenCalled();
  });

  it("メッセージが既に無い場合は削除しない", async () => {
    const { client, deleteMessage } = createClientWithPanel({
      messagesFetch: vi.fn().mockRejectedValue(new Error("Unknown Message")),
    });

    await deleteBumpPanelMessage(client as never, "ch-1", "panel-1", "g-1");

    expect(deleteMessage).not.toHaveBeenCalled();
  });

  it("削除に失敗しても例外を投げず、ギルドIDとパネルIDを付けて失敗ログを残す", async () => {
    const { client } = createClientWithPanel({
      deleteMessage: vi.fn().mockRejectedValue(new Error("Missing Access")),
    });

    await expect(
      deleteBumpPanelMessage(client as never, "ch-1", "panel-1", "g-1"),
    ).resolves.toBeUndefined();
    expect(loggerDebugMock).toHaveBeenCalledWith(
      `[system:log_prefix.bump_reminder] bumpReminder:log.scheduler_panel_delete_failed:${JSON.stringify({ panelMessageId: "panel-1", guildId: "g-1" })}`,
      expect.any(Error),
    );
  });
});
