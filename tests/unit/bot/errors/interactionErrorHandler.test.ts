// tests/unit/bot/errors/interactionErrorHandler.test.ts
/**
 * ErrorHandler Unit Tests
 * エラーハンドリング機能のテスト
 */

import {
  type ChatInputCommandInteraction,
  DiscordAPIError,
  MessageFlags,
  RESTJSONErrorCodes,
} from "discord.js";
import type { Mocked } from "vitest";
import {
  handleCommandError,
  handleInteractionError,
} from "@/bot/errors/interactionErrorHandler";
import { env, NODE_ENV } from "@/shared/config/env";
import {
  BaseError,
  ConfigurationError,
  DatabaseError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from "@/shared/errors/customErrors";
import { getUserFriendlyMessage, logError } from "@/shared/errors/errorHandler";
import { logger } from "@/shared/utils/logger";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// i18n のモック
const mockTDefault = (key: string, params?: Record<string, unknown>) => {
  const translations: Record<string, string> = {
    "common:general.unexpected_production": "予期しないエラーが発生しました。",
    "common:general.unexpected_with_message": `予期しないエラー: ${params?.message || ""}`,
    "system:error.reply_failed": "返信に失敗しました",
    "system:error.base_error_log": `[${params?.errorName || ""}] ${params?.message || ""}`,
    "system:error.unhandled_error_log": `[UnhandledError] ${params?.message || ""}`,
  };
  return translations[key] || key;
};

vi.mock("@/shared/locale/localeManager", () => ({
  tDefault: (key: string, params?: Record<string, unknown>) =>
    mockTDefault(key, params),
  tGuild: async (_guildId: string, key: string) => {
    if (key === "common:validation.error_title") {
      return "サーバー検証エラー";
    }
    return key;
  },
  tInteraction: (...args: unknown[]) => args[1],
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const prefix = mockTDefault(prefixKey);
    const message = mockTDefault(messageKey, params);
    const tag = sub ? `[${prefix}:${sub}]` : `[${prefix}]`;
    return `${tag} ${message}`;
  },
}));

