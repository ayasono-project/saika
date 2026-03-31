// tests/integration/bot/events/interactionCreate.command.integration.test.ts

import type { ChatInputCommandInteraction } from "discord.js";
import type { Mock } from "vitest";
import { pingCommand } from "@/bot/commands/ping";
import { interactionCreateEvent } from "@/bot/events/interactionCreate";

// コマンド・イベント結合検証のため、翻訳とEmbed生成のみ固定化する
vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "ping description",
    localizations: { "en-US": "ping description" },
  }),
}));
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
  tInteraction: vi.fn(
    (_locale: string, key: string, params?: Record<string, unknown>) => {
      if (key === "ping:user-response.measuring") {
        return "🏓 計測中...";
      }
      if (key === "ping:user-response.result") {
        return `📡 API レイテンシー: **${String(params?.apiLatency)}ms**\n💓 WebSocket Ping: **${String(params?.wsLatency)}ms**`;
      }
      return key;
    },
  ),
}));
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
  handleInteractionError: vi.fn(),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: vi.fn((description: string) => ({ description })),
  createSuccessEmbed: vi.fn((description: string) => ({ description })),
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type CommandInteraction = {
  client: {
    commands: Map<string, unknown>;
    cooldownManager: { check: Mock };
    modals: Map<string, unknown>;
    ws: { ping: number };
  };
  commandName: string;
  guildId: string;
  locale: string;
  createdTimestamp: number;
  user: { id: string; tag: string };
  reply: Mock<(arg: unknown) => Promise<void>>;
  fetchReply: Mock<() => Promise<{ createdTimestamp: number }>>;
  editReply: Mock<(arg: unknown) => Promise<void>>;
  isChatInputCommand: Mock<() => boolean>;
  isAutocomplete: Mock<() => boolean>;
  isModalSubmit: Mock<() => boolean>;
  isButton: Mock<() => boolean>;
  isUserSelectMenu: Mock<() => boolean>;
};

// ChatInput 経路の統合検証に必要な最小 interaction を組み立てる
function createInteraction(): CommandInteraction {
  return {
    client: {
      commands: new Map([["ping", pingCommand]]),
      cooldownManager: { check: vi.fn(() => 0) },
      modals: new Map(),
      ws: { ping: 42 },
    },
    commandName: "ping",
    guildId: "guild-1",
    locale: "ja",
    createdTimestamp: 1_000,
    user: { id: "user-1", tag: "user#0001" },
    reply: vi.fn().mockResolvedValue(undefined),
    fetchReply: vi.fn().mockResolvedValue({ createdTimestamp: 1_123 }),
    editReply: vi.fn().mockResolvedValue(undefined),
    isChatInputCommand: vi.fn(() => true),
    isAutocomplete: vi.fn(() => false),
    isModalSubmit: vi.fn(() => false),
    isButton: vi.fn(() => false),
    isUserSelectMenu: vi.fn(() => false),
  };
}

describe("integration: interactionCreate + pingCommand", () => {
  // 各ケースの検証前にモック履歴をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("interactionCreate から pingCommand までの実行経路を統合的に確認する", async () => {
    const interaction = createInteraction();

    await interactionCreateEvent.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.client.cooldownManager.check).toHaveBeenCalledWith(
      "ping",
      "user-1",
      5,
    );
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [{ description: "🏓 計測中..." }],
    });
    expect(interaction.fetchReply).toHaveBeenCalledTimes(1);
    expect(interaction.editReply).toHaveBeenCalledWith({
      embeds: [
        {
          description:
            "📡 API レイテンシー: **123ms**\n💓 WebSocket Ping: **42ms**",
        },
      ],
    });
  });
});
