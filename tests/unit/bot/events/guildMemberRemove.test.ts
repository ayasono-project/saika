// tests/unit/bot/events/guildMemberRemove.test.ts

import { Events } from "discord.js";
import { guildMemberRemoveEvent } from "@/bot/events/guildMemberRemove";

const handleGuildMemberRemoveMock = vi.fn();
const handleBumpReminderMemberRemoveMock = vi.fn();

vi.mock("@/bot/features/member-log/handlers/guildMemberRemoveHandler", () => ({
  handleGuildMemberRemove: (...args: unknown[]) =>
    handleGuildMemberRemoveMock(...args),
}));

vi.mock(
  "@/bot/features/bump-reminder/handlers/bumpReminderMemberRemoveHandler",
  () => ({
    handleBumpReminderMemberRemove: (...args: unknown[]) =>
      handleBumpReminderMemberRemoveMock(...args),
  }),
);

// guildMemberRemove イベントのメタデータと委譲を検証
describe("bot/events/guildMemberRemove", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // イベント名と once フラグが正しいことを確認
  it("イベントメタデータが正しい", () => {
    expect(guildMemberRemoveEvent.name).toBe(Events.GuildMemberRemove);
    expect(guildMemberRemoveEvent.once).toBe(false);
  });

  // execute が各ハンドラへ member を渡すことを検証
  it("handleGuildMemberRemove と handleBumpReminderMemberRemove へ委譲する", async () => {
    const member = { id: "member-1" } as never;
    handleGuildMemberRemoveMock.mockResolvedValue(undefined);
    handleBumpReminderMemberRemoveMock.mockResolvedValue(undefined);

    await guildMemberRemoveEvent.execute(member);

    expect(handleGuildMemberRemoveMock).toHaveBeenCalledWith(member);
    expect(handleBumpReminderMemberRemoveMock).toHaveBeenCalledWith(member);
  });
});
