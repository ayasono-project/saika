// tests/helpers/testHelpers.ts
/**
 * Test Helpers
 * テスト用のヘルパー関数とモック
 */

import type {
  ChatInputCommandInteraction,
  Guild,
  GuildMember,
  TextChannel,
  User,
} from "discord.js";
import type { Mocked } from "vitest";

// ============================================================
// Discord.js モック生成ヘルパー
// ============================================================

/**
 * モックユーザーの作成
 */
export const createMockUser = (overrides?: Partial<User>): Mocked<User> =>
  ({
    id: "123456789",
    username: "testuser",
    discriminator: "0001",
    bot: false,
    tag: "testuser#0001",
    ...overrides,
  }) as Mocked<User>;

/**
 * モックギルドの作成
 */
export const createMockGuild = (overrides?: Partial<Guild>): Mocked<Guild> =>
  ({
    id: "987654321",
    name: "Test Guild",
    ownerId: "123456789",
    ...overrides,
  }) as Mocked<Guild>;

/**
 * モックメンバーの作成
 */
export const createMockMember = (
  overrides?: Partial<GuildMember>,
): Mocked<GuildMember> =>
  ({
    id: "123456789",
    user: createMockUser(),
    guild: createMockGuild(),
    roles: {
      cache: new Map(),
      add: vi.fn(),
      remove: vi.fn(),
    },
    permissions: {
      has: vi.fn().mockReturnValue(true),
    },
    ...overrides,
  }) as unknown as Mocked<GuildMember>;

/**
 * モックテキストチャンネルの作成
 */
export const createMockTextChannel = (
  overrides?: Partial<TextChannel>,
): Mocked<TextChannel> =>
  ({
    id: "111222333",
    name: "test-channel",
    type: 0, // GUILD_TEXT
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }) as unknown as Mocked<TextChannel>;

/**
 * モックインタラクションの作成
 */
export const createMockInteraction = (
  overrides?: Partial<ChatInputCommandInteraction>,
): Mocked<ChatInputCommandInteraction> =>
  ({
    id: "interaction-123",
    commandName: "test",
    locale: "ja",
    user: createMockUser(),
    guild: createMockGuild(),
    member: createMockMember(),
    channel: createMockTextChannel(),
    replied: false,
    deferred: false,
    ephemeral: false,
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    options: {
      getString: vi.fn(),
      getInteger: vi.fn(),
      getBoolean: vi.fn(),
      getUser: vi.fn(),
      getChannel: vi.fn(),
      getRole: vi.fn(),
      getMember: vi.fn(),
      getSubcommand: vi.fn(),
      getSubcommandGroup: vi.fn(),
    },
    ...overrides,
  }) as unknown as Mocked<ChatInputCommandInteraction>;

// ============================================================
// 汎用ユーティリティ
// ============================================================

/**
 * 非同期処理の待機ヘルパー
 */
export const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * ランダムなDiscord IDを生成
 */
export const generateSnowflake = (): string => {
  const timestamp = Date.now() - 1420070400000; // Discord epoch
  const random = Math.floor(Math.random() * 4096);
  return ((BigInt(timestamp) << 22n) | BigInt(random)).toString();
};

// ============================================================
// テストデータ生成ヘルパー
// ============================================================

/**
 * テストデータベース用のギルド設定を作成
 */
export const createTestGuildConfig = (
  guildId: string,
): {
  guildId: string;
  locale: string;
  afkConfig: null;
  vacConfig: null;
  bumpReminderConfig: null;
  stickMessages: null;
  memberLogConfig: null;
  createdAt: Date;
  updatedAt: Date;
} => ({
  guildId: guildId,
  locale: "ja",
  afkConfig: null,
  vacConfig: null,
  bumpReminderConfig: null,
  stickMessages: null,
  memberLogConfig: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

/**
 * エラーをアサートするヘルパー
 */
export const expectError = async <T extends Error>(
  fn: () => Promise<unknown>,
  errorClass: new (...args: unknown[]) => T,
  message?: string,
): Promise<void> => {
  try {
    await fn();
    throw new Error(
      `Expected ${errorClass.name} to be thrown, but function resolved successfully`,
    );
  } catch (error) {
    // エラー型を検証
    expect(error).toBeInstanceOf(errorClass);

    // 必要に応じて同一エラーのメッセージも検証
    if (message) {
      const actualMessage =
        error instanceof Error ? error.message : String(error);
      expect(actualMessage).toContain(message);
    }
  }
};
