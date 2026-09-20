// tests/unit/bot/services/botPresence.test.ts
// プレゼンス適用（稼働サーバー数の表示）のテスト

import { ActivityType, PresenceUpdateStatus } from "discord.js";

vi.mock("@/shared/locale/localeManager", () => ({
  tDefault: vi.fn(
    (key: string, params?: Record<string, unknown>) =>
      `${key}:${JSON.stringify(params)}`,
  ),
}));

import { applyBotPresence } from "@/bot/services/botPresence";

/** guilds.cache.size と setPresence だけを持つ最小のクライアントを作る */
function createClient(serverCount: number) {
  const setPresence = vi.fn();
  const client = {
    guilds: { cache: { size: serverCount } },
    user: { setPresence },
  };
  return { client, setPresence };
}

describe("bot/services/botPresence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("稼働サーバー数を反映したプレゼンスを適用すること", () => {
    const { client, setPresence } = createClient(3);

    applyBotPresence(client as never);

    expect(setPresence).toHaveBeenCalledWith({
      activities: [
        {
          name: 'system:bot.presence_activity:{"count":3}',
          type: ActivityType.Playing,
        },
      ],
      status: PresenceUpdateStatus.Online,
    });
  });

  it("サーバー数が変わると新しい件数で適用されること", () => {
    const { client, setPresence } = createClient(1);

    applyBotPresence(client as never);
    client.guilds.cache.size = 2;
    applyBotPresence(client as never);

    expect(setPresence).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activities: [
          {
            name: 'system:bot.presence_activity:{"count":2}',
            type: ActivityType.Playing,
          },
        ],
      }),
    );
  });

  it("client.user が未設定でも例外を投げないこと", () => {
    const client = { guilds: { cache: { size: 0 } }, user: null };

    expect(() => applyBotPresence(client as never)).not.toThrow();
  });
});
