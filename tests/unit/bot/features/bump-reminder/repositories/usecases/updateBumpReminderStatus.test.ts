// tests/unit/bot/features/bump-reminder/repositories/usecases/updateBumpReminderStatus.test.ts
import { BUMP_REMINDER_STATUS } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import {
  cancelPendingByGuildAndChannelUseCase,
  cancelPendingByGuildUseCase,
  updateReminderStatusUseCase,
} from "@/bot/features/bump-reminder/repositories/usecases/updateBumpReminderStatus";

describe("bot/features/bump-reminder/repositories/usecases/updateBumpReminderStatus", () => {
  it("ID でリマインダーのステータスを更新する", async () => {
    const update = vi.fn().mockResolvedValue(undefined);
    const prisma = { bumpReminder: { update } };

    await updateReminderStatusUseCase(
      prisma as never,
      "r1",
      "pending" as never,
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { status: "pending" },
    });
  });

  it("ギルド単位で pending リマインダーをキャンセルする", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 2 });
    const prisma = { bumpReminder: { updateMany } };

    await cancelPendingByGuildUseCase(prisma as never, "guild-1");

    expect(updateMany).toHaveBeenCalledWith({
      where: { guildId: "guild-1", status: BUMP_REMINDER_STATUS.PENDING },
      data: { status: BUMP_REMINDER_STATUS.CANCELLED },
    });
  });

  it("ギルドとチャンネル単位で pending リマインダーをキャンセルする", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const prisma = { bumpReminder: { updateMany } };

    await cancelPendingByGuildAndChannelUseCase(
      prisma as never,
      "guild-1",
      "channel-1",
    );

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        channelId: "channel-1",
        status: BUMP_REMINDER_STATUS.PENDING,
      },
      data: { status: BUMP_REMINDER_STATUS.CANCELLED },
    });
  });
});
