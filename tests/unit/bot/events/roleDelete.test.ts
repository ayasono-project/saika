// tests/unit/bot/events/roleDelete.test.ts

import { Events } from "discord.js";
import { roleDeleteEvent } from "@/bot/events/roleDelete";

const handleBumpReminderRoleDeleteMock = vi.fn();

vi.mock(
  "@/bot/features/bump-reminder/handlers/bumpReminderRoleDeleteHandler",
  () => ({
    handleBumpReminderRoleDelete: (...args: unknown[]) =>
      handleBumpReminderRoleDeleteMock(...args),
  }),
);

describe("bot/events/roleDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しい", () => {
    expect(roleDeleteEvent.name).toBe(Events.GuildRoleDelete);
    expect(roleDeleteEvent.once).toBe(false);
  });

  it("handleBumpReminderRoleDelete へ委譲する", async () => {
    const role = { id: "role-1" } as never;
    handleBumpReminderRoleDeleteMock.mockResolvedValue(undefined);

    await roleDeleteEvent.execute(role);

    expect(handleBumpReminderRoleDeleteMock).toHaveBeenCalledWith(role);
  });
});
