// tests/integration/bot/features/bump-reminder/services/bumpReminderService.integration.test.ts
/**
 * BumpReminderManager Integration Tests
 * Bumpリマインダータイマー管理の統合テスト
 */

import { BumpReminderManager } from "@/bot/features/bump-reminder/services/bumpReminderService";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";

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

// Prismaユーティリティのモック
vi.mock("@/shared/utils/prisma", () => ({
  requirePrismaClient: vi.fn(() => ({})),
}));

// Repositoryのモック
const mockRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  findPendingByGuildAndService: vi.fn(),
  findAllPending: vi.fn(),
  updateStatus: vi.fn(),
  delete: vi.fn(),
  cancelByGuild: vi.fn(),
  cleanupOld: vi.fn(),
};

vi.mock(
  "@/bot/features/bump-reminder/repositories/bumpReminderRepository",
  () => ({
    getBumpReminderRepository: () => mockRepository,
  }),
);

describe("BumpReminderManager Integration", () => {
  // DB連携とJobScheduler連携を含むリマインダー運用フローを検証
  let manager: BumpReminderManager;
  const fixedNow = new Date("2026-02-20T00:00:00.000Z");

  // テストごとにManagerとScheduler状態を初期化
  beforeEach(() => {
    // 時刻依存を固定してテストの再現性を担保
    vi.useFakeTimers();
    vi.setSystemTime(fixedNow);

    manager = new BumpReminderManager(mockRepository as never);
    vi.clearAllMocks();

    // すべてのジョブをクリア
    jobScheduler.stopAll();
  });

  afterEach(() => {
    // 後片付けとしてスケジュール済みジョブを全停止
    jobScheduler.stopAll();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe("setReminder()", () => {
    it("DB にリマインダーを保存してジョブをスケジュールできること", async () => {
      // DB保存とジョブ登録が1セットで行われること
      const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockReminder = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: "msg-789",
        panelMessageId: null,
        scheduledAt,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockReminder);
      const mockTask = vi.fn();

      await manager.setReminder(
        "guild-123",
        "channel-456",
        "msg-789",
        undefined,
        120,
        mockTask,
      );

      // DBへの保存を確認
      expect(mockRepository.create).toHaveBeenCalledWith(
        "guild-123",
        "channel-456",
        expect.any(Date),
        "msg-789",
        undefined,
        undefined,
      );

      // ジョブがスケジュールされたことを確認
      expect(jobScheduler.hasJob("bump-reminder-guild-123")).toBe(true);
    });

    it("messageId 未指定でリマインダーを作成できること", async () => {
      // messageId 未指定（null相当）パターン
      const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockReminder = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: null,
        panelMessageId: null,
        scheduledAt,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockReminder);

      await manager.setReminder(
        "guild-123",
        "channel-456",
        undefined,
        undefined,
        120,
        vi.fn(),
      );

      expect(mockRepository.create).toHaveBeenCalledWith(
        "guild-123",
        "channel-456",
        expect.any(Date),
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe("cancelReminder()", () => {
    it("登録済みのリマインダーをキャンセルできること", async () => {
      // 先に登録してからキャンセル動作を確認
      const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockReminder = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: null,
        panelMessageId: null,
        scheduledAt,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockReminder);

      // リマインダー設定
      await manager.setReminder(
        "guild-123",
        "channel-456",
        undefined,
        undefined,
        120,
        vi.fn(),
      );

      // ジョブが存在することを確認
      expect(jobScheduler.hasJob("bump-reminder-guild-123")).toBe(true);

      // キャンセル
      const result = await manager.cancelReminder("guild-123");

      expect(result).toBe(true);
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        "reminder-1",
        "cancelled",
      );
      // ジョブが削除されたことを確認
      expect(jobScheduler.hasJob("bump-reminder-guild-123")).toBe(false);
    });

    it("リマインダーが存在しない場合は false を返すこと", async () => {
      const result = await manager.cancelReminder("nonexistent-guild");
      expect(result).toBe(false);
    });
  });

  describe("hasReminder()", () => {
    it("リマインダーが存在する場合は true を返すこと", async () => {
      const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockReminder = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: null,
        panelMessageId: null,
        scheduledAt,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValue(mockReminder);

      await manager.setReminder(
        "guild-123",
        "channel-456",
        undefined,
        undefined,
        120,
        vi.fn(),
      );

      expect(manager.hasReminder("guild-123")).toBe(true);
    });

    it("リマインダーが未登録の場合は hasReminder が false を返すこと", () => {
      expect(manager.hasReminder("nonexistent-guild")).toBe(false);
    });
  });

  describe("restorePendingReminders()", () => {
    it("DB の未来時刻 pending リマインダーをジョブとして復元できること", async () => {
      // 未来時刻の pending はジョブとして再登録される
      const futureDate = new Date(Date.now() + 30 * 60 * 1000); // 30分後
      const mockReminders = [
        {
          id: "reminder-1",
          guildId: "guild-123",
          channelId: "channel-456",
          messageId: "msg-789",
          panelMessageId: null,
          scheduledAt: futureDate,
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findAllPending.mockResolvedValue(mockReminders);
      mockRepository.create.mockResolvedValue(mockReminders[0]);

      const taskFactory = vi.fn(() => vi.fn());
      const result = await manager.restorePendingReminders(taskFactory);

      expect(result).toBe(1);
      expect(taskFactory).toHaveBeenCalledWith(
        "guild-123",
        "channel-456",
        "msg-789",
        undefined,
        undefined,
      );
    });

    it("期限超過の pending リマインダーを復元時に即時実行すること", async () => {
      // 期限超過分は復元時に即時実行される
      const pastDate = new Date(Date.now() - 10 * 60 * 1000); // 10分前
      const mockReminders = [
        {
          id: "reminder-1",
          guildId: "guild-123",
          channelId: "channel-456",
          messageId: null,
          panelMessageId: null,
          scheduledAt: pastDate,
          status: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockRepository.findAllPending.mockResolvedValue(mockReminders);

      const mockTask = vi.fn().mockResolvedValue(undefined);
      const taskFactory = vi.fn(() => mockTask);
      const result = await manager.restorePendingReminders(taskFactory);

      // 即座に実行されたので復元数は1
      expect(result).toBe(1);
      expect(mockTask).toHaveBeenCalled();
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        "reminder-1",
        "sent",
      );
    });

    it("pending リマインダーが空の場合は0を返すこと", async () => {
      mockRepository.findAllPending.mockResolvedValue([]);

      const taskFactory = vi.fn();
      const result = await manager.restorePendingReminders(taskFactory);

      expect(result).toBe(0);
      expect(taskFactory).not.toHaveBeenCalled();
    });
  });

  describe("clearAll()", () => {
    it("全リマインダーを一括でクリアできること", async () => {
      // 複数ギルド分のジョブが一括でクリアされること
      const scheduledAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const mockReminder1 = {
        id: "reminder-1",
        guildId: "guild-123",
        channelId: "channel-456",
        messageId: null,
        panelMessageId: null,
        scheduledAt,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockReminder2 = {
        id: "reminder-2",
        guildId: "guild-456",
        channelId: "channel-789",
        messageId: null,
        panelMessageId: null,
        scheduledAt,
        status: "pending" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRepository.create.mockResolvedValueOnce(mockReminder1);
      mockRepository.create.mockResolvedValueOnce(mockReminder2);

      // 複数のリマインダー設定
      await manager.setReminder(
        "guild-123",
        "channel-456",
        undefined,
        undefined,
        120,
        vi.fn(),
      );
      await manager.setReminder(
        "guild-456",
        "channel-789",
        undefined,
        undefined,
        120,
        vi.fn(),
      );

      // 両方存在することを確認
      expect(manager.hasReminder("guild-123")).toBe(true);
      expect(manager.hasReminder("guild-456")).toBe(true);

      await manager.clearAll();

      // 両方削除されたことを確認
      expect(manager.hasReminder("guild-123")).toBe(false);
      expect(manager.hasReminder("guild-456")).toBe(false);
    });
  });
});
