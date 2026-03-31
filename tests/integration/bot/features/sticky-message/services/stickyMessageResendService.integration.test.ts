// tests/integration/bot/features/sticky-message/services/stickyMessageResendService.integration.test.ts
/**
 * StickyMessageResendService Integration Tests
 * ResendService → モックRepository の統合テスト
 * デバウンスタイマー、旧メッセージ削除→新メッセージ送信→DB更新のフルフローを検証する
 */

import type { Mocked } from "vitest";
import { StickyMessageResendService } from "@/bot/features/sticky-message/services/stickyMessageResendService";
import type {
  IStickyMessageRepository,
  StickyMessage,
} from "@/shared/database/types";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyErrorChannel: vi.fn(),
  notifyWarnChannel: vi.fn(),
}));

// i18n のモック
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
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

function createRepositoryMock(): Mocked<IStickyMessageRepository> {
  return {
    findByChannel: vi.fn(),
    findAllByGuild: vi.fn(),
    create: vi.fn(),
    updateLastMessageId: vi.fn(),
    updateContent: vi.fn(),
    delete: vi.fn(),
    deleteByChannel: vi.fn(),
  } as unknown as Mocked<IStickyMessageRepository>;
}

function createStickyMessage(
  overrides?: Partial<StickyMessage>,
): StickyMessage {
  return {
    id: "sticky-1",
    guildId: "guild-1",
    channelId: "ch-1",
    content: "This is a sticky message",
    embedData: null,
    updatedBy: null,
    lastMessageId: null,
    createdAt: new Date("2026-03-01"),
    updatedAt: new Date("2026-03-01"),
    ...overrides,
  };
}

function createChannel(channelId: string) {
  const sendMock = vi.fn().mockResolvedValue({ id: "new-msg-1" });
  const msgDeleteMock = vi.fn().mockResolvedValue(undefined);
  const msgFetchMock = vi.fn().mockResolvedValue({ delete: msgDeleteMock });

  return {
    channel: {
      id: channelId,
      send: sendMock,
      messages: {
        fetch: msgFetchMock,
      },
    },
    sendMock,
    msgDeleteMock,
    msgFetchMock,
  };
}