describe("ErrorHandler", () => {
  // ログ出力・ユーザー向けメッセージ変換・Interaction応答分岐を検証
  // 各テスト実行前にモックの呼び出し履歴を初期化
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("logError()", () => {
    it("operational な BaseError は warning としてログ出力されることを確認", () => {
      const error = new ValidationError("Invalid input");

      logError(error);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("[ValidationError]"),
        expect.objectContaining({
          statusCode: 400,
        }),
      );
    });

    it("non-operational な BaseError は error としてログ出力されることを確認", () => {
      const error = new DatabaseError("Critical DB error", false);

      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("[DatabaseError]"),
        expect.objectContaining({
          statusCode: 500,
        }),
      );
    });

    it("通常の Error は unhandled error としてログ出力されることを確認", () => {
      const error = new Error("Generic error");

      logError(error);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("[UnhandledError]"),
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );
    });

    it("ログにスタックトレースが含まれることを確認", () => {
      const error = new ValidationError("Test error");

      logError(error);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          stack: expect.any(String),
        }),
      );
    });
  });

  describe("getUserFriendlyMessage()", () => {
    const originalEnv = env.NODE_ENV;

    // NODE_ENV の上書きが他テストへ漏れないよう復元
    afterEach(() => {
      env.NODE_ENV = originalEnv;
    });

    it("operational エラーのメッセージがそのまま返されることを確認", () => {
      const error = new ValidationError("フィールドが必須です");

      const message = getUserFriendlyMessage(error);

      expect(message).toBe("フィールドが必須です");
    });

    it("本番環境では non-operational エラーに汎用メッセージを返すことを確認", () => {
      // 本番環境では内部詳細を出さず汎用メッセージにする
      env.NODE_ENV = NODE_ENV.PRODUCTION;
      const error = new Error("Internal server error");

      const message = getUserFriendlyMessage(error);

      expect(message).toBe("予期しないエラーが発生しました。");
    });

    it("開発環境では詳細メッセージを返すことを確認", () => {
      // 開発環境ではデバッグ容易性のため詳細メッセージを返す
      env.NODE_ENV = NODE_ENV.DEVELOPMENT;
      const error = new Error("Detailed error message");

      const message = getUserFriendlyMessage(error);

      expect(message).toContain("Detailed error message");
    });

    it("isOperational=true の BaseError のメッセージがそのまま返されることを確認", () => {
      const error = new BaseError("CustomError", "User-friendly message", true);

      const message = getUserFriendlyMessage(error);

      expect(message).toBe("User-friendly message");
    });
  });

  describe("handleCommandError()", () => {
    let mockInteraction: Mocked<ChatInputCommandInteraction>;

    // Interaction の最小モックを毎回組み立てる
    beforeEach(() => {
      mockInteraction = {
        replied: false,
        deferred: false,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      } as unknown as Mocked<ChatInputCommandInteraction>;
    });

    it("未応答の場合はエラーメッセージで reply が呼ばれることを確認", async () => {
      const error = new ValidationError("Invalid command");

      await handleCommandError(mockInteraction, error);

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining("⚠️"),
                description: "Invalid command",
              }),
            }),
          ]),
          flags: MessageFlags.Ephemeral,
        }),
      );
    });

    it("応答済みの場合は editReply が呼ばれることを確認", async () => {
      // 応答済みの場合は editReply へフォールバック
      mockInteraction.replied = true;
      const error = new ValidationError("Invalid command");

      await handleCommandError(mockInteraction, error);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining("⚠️"),
                description: "Invalid command",
              }),
            }),
          ]),
        }),
      );
    });

    it("defer 済みの場合も editReply が呼ばれることを確認", async () => {
      // defer 済みの場合も editReply で更新
      mockInteraction.deferred = true;
      const error = new DatabaseError("Connection failed");

      await handleCommandError(mockInteraction, error);

      expect(mockInteraction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining("❌"),
                description: "Connection failed",
              }),
            }),
          ]),
        }),
      );
    });

    it("reply の前にエラーログが出力されることを確認", async () => {
      const error = new ValidationError("Test error");

      await handleCommandError(mockInteraction, error);

      expect(logger.warn).toHaveBeenCalled();
    });

    it("返信処理が失敗した場合も例外を投げずエラーログに記録することを確認", async () => {
      // 返信処理自体が失敗しても例外で落とさずログへ記録
      mockInteraction.reply.mockRejectedValue(new Error("Reply failed"));
      const error = new ValidationError("Test error");

      await handleCommandError(mockInteraction, error);

      expect(logger.error).toHaveBeenCalledWith(
        "[system:log_prefix.bot] 返信に失敗しました",
        expect.any(Error),
      );
    });
  });

  describe("handleInteractionError()", () => {
    it("guildId がある場合はギルド検証タイトルが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: "guild-1",
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(interaction, new ValidationError("invalid"));

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const payload = interaction.reply.mock.calls[0][0];
      expect(payload.flags).toBe(MessageFlags.Ephemeral);
      const embed = payload.embeds[0];
      expect(embed.data?.description ?? embed.description).toBe("invalid");
      expect(embed.data?.title ?? embed.title).toMatch(/^⚠️/);
    });

    it("BaseError.embedTitle がデフォルトタイトルより優先されることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      const error = new BaseError(
        "CustomError",
        "custom message",
        true,
        400,
        "カスタムタイトル",
      );

      await handleInteractionError(interaction, error);

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const payload = interaction.reply.mock.calls[0][0];
      expect(payload.flags).toBe(MessageFlags.Ephemeral);
      const embed = payload.embeds[0];
      expect(embed.data?.description ?? embed.description).toBe(
        "custom message",
      );
      expect(embed.data?.title ?? embed.title).toMatch(/^❌/);
    });

    it("PermissionError には common:title_permission_denied タイトルキーが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(
        interaction,
        new PermissionError("forbidden"),
      );

      const payload = interaction.reply.mock.calls[0][0];
      const embed = payload.embeds[0];
      expect(embed.data?.title ?? embed.title).toContain(
        "common:title_permission_denied",
      );
    });

    it("NotFoundError には common:title_resource_not_found タイトルキーが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(interaction, new NotFoundError("not found"));

      const payload = interaction.reply.mock.calls[0][0];
      const embed = payload.embeds[0];
      expect(embed.data?.title ?? embed.title).toContain(
        "common:title_resource_not_found",
      );
    });

    it("TimeoutError には common:title_timeout タイトルキーが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(interaction, new TimeoutError("timed out"));

      const payload = interaction.reply.mock.calls[0][0];
      const embed = payload.embeds[0];
      expect(embed.data?.title ?? embed.title).toContain(
        "common:title_timeout",
      );
    });

    it("ConfigurationError には common:title_config_error タイトルキーが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(
        interaction,
        new ConfigurationError("bad config"),
      );

      const payload = interaction.reply.mock.calls[0][0];
      const embed = payload.embeds[0];
      expect(embed.data?.title ?? embed.title).toContain(
        "common:title_config_error",
      );
    });

    it("DatabaseError には common:title_operation_error タイトルキーが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(
        interaction,
        new DatabaseError("db failure"),
      );

      const payload = interaction.reply.mock.calls[0][0];
      const embed = payload.embeds[0];
      expect(embed.data?.title ?? embed.title).toContain(
        "common:title_operation_error",
      );
    });

    it("RateLimitError には common:title_rate_limited タイトルキーが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(
        interaction,
        new RateLimitError("too many requests"),
      );

      const payload = interaction.reply.mock.calls[0][0];
      const embed = payload.embeds[0];
      expect(embed.data?.title ?? embed.title).toContain(
        "common:title_rate_limited",
      );
    });

    it("通常の Error にはフォールバックの汎用タイトルが使われることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        guildId: null,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      await handleInteractionError(interaction, new Error("unexpected"));

      expect(interaction.reply).toHaveBeenCalledTimes(1);
      const payload = interaction.reply.mock.calls[0][0];
      const embed = payload.embeds[0];
      expect(embed.data?.title ?? embed.title).toContain("common:error");
    });
  });

  describe("DiscordAPIError MissingPermissions", () => {
    it("MissingPermissions エラー時は Bot権限不足 メッセージで reply されることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      const apiError = new DiscordAPIError(
        {
          code: RESTJSONErrorCodes.MissingPermissions,
          message: "Missing Permissions",
        },
        RESTJSONErrorCodes.MissingPermissions,
        403,
        "POST",
        "/guilds/guild-1/channels",
        {},
      );

      await handleCommandError(interaction, apiError);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining(
                  "common:title_bot_permission_denied",
                ),
                description: "common:bot_permission.missing",
              }),
            }),
          ]),
          flags: MessageFlags.Ephemeral,
        }),
      );
    });

    it("MissingPermissions エラーで deferred 済みの場合は editReply が呼ばれることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: true,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      const apiError = new DiscordAPIError(
        {
          code: RESTJSONErrorCodes.MissingPermissions,
          message: "Missing Permissions",
        },
        RESTJSONErrorCodes.MissingPermissions,
        403,
        "POST",
        "/guilds/guild-1/channels",
        {},
      );

      await handleInteractionError(interaction, apiError);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringContaining(
                  "common:title_bot_permission_denied",
                ),
                description: "common:bot_permission.missing",
              }),
            }),
          ]),
        }),
      );
    });

    it("MissingPermissions エラーでも返信失敗時はログに記録されることを確認", async () => {
      const interaction: any = {
        replied: false,
        deferred: false,
        locale: "ja",
        reply: vi.fn().mockRejectedValue(new Error("Reply failed")),
        editReply: vi.fn().mockResolvedValue(undefined),
      };

      const apiError = new DiscordAPIError(
        {
          code: RESTJSONErrorCodes.MissingPermissions,
          message: "Missing Permissions",
        },
        RESTJSONErrorCodes.MissingPermissions,
        403,
        "POST",
        "/guilds/guild-1/channels",
        {},
      );

      await handleCommandError(interaction, apiError);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("返信に失敗しました"),
        expect.any(Error),
      );
    });
  });

  describe("Error Message Formatting", () => {
    it("warning レベルのエラーは ⚠️、error レベルは ❌ プレフィックスが付くことを確認", async () => {
      // テストごとに独立した Interaction モックを用意
      const mockInteraction = {
        replied: false,
        deferred: false,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      } as unknown as Mocked<ChatInputCommandInteraction>;

      // ValidationError は warning レベル → ⚠️
      await handleCommandError(mockInteraction, new ValidationError("Test"));

      expect(mockInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringMatching(/^⚠️/),
              }),
            }),
          ]),
        }),
      );

      // DatabaseError は error レベル → ❌
      const mockInteraction2 = {
        replied: false,
        deferred: false,
        locale: "ja",
        reply: vi.fn().mockResolvedValue(undefined),
        editReply: vi.fn().mockResolvedValue(undefined),
      } as unknown as Mocked<ChatInputCommandInteraction>;

      await handleCommandError(
        mockInteraction2,
        new DatabaseError("DB failure"),
      );

      expect(mockInteraction2.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.arrayContaining([
            expect.objectContaining({
              data: expect.objectContaining({
                title: expect.stringMatching(/^❌/),
              }),
            }),
          ]),
        }),
      );
    });
  });
});
