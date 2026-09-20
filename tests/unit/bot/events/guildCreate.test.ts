import { Events } from "discord.js";
import { guildCreateEvent } from "@/bot/events/guildCreate";

const handleGuildCreateMock = vi.fn();

vi.mock("@/bot/handlers/guildCreateHandler", () => ({
  handleGuildCreate: (...args: unknown[]) => handleGuildCreateMock(...args),
}));

describe("bot/events/guildCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しいことを確認", () => {
    expect(guildCreateEvent.name).toBe(Events.GuildCreate);
    expect(guildCreateEvent.once).toBe(false);
  });

  it("参加したギルドが handleGuildCreate へ委譲されることを確認", async () => {
    const guild = { id: "guild-1", name: "Test Guild" };

    await guildCreateEvent.execute(guild as never);

    expect(handleGuildCreateMock).toHaveBeenCalledWith(guild);
  });
});