describe("StickyMessageResendService Integration", () => {
  // ResendService のデバウンス動作と Repository 連携を統合的に検証する

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("基本的な再送信フロー", () => {
    it("メッセージ作成後5秒のデバウンス後に再送信が行われること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const sticky = createStickyMessage();
      repository.findByChannel.mockResolvedValue(sticky);
      repository.updateLastMessageId.mockResolvedValue(undefined);

      const { channel, sendMock } = createChannel("ch-1");

      // handleMessageCreate はタイマーをセットするだけ
      await service.handleMessageCreate(channel as never, "guild-1");

      // 5秒未満では再送信されない
      await vi.advanceTimersByTimeAsync(4000);
      expect(sendMock).not.toHaveBeenCalled();

      // 5秒後に再送信される
      await vi.advanceTimersByTimeAsync(1000);
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(sendMock).toHaveBeenCalledWith({
        content: "This is a sticky message",
      });
      expect(repository.updateLastMessageId).toHaveBeenCalledWith(
        "sticky-1",
        "new-msg-1",
      );
    });

    it("前回のスティッキーメッセージがある場合は削除してから再送信すること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const sticky = createStickyMessage({ lastMessageId: "old-msg-1" });
      repository.findByChannel.mockResolvedValue(sticky);
      repository.updateLastMessageId.mockResolvedValue(undefined);

      const { channel, sendMock, msgDeleteMock, msgFetchMock } =
        createChannel("ch-1");

      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(5000);

      // 旧メッセージの取得→削除
      expect(msgFetchMock).toHaveBeenCalledWith("old-msg-1");
      expect(msgDeleteMock).toHaveBeenCalledTimes(1);
      // 新メッセージの送信
      expect(sendMock).toHaveBeenCalledTimes(1);
      // DB の lastMessageId を更新
      expect(repository.updateLastMessageId).toHaveBeenCalledWith(
        "sticky-1",
        "new-msg-1",
      );
    });

    it("Embed データが設定されている場合はEmbed形式で再送信すること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const embedData = JSON.stringify({
        title: "Sticky Title",
        description: "Sticky Description",
        color: 0xff0000,
      });
      const sticky = createStickyMessage({ embedData });
      repository.findByChannel.mockResolvedValue(sticky);
      repository.updateLastMessageId.mockResolvedValue(undefined);

      const { channel, sendMock } = createChannel("ch-1");

      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(5000);

      expect(sendMock).toHaveBeenCalledTimes(1);
      const payload = sendMock.mock.calls[0][0];
      // Embed 形式で送信されること
      expect(payload).toHaveProperty("embeds");
      expect(payload.embeds).toHaveLength(1);
    });
  });

  describe("デバウンス動作", () => {
    it("連続メッセージの場合は最後のメッセージから5秒後に1回だけ再送信すること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const sticky = createStickyMessage();
      repository.findByChannel.mockResolvedValue(sticky);
      repository.updateLastMessageId.mockResolvedValue(undefined);

      const { channel, sendMock } = createChannel("ch-1");

      // 3回連続でメッセージ作成
      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(2000);
      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(2000);
      await service.handleMessageCreate(channel as never, "guild-1");

      // 最後のメッセージから5秒後
      await vi.advanceTimersByTimeAsync(5000);

      // 1回だけ再送信
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    it("異なるチャンネルのデバウンスは独立して動作すること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const stickyA = createStickyMessage({
        id: "sticky-A",
        channelId: "ch-A",
      });
      const stickyB = createStickyMessage({
        id: "sticky-B",
        channelId: "ch-B",
      });
      repository.findByChannel
        .mockResolvedValueOnce(stickyA)
        .mockResolvedValueOnce(stickyB);
      repository.updateLastMessageId.mockResolvedValue(undefined);

      const chA = createChannel("ch-A");
      const chB = createChannel("ch-B");

      // ch-A にメッセージ
      await service.handleMessageCreate(chA.channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(3000);
      // ch-B にメッセージ
      await service.handleMessageCreate(chB.channel as never, "guild-1");

      // ch-A は5秒後に再送信
      await vi.advanceTimersByTimeAsync(2000);
      expect(chA.sendMock).toHaveBeenCalledTimes(1);
      expect(chB.sendMock).not.toHaveBeenCalled();

      // ch-B はさらに3秒後に再送信
      await vi.advanceTimersByTimeAsync(3000);
      expect(chB.sendMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("タイマーキャンセル", () => {
    it("cancelTimer でデバウンス中のタイマーをキャンセルできること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const { channel, sendMock } = createChannel("ch-1");

      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(3000);

      // タイマーをキャンセル
      service.cancelTimer("ch-1");

      // 5秒経過しても再送信されない
      await vi.advanceTimersByTimeAsync(5000);
      expect(sendMock).not.toHaveBeenCalled();
    });
  });

  describe("エラーハンドリング", () => {
    it("DBにスティッキーメッセージが存在しない場合は再送信しないこと", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      repository.findByChannel.mockResolvedValue(null);

      const { channel, sendMock } = createChannel("ch-1");

      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(5000);

      expect(sendMock).not.toHaveBeenCalled();
      expect(repository.updateLastMessageId).not.toHaveBeenCalled();
    });

    it("旧メッセージの削除が失敗しても新メッセージの送信は続行すること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const sticky = createStickyMessage({ lastMessageId: "old-msg-1" });
      repository.findByChannel.mockResolvedValue(sticky);
      repository.updateLastMessageId.mockResolvedValue(undefined);

      const { channel, sendMock, msgFetchMock } = createChannel("ch-1");
      // 旧メッセージの fetch が失敗
      msgFetchMock.mockRejectedValue(new Error("Message not found"));

      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(5000);

      // 旧メッセージ削除は失敗したが、新メッセージは送信される
      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(repository.updateLastMessageId).toHaveBeenCalledWith(
        "sticky-1",
        "new-msg-1",
      );
    });

    it("新メッセージの送信が失敗した場合はDB更新をスキップすること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const sticky = createStickyMessage();
      repository.findByChannel.mockResolvedValue(sticky);

      const { channel, sendMock } = createChannel("ch-1");
      sendMock.mockRejectedValue(new Error("Cannot send message"));

      await service.handleMessageCreate(channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(5000);

      expect(sendMock).toHaveBeenCalledTimes(1);
      expect(repository.updateLastMessageId).not.toHaveBeenCalled();
    });
  });

  describe("連続再送信フロー", () => {
    it("複数回のメッセージ作成サイクルで毎回正しく再送信されること", async () => {
      const repository = createRepositoryMock();
      const service = new StickyMessageResendService(repository);

      const sticky = createStickyMessage();
      repository.findByChannel.mockResolvedValue(sticky);
      repository.updateLastMessageId.mockResolvedValue(undefined);

      // 1回目のサイクル
      const ch1 = createChannel("ch-1");
      ch1.sendMock.mockResolvedValue({ id: "sent-1" });

      await service.handleMessageCreate(ch1.channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(5000);

      expect(ch1.sendMock).toHaveBeenCalledTimes(1);
      expect(repository.updateLastMessageId).toHaveBeenCalledWith(
        "sticky-1",
        "sent-1",
      );

      // 2回目のサイクル: lastMessageId が前回送信分に更新されている
      const stickyUpdated = createStickyMessage({ lastMessageId: "sent-1" });
      repository.findByChannel.mockResolvedValue(stickyUpdated);
      ch1.sendMock.mockResolvedValue({ id: "sent-2" });

      await service.handleMessageCreate(ch1.channel as never, "guild-1");
      await vi.advanceTimersByTimeAsync(5000);

      expect(ch1.sendMock).toHaveBeenCalledTimes(2);
      // 前回の送信メッセージを削除
      expect(ch1.msgFetchMock).toHaveBeenCalledWith("sent-1");
      // 新しい lastMessageId で更新
      expect(repository.updateLastMessageId).toHaveBeenCalledWith(
        "sticky-1",
        "sent-2",
      );
    });
  });
});
