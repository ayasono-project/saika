// tests/unit/bot/features/bump-reminder/repositories/usecases/findPendingReminders.test.ts
import { BUMP_REMINDER_STATUS } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import {
  findAllPendingUseCase,
  findPendingByGuildAndServiceUseCase,
} from "@/bot/features/bump-reminder/repositories/usecases/findPendingReminders";

describe("bot/features/bump-reminder/repositories/usecases/findPendingReminders", () => {
  it("ギルド+サービスの次の pending リマインダーを取得する", async () => {
    const findFirst = vi.fn().mockResolvedValue({ id: "r1" });
    const prisma = { bumpReminder: { findFirst } };

    const result = await findPendingByGuildAndServiceUseCase(
      prisma as never,
      "guild-1",
      "Disboard",
    );

    expect(result).toEqual({ id: "r1" });
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        serviceName: "Disboard",
        status: BUMP_REMINDER_STATUS.PENDING,
      },
      orderBy: { scheduledAt: "asc" },
    });
  });

  it("すべての pending リマインダーをスケジュール順で取得する", async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: "r1" }, { id: "r2" }]);
    const prisma = { bumpReminder: { findMany } };

    const result = await findAllPendingUseCase(prisma as never);

    expect(result).toEqual([{ id: "r1" }, { id: "r2" }]);
    expect(findMany).toHaveBeenCalledWith({
      where: { status: BUMP_REMINDER_STATUS.PENDING },
      orderBy: { scheduledAt: "asc" },
    });
  });
});
