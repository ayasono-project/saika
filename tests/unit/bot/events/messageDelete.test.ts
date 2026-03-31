// tests/unit/bot/events/messageDelete.test.ts

import { Events } from "discord.js";
import { messageDeleteEvent } from "@/bot/events/messageDelete";

const handleVcRecruitMessageDeleteMock = vi.fn();
const handleTicketMessageDeleteMock = vi.fn();

vi.mock(
  "@/bot/features/vc-recruit/handlers/vcRecruitMessageDeleteHandler",
  () => ({
    handleVcRecruitMessageDelete: (...args: unknown[]) =>
      handleVcRecruitMessageDeleteMock(...args),
  }),
);
vi.mock("@/bot/features/ticket/handlers/ticketMessageDeleteHandler", () => ({
  handleTicketMessageDelete: (...args: unknown[]) =>
    handleTicketMessageDeleteMock(...args),
}));

const handleReactionRoleMessageDeleteMock = vi.fn();
vi.mock(
  "@/bot/features/reaction-role/handlers/reactionRoleMessageDeleteHandler",
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

  it("メッセージが handleVcRecruitMessageDelete へ委譲されることを確認", async () => {
    const message = createMessage();

    await messageDeleteEvent.execute(message as never);

    expect(handleVcRecruitMessageDeleteMock).toHaveBeenCalledWith(message);
  });
});
