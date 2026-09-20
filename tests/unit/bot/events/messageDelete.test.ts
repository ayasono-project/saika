import { Events } from "discord.js";
import { messageDeleteEvent } from "@/bot/events/messageDelete";

const handleTicketMessageDeleteMock = vi.fn();

vi.mock("@/features/ticket/handlers/ticketMessageDeleteHandler", () => ({
  handleTicketMessageDelete: (...args: unknown[]) =>
    handleTicketMessageDeleteMock(...args),
}));

const handleReactionRoleMessageDeleteMock = vi.fn();
vi.mock(
  "@/features/reaction-role/handlers/reactionRoleMessageDeleteHandler",
  () => ({
    handleReactionRoleMessageDelete: (...args: unknown[]) =>
      handleReactionRoleMessageDeleteMock(...args),
  }),
);

function createMessage(overrides?: Record<string, unknown>) {
  return {
    id: "msg-1",
    channelId: "channel-1",
    guildId: "guild-1",
    ...overrides,
  };
}

describe("bot/events/messageDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しいことを確認", () => {
    expect(messageDeleteEvent.name).toBe(Events.MessageDelete);
    expect(messageDeleteEvent.once).toBe(false);
  });

  it("メッセージが handleTicketMessageDelete へ委譲されることを確認", async () => {
    const message = createMessage();

    await messageDeleteEvent.execute(message as never);

    expect(handleTicketMessageDeleteMock).toHaveBeenCalledWith(message);
  });

  it("メッセージが handleReactionRoleMessageDelete へ委譲されることを確認", async () => {
    const message = createMessage();

    await messageDeleteEvent.execute(message as never);

    expect(handleReactionRoleMessageDeleteMock).toHaveBeenCalledWith(message);
  });
});
