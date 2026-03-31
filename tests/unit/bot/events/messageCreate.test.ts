// tests/unit/bot/events/messageCreate.test.ts

import { Events } from "discord.js";
import { messageCreateEvent } from "@/bot/events/messageCreate";

const handleBumpMessageCreateMock = vi.fn();
const handleStickyMessageCreateMock = vi.fn();

vi.mock(
  "@/bot/features/bump-reminder/handlers/bumpMessageCreateHandler",
  () => ({
    handleBumpMessageCreate: (...args: unknown[]) =>
      handleBumpMessageCreateMock(...args),
  }),
);

vi.mock(
  "@/bot/features/sticky-message/handlers/stickyMessageCreateHandler",
  () => ({
    handleStickyMessageCreate: (...args: unknown[]) =>
      handleStickyMessageCreateMock(...args),
  }),
);

describe("bot/events/messageCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しいことを確認", () => {
    expect(messageCreateEvent.name).toBe(Events.MessageCreate);
    expect(messageCreateEvent.once).toBe(false);
  });

  it("メッセージが handleBumpMessageCreate へ委譲されることを確認", async () => {
    const message = { content: "bump" };

    await messageCreateEvent.execute(message as never);

    expect(handleBumpMessageCreateMock).toHaveBeenCalledWith(message);
  });

  it("メッセージが handleStickyMessageCreate へ委譲されることを確認", async () => {
    const message = { content: "hello" };

    await messageCreateEvent.execute(message as never);

    expect(handleStickyMessageCreateMock).toHaveBeenCalledWith(message);
  });
});
