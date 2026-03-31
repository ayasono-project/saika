// tests/unit/bot/client.test.ts

import { Collection, GatewayIntentBits } from "discord.js";
import { BotClient, createBotClient } from "@/bot/client";
import { logger } from "@/shared/utils/logger";

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

describe("bot/client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("BotClient が期待される collections と intents で生成されることを確認", () => {
    const client = new BotClient();

    expect(client.commands).toBeInstanceOf(Collection);
    expect(client.cooldownManager).toBeDefined();
    expect(client.options.intents.has(GatewayIntentBits.Guilds)).toBe(true);
    expect(client.options.intents.has(GatewayIntentBits.MessageContent)).toBe(
      true,
    );
    expect(client.options.intents.has(GatewayIntentBits.GuildMessages)).toBe(
      true,
    );
    expect(client.options.intents.has(GatewayIntentBits.GuildMembers)).toBe(
      true,
    );
    expect(client.options.intents.has(GatewayIntentBits.GuildVoiceStates)).toBe(
      true,
    );
  });

  it("createBotClient が初期化完了ログを出力することを確認", () => {
    const client = createBotClient();

    expect(client).toBeInstanceOf(BotClient);
    expect(logger.info).toHaveBeenCalledWith(
      "[system:log_prefix.bot] system:bot.client.initialized",
    );
  });

  it("shutdown が cooldown manager とクライアントを破棄してログを出力することを確認", async () => {
    const client = new BotClient();
    const destroyCooldownSpy = vi
      .spyOn(client.cooldownManager, "destroy")
      .mockImplementation(() => undefined);
    const destroyClientMock = vi.fn().mockResolvedValue(undefined);
    (client as unknown as { destroy: () => Promise<void> }).destroy =
      destroyClientMock;

    await client.shutdown();

    expect(logger.info).toHaveBeenNthCalledWith(
      1,
      "[system:log_prefix.bot] system:bot.client.shutting_down",
    );
    expect(destroyCooldownSpy).toHaveBeenCalledTimes(1);
    expect(destroyClientMock).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenNthCalledWith(
      2,
      "[system:log_prefix.bot] system:bot.client.shutdown_complete",
    );
  });
});
