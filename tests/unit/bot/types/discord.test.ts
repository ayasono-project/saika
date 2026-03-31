// tests/unit/bot/types/discord.test.ts
import { registerBotEvent } from "@/bot/types/discord";

describe("bot/types/discord", () => {
  it("once イベントが client.once で登録されることを確認", () => {
    const once = vi.fn();
    const on = vi.fn();
    const client = { once, on };

    registerBotEvent(client as never, {
      name: "ready" as never,
      once: true,
      execute: vi.fn().mockResolvedValue(undefined),
    });

    expect(once).toHaveBeenCalledTimes(1);
    expect(on).not.toHaveBeenCalled();
  });

  it("通常イベントが client.on で登録されることを確認", () => {
    const once = vi.fn();
    const on = vi.fn();
    const client = { once, on };

    registerBotEvent(client as never, {
      name: "messageCreate" as never,
      execute: vi.fn().mockResolvedValue(undefined),
    });

    expect(on).toHaveBeenCalledTimes(1);
    expect(once).not.toHaveBeenCalled();
  });
});
