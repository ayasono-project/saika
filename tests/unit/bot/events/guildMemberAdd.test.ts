// tests/unit/bot/events/guildMemberAdd.test.ts

import { Events } from "discord.js";
import { guildMemberAddEvent } from "@/bot/events/guildMemberAdd";

const handleGuildMemberAddMock = vi.fn();

vi.mock("@/bot/features/member-log/handlers/guildMemberAddHandler", () => ({
  handleGuildMemberAdd: (...args: unknown[]) =>
    handleGuildMemberAddMock(...args),
}));

// guildMemberAdd イベントのメタデータと委譲を検証
describe("bot/events/guildMemberAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // イベント名と once フラグが正しいことを確認
  it("イベントメタデータが正しい", () => {
    expect(guildMemberAddEvent.name).toBe(Events.GuildMemberAdd);
    expect(guildMemberAddEvent.once).toBe(false);
  });

  // execute が handleGuildMemberAdd へ member を渡すことを検証
  it("handleGuildMemberAdd へ委譲する", async () => {
    const member = { id: "member-1" } as never;
    handleGuildMemberAddMock.mockResolvedValue(undefined);

    await guildMemberAddEvent.execute(member);

    expect(handleGuildMemberAddMock).toHaveBeenCalledWith(member);
  });
});
