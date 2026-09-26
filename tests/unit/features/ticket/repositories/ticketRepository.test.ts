// チケットリポジトリの保存時の変換（経過時間を列の上限に収める）のテスト

vi.mock("@/shared/utils/errorHandling", () => ({
  executeWithDatabaseError: async (fn: () => unknown) => fn(),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  tDefault: vi.fn((key: string) => key),
}));

import { TICKET_ELAPSED_DELETE_MS_MAX } from "@/features/ticket/commands/ticketCommand.constants";
import { TicketRepository } from "@/features/ticket/repositories/ticketRepository";

/**
 * create / update / deleteMany を持つ Prisma クライアントのモックを作る
 * @returns Prisma クライアントのモック
 */
function createPrismaMock() {
  return {
    ticket: {
      create: vi.fn(async ({ data }: { data: unknown }) => data),
      update: vi.fn(async ({ data }: { data: unknown }) => data),
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
  };
}

/** 作成データの共通部分 */
const BASE_CREATE_DATA = {
  guildId: "guild-1",
  categoryId: "cat-1",
  channelId: "ch-1",
  userId: "user-1",
  ticketNumber: 1,
  subject: "件名",
  status: "open",
  closedAt: null,
};

// elapsedDeleteMs は int4 の列なので、上限を超える値で更新が失敗しないよう保存前に切り詰めることを検証
describe("features/ticket/repositories/ticketRepository", () => {
  // 各テストでモックの呼び出し記録を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("update", () => {
    it("約24.8日を超える経過時間（int4 の上限超え）は上限で切り詰めて保存する", async () => {
      const prisma = createPrismaMock();
      const repository = new TicketRepository(prisma as never);

      await repository.update("t-1", {
        status: "open",
        elapsedDeleteMs: 30 * 24 * 60 * 60 * 1000,
        closedAt: null,
      });

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t-1" },
        data: {
          status: "open",
          elapsedDeleteMs: TICKET_ELAPSED_DELETE_MS_MAX,
          closedAt: null,
        },
      });
    });

    it("上限以内の経過時間はそのまま保存する", async () => {
      const prisma = createPrismaMock();
      const repository = new TicketRepository(prisma as never);

      await repository.update("t-1", { elapsedDeleteMs: 5000 });

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t-1" },
        data: { elapsedDeleteMs: 5000 },
      });
    });

    it("負の経過時間（時計の巻き戻り等）は0にして保存する", async () => {
      const prisma = createPrismaMock();
      const repository = new TicketRepository(prisma as never);

      await repository.update("t-1", { elapsedDeleteMs: -100 });

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t-1" },
        data: { elapsedDeleteMs: 0 },
      });
    });

    it("経過時間を含まない更新はデータに手を加えない（elapsedDeleteMs を足さない）", async () => {
      const prisma = createPrismaMock();
      const repository = new TicketRepository(prisma as never);
      const closedAt = new Date("2026-09-01T00:00:00Z");

      await repository.update("t-1", { status: "closed", closedAt });

      expect(prisma.ticket.update).toHaveBeenCalledWith({
        where: { id: "t-1" },
        data: { status: "closed", closedAt },
      });
    });
  });

  describe("create", () => {
    it("上限を超える経過時間は上限で切り詰めて作成する", async () => {
      const prisma = createPrismaMock();
      const repository = new TicketRepository(prisma as never);

      await repository.create({
        ...BASE_CREATE_DATA,
        elapsedDeleteMs: TICKET_ELAPSED_DELETE_MS_MAX + 1,
      });

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: {
          ...BASE_CREATE_DATA,
          elapsedDeleteMs: TICKET_ELAPSED_DELETE_MS_MAX,
        },
      });
    });

    it("新規作成時の経過時間0はそのまま作成する", async () => {
      const prisma = createPrismaMock();
      const repository = new TicketRepository(prisma as never);

      await repository.create({ ...BASE_CREATE_DATA, elapsedDeleteMs: 0 });

      expect(prisma.ticket.create).toHaveBeenCalledWith({
        data: { ...BASE_CREATE_DATA, elapsedDeleteMs: 0 },
      });
    });
  });

  // 自動削除で「読んでから消すまでの間の再オープン」を消さないよう、状態の確認と削除を1回で行う
  describe("deleteIfClosed", () => {
    it("クローズ済みの条件付きで削除し、消えたら true を返す", async () => {
      const prisma = createPrismaMock();
      prisma.ticket.deleteMany.mockResolvedValue({ count: 1 });
      const repository = new TicketRepository(prisma as never);

      await expect(repository.deleteIfClosed("t-1")).resolves.toBe(true);
      expect(prisma.ticket.deleteMany).toHaveBeenCalledWith({
        where: { id: "t-1", status: "closed" },
      });
    });

    it("再オープン済み・存在しないなどで消えなかったら false を返す", async () => {
      const prisma = createPrismaMock();
      const repository = new TicketRepository(prisma as never);

      await expect(repository.deleteIfClosed("t-1")).resolves.toBe(false);
    });
  });
});
