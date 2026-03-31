// tests/integration/bot/features/bump-reminder/repositories/bumpReminderRepository.integration.test.ts
/**
 * BumpReminderRepository Integration Tests
 * Bumpリマインダー永続化の統合テスト
 */

import {
  BumpReminderRepository,
  getBumpReminderRepository,
} from "@/bot/features/bump-reminder/repositories/bumpReminderRepository";
import { DatabaseError } from "@/shared/errors/customErrors";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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
  tDefault: (key: string) => `mocked:${key}`,
  tInteraction: (...args: unknown[]) => args[1],
}));

// Prismaクライアントのモック
const mockPrismaClient = {
  $transaction: vi.fn(),
  bumpReminder: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
};

describe("BumpReminderRepository", () => {
  // 永続化CRUDとステータス遷移、例外ラップを統合的に検証
  let repository: BumpReminderRepository;
  const baseTime = new Date("2026-02-20T00:00:00.000Z");

  // 基準時刻からの差分で日時を作るヘルパー
  const atOffsetMs = (offsetMs: number): Date =>
    new Date(baseTime.getTime() + offsetMs);

  // テストごとにリポジトリとモック状態を初期化
  beforeEach(() => {
    // @ts-expect-error - モックのため型エラーは無視
    repository = new BumpReminderRepository(mockPrismaClient);
    vi.clearAllMocks();
    // $transaction はコールバックを mockPrismaClient に委譲する
    mockPrismaClient.$transaction.mockImplementation(
      (callback: (tx: typeof mockPrismaClient) => Promise<unknown>) =>
        callback(mockPrismaClient),
    );
  });

  describe("create()", () => {
    it("新規バンプリマインダーを作成できること", async () => {
      // 新規作成前に既存 pending を cancelled へ更新してから作成する
      const scheduledAt = atOffsetMs(2 * 60 * 60 * 1000);
      const mockReminder = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: "msg-789",
        scheduledAt,
        status: "pending",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      };

      mockPrismaClient.bumpReminder.updateMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaClient.bumpReminder.create.mockResolvedValue(mockReminder);

      const result = await repository.create(
        "guild-123",
        "channel-456",
        scheduledAt,
        "msg-789",
      );

      expect(result).toEqual(mockReminder);
      expect(mockPrismaClient.bumpReminder.updateMany).toHaveBeenCalledWith({
        where: {
          guildId: "guild-123",
          status: "pending",
          serviceName: null,
        },
        data: { status: "cancelled" },
      });
      expect(mockPrismaClient.bumpReminder.create).toHaveBeenCalledWith({
        data: {
          guildId: "guild-123",
          channelId: "channel-456",
          messageId: "msg-789",
          scheduledAt,
          status: "pending",
        },
      });
    });

    it("messageId 未指定でもリマインダーを作成できること", async () => {
      // messageId が未指定でも作成できること
      const scheduledAt = atOffsetMs(2 * 60 * 60 * 1000);
      const mockReminder = {
        id: "reminder-2",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: null,
        scheduledAt,
        status: "pending",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      };

      mockPrismaClient.bumpReminder.updateMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaClient.bumpReminder.create.mockResolvedValue(mockReminder);

      const result = await repository.create(
        "guild-123",
        "channel-456",
        scheduledAt,
      );

      expect(result.messageId).toBeNull();
    });

    it("作成失敗時に DatabaseError をスローすること", async () => {
      const scheduledAt = atOffsetMs(0);
      mockPrismaClient.bumpReminder.updateMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaClient.bumpReminder.create.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(
        repository.create("guild-123", "channel-456", scheduledAt),
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe("findById()", () => {
    it("ID でリマインダーを取得できること", async () => {
      const mockReminder = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: "msg-789",
        scheduledAt: atOffsetMs(10 * 60 * 1000),
        status: "pending",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      };

      mockPrismaClient.bumpReminder.findUnique.mockResolvedValue(mockReminder);

      const result = await repository.findById("reminder-1");

      expect(result).toEqual(mockReminder);
      expect(mockPrismaClient.bumpReminder.findUnique).toHaveBeenCalledWith({
        where: { id: "reminder-1" },
      });
    });

    it("存在しない ID の場合は null を返すこと", async () => {
      // 未存在IDの場合は null を返す
      mockPrismaClient.bumpReminder.findUnique.mockResolvedValue(null);

      const result = await repository.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("取得失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.findUnique.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(repository.findById("reminder-1")).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("findPendingByGuildAndService()", () => {
    it("ギルド+サービスの pending リマインダーを返すこと", async () => {
      const mockReminder = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: "msg-789",
        serviceName: "Disboard",
        scheduledAt: atOffsetMs(10 * 60 * 1000),
        status: "pending",
        createdAt: atOffsetMs(0),
        updatedAt: atOffsetMs(0),
      };

      mockPrismaClient.bumpReminder.findFirst.mockResolvedValue(mockReminder);

      const result = await repository.findPendingByGuildAndService(
        "guild-123",
        "Disboard",
      );

      expect(result).toEqual(mockReminder);
      expect(mockPrismaClient.bumpReminder.findFirst).toHaveBeenCalledWith({
        where: {
          guildId: "guild-123",
          serviceName: "Disboard",
          status: "pending",
        },
        orderBy: { scheduledAt: "asc" },
      });
    });

    it("pending リマインダーがない場合は null を返すこと", async () => {
      mockPrismaClient.bumpReminder.findFirst.mockResolvedValue(null);

      const result = await repository.findPendingByGuildAndService(
        "guild-123",
        "Disboard",
      );

      expect(result).toBeNull();
    });

    it("findPendingByGuildAndService 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.findFirst.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(
        repository.findPendingByGuildAndService("guild-123", "Disboard"),
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe("findAllPending()", () => {
    it("全 pending リマインダーを返すこと", async () => {
      const mockReminders = [
        {
          id: "reminder-1",
          guildId: "guild-123",
          channelId: "channel-456",
          messageId: "msg-789",
          scheduledAt: atOffsetMs(10 * 60 * 1000),
          status: "pending",
          createdAt: atOffsetMs(0),
          updatedAt: atOffsetMs(0),
        },
        {
          id: "reminder-2",
          guildId: "guild-456",
          channelId: "channel-789",
          messageId: null,
          scheduledAt: atOffsetMs(20 * 60 * 1000),
          status: "pending",
          createdAt: atOffsetMs(0),
          updatedAt: atOffsetMs(0),
        },
      ];

      mockPrismaClient.bumpReminder.findMany.mockResolvedValue(mockReminders);

      const result = await repository.findAllPending();

      expect(result).toHaveLength(2);
      expect(result).toEqual(mockReminders);
      expect(mockPrismaClient.bumpReminder.findMany).toHaveBeenCalledWith({
        where: { status: "pending" },
        orderBy: { scheduledAt: "asc" },
      });
    });

    it("pending が0件の場合は空配列を返すこと", async () => {
      // pending が0件なら空配列
      mockPrismaClient.bumpReminder.findMany.mockResolvedValue([]);

      const result = await repository.findAllPending();

      expect(result).toEqual([]);
    });

    it("findAllPending 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.findMany.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(repository.findAllPending()).rejects.toThrow(DatabaseError);
    });
  });

  describe("updateStatus()", () => {
    it("リマインダーのステータスを sent に更新できること", async () => {
      mockPrismaClient.bumpReminder.update.mockResolvedValue({
        id: "reminder-1",
        status: "sent",
      });

      await repository.updateStatus("reminder-1", "sent");

      expect(mockPrismaClient.bumpReminder.update).toHaveBeenCalledWith({
        where: { id: "reminder-1" },
        data: { status: "sent" },
      });
    });

    it("リマインダーのステータスを cancelled に更新できること", async () => {
      mockPrismaClient.bumpReminder.update.mockResolvedValue({
        id: "reminder-1",
        status: "cancelled",
      });

      await repository.updateStatus("reminder-1", "cancelled");

      expect(mockPrismaClient.bumpReminder.update).toHaveBeenCalledWith({
        where: { id: "reminder-1" },
        data: { status: "cancelled" },
      });
    });

    it("updateStatus 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.update.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(
        repository.updateStatus("reminder-1", "sent"),
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe("delete()", () => {
    it("リマインダーを削除できること", async () => {
      mockPrismaClient.bumpReminder.delete.mockResolvedValue({
        id: "reminder-1",
      });

      await repository.delete("reminder-1");

      expect(mockPrismaClient.bumpReminder.delete).toHaveBeenCalledWith({
        where: { id: "reminder-1" },
      });
    });

    it("delete 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.delete.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(repository.delete("reminder-1")).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("cancelByGuild()", () => {
    it("ギルドの全 pending リマインダーをキャンセルできること", async () => {
      mockPrismaClient.bumpReminder.updateMany.mockResolvedValue({ count: 2 });

      await repository.cancelByGuild("guild-123");

      expect(mockPrismaClient.bumpReminder.updateMany).toHaveBeenCalledWith({
        where: { guildId: "guild-123", status: "pending" },
        data: { status: "cancelled" },
      });
    });

    it("cancelByGuild 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.updateMany.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(repository.cancelByGuild("guild-123")).rejects.toThrow(
        DatabaseError,
      );
    });
  });

  describe("cancelByGuildAndChannel()", () => {
    it("ギルドとチャンネルの全 pending リマインダーをキャンセルできること", async () => {
      mockPrismaClient.bumpReminder.updateMany.mockResolvedValue({ count: 1 });

      await repository.cancelByGuildAndChannel("guild-123", "channel-456");

      expect(mockPrismaClient.bumpReminder.updateMany).toHaveBeenCalledWith({
        where: {
          guildId: "guild-123",
          channelId: "channel-456",
          status: "pending",
        },
        data: { status: "cancelled" },
      });
    });

    it("cancelByGuildAndChannel 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.updateMany.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(
        repository.cancelByGuildAndChannel("guild-123", "channel-456"),
      ).rejects.toThrow(DatabaseError);
    });
  });

  describe("cleanupOld()", () => {
    it("古い sent/cancelled リマインダーを削除できること", async () => {
      // 古い sent/cancelled レコードのみを削除対象にする
      mockPrismaClient.bumpReminder.deleteMany.mockResolvedValue({ count: 5 });

      const result = await repository.cleanupOld(7);

      expect(result).toBe(5);
      expect(mockPrismaClient.bumpReminder.deleteMany).toHaveBeenCalled();
      const callArgs =
        mockPrismaClient.bumpReminder.deleteMany.mock.calls[0][0];
      expect(callArgs.where.status.in).toEqual(["sent", "cancelled"]);
    });

    it("引数未指定時は既定の7日間を使用すること", async () => {
      // 引数未指定時は既定の保持日数を使用
      mockPrismaClient.bumpReminder.deleteMany.mockResolvedValue({ count: 3 });

      const result = await repository.cleanupOld();

      expect(result).toBe(3);
    });

    it("cleanupOld 失敗時に DatabaseError をスローすること", async () => {
      mockPrismaClient.bumpReminder.deleteMany.mockRejectedValue(
        new Error("DB error"),
      );

      await expect(repository.cleanupOld()).rejects.toThrow(DatabaseError);
    });
  });

  describe("getBumpReminderRepository()", () => {
    it("同じ prisma クライアントに対して同一インスタンスを返すこと", () => {
      const first = getBumpReminderRepository(mockPrismaClient as never);
      const second = getBumpReminderRepository(mockPrismaClient as never);

      expect(second).toBe(first);
    });

    it("prisma クライアントが変わった場合は新規インスタンスを生成すること", () => {
      const first = getBumpReminderRepository(mockPrismaClient as never);
      const anotherPrisma = {
        ...mockPrismaClient,
        bumpReminder: { ...mockPrismaClient.bumpReminder },
      };

      const second = getBumpReminderRepository(anotherPrisma as never);

      expect(second).not.toBe(first);
    });
  });
});
