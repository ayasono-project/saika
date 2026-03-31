// tests/unit/bot/features/bump-reminder/repositories/usecases/createBumpReminder.test.ts
import { BUMP_REMINDER_STATUS } from "@/bot/features/bump-reminder/constants/bumpReminderConstants";
import { createBumpReminderUseCase } from "@/bot/features/bump-reminder/repositories/usecases/createBumpReminder";

describe("bot/features/bump-reminder/repositories/usecases/createBumpReminder", () => {
  it("既存の pending リマインダーをキャンセルしてトランザクション内で新規リマインダーを作成する", async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const create = vi.fn().mockResolvedValue({ id: "r1" });
    const tx = { bumpReminder: { updateMany, create } };
    const prisma = {
      $transaction: vi
        .fn()
        .mockImplementation(async (fn: (txArg: unknown) => unknown) => fn(tx)),
    };

    const scheduledAt = new Date("2026-02-21T00:00:00.000Z");
    const result = await createBumpReminderUseCase(
      prisma as never,
      "guild-1",
      "channel-1",
      scheduledAt,
      "msg-1",
      "panel-1",
      "Disboard",
    );

    expect(result).toEqual({ id: "r1" });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        guildId: "guild-1",
        status: BUMP_REMINDER_STATUS.PENDING,
        serviceName: "Disboard",
      },
      data: { status: BUMP_REMINDER_STATUS.CANCELLED },
    });
    expect(create).toHaveBeenCalledWith({
      data: {
        guildId: "guild-1",
        channelId: "channel-1",
        messageId: "msg-1",
        panelMessageId: "panel-1",
        serviceName: "Disboard",
        scheduledAt,
        status: BUMP_REMINDER_STATUS.PENDING,
      },
    });
  });
});
