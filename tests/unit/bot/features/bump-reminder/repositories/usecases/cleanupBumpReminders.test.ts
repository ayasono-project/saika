// tests/unit/bot/features/bump-reminder/repositories/usecases/cleanupBumpReminders.test.ts
import { BUMP_REMINDER_STATUS } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import { cleanupOldBumpRemindersUseCase } from "@/bot/features/bump-reminder/repositories/usecases/cleanupBumpReminders";

describe("bot/features/bump-reminder/repositories/usecases/cleanupBumpReminders", () => {
  it("古い sent/cancelled リマインダーを削除して件数を返す", async () => {
    const deleteMany = vi.fn().mockResolvedValue({ count: 2 });
    const prisma = { bumpReminder: { deleteMany } };

    const result = await cleanupOldBumpRemindersUseCase(prisma as never, 7);

    expect(result).toBe(2);
    expect(deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: {
            in: [BUMP_REMINDER_STATUS.SENT, BUMP_REMINDER_STATUS.CANCELLED],
          },
          updatedAt: expect.objectContaining({ lt: expect.any(Date) }),
        }),
      }),
    );
  });
});
