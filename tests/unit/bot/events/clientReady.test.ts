// tests/unit/bot/events/clientReady.test.ts
import { Events } from "discord.js";
import { clientReadyEvent } from "@/bot/events/clientReady";

const handleClientReadyMock = vi.fn();

vi.mock("@/bot/handlers/clientReadyHandler", () => ({
  handleClientReady: (...args: unknown[]) => handleClientReadyMock(...args),
}));

describe("bot/events/clientReady", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("イベントメタデータが正しいことを確認", () => {
    expect(clientReadyEvent.name).toBe(Events.ClientReady);
    expect(clientReadyEvent.once).toBe(true);
  });

  it("クライアントが handleClientReady へ委譲されることを確認", async () => {
    const client = { user: { tag: "bot#0001" } };

    await clientReadyEvent.execute(client as never);

    expect(handleClientReadyMock).toHaveBeenCalledWith(client);
  });
});
