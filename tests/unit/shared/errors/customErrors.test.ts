// tests/unit/shared/errors/customErrors.test.ts
/**
 * CustomErrors Unit Tests
 * カスタムエラークラスのテスト
 */

import {
  BaseError,
  ConfigurationError,
  DatabaseError,
  DiscordApiError,
  NotFoundError,
  PermissionError,
  RateLimitError,
  TimeoutError,
  ValidationError,
} from "@/shared/errors/customErrors";

describe("CustomErrors", () => {
  // 各エラークラスのプロパティ・継承・運用フラグの挙動を検証
  describe("BaseError", () => {
    it("正しいプロパティを持つエラーが生成されること", () => {
      const error = new BaseError("TestError", "Test message", true, 500);

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("TestError");
      expect(error.message).toBe("Test message");
      expect(error.isOperational).toBe(true);
      expect(error.statusCode).toBe(500);
      expect(error.stack).toBeDefined();
    });

    it("isOperational のデフォルト値が true であること", () => {
      const error = new BaseError("TestError", "Test message");
      expect(error.isOperational).toBe(true);
    });

    it("非運用エラーとして生成できること", () => {
      const error = new BaseError("TestError", "Test message", false);
      expect(error.isOperational).toBe(false);
    });

    it("生成時にスタックトレースが保持されること", () => {
      // 生成時にスタック情報が保持されることを確認
      const error = new BaseError("TestError", "Test message");
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain("TestError");
    });
  });

  describe("ValidationError", () => {
    // 入力エラー用クラスの既定値と継承関係を検証
    it("バリデーションエラーが正しい既定値で生成されること", () => {
      const error = new ValidationError("Invalid input");

      expect(error).toBeInstanceOf(BaseError);
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.name).toBe("ValidationError");
      expect(error.message).toBe("Invalid input");
      expect(error.isOperational).toBe(true);
      expect(error.statusCode).toBe(400);
    });

    it("BaseError としてキャッチできること", () => {
      try {
        throw new ValidationError("Test");
      } catch (error) {
        expect(error).toBeInstanceOf(BaseError);
      }
    });
  });

  describe("ConfigurationError", () => {
    // 設定エラーの基本属性を検証
    it("設定エラーが正しい基本属性で生成されること", () => {
      const error = new ConfigurationError("Missing config");

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("ConfigurationError");
      expect(error.message).toBe("Missing config");
      expect(error.statusCode).toBe(500);
    });
  });

  describe("DatabaseError", () => {
    // DBエラーの運用可否フラグ挙動を検証
    it("データベースエラーが正しい属性で生成されること", () => {
      const error = new DatabaseError("Connection failed");

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("DatabaseError");
      expect(error.message).toBe("Connection failed");
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it("非運用の DatabaseError を生成できること", () => {
      const error = new DatabaseError("Critical DB error", false);
      expect(error.isOperational).toBe(false);
    });
  });

  describe("DiscordApiError", () => {
    // Discord APIエラーのステータスコード挙動を検証
    it("デフォルトステータスで DiscordApiError が生成されること", () => {
      const error = new DiscordApiError("API rate limited");

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("DiscordApiError");
      expect(error.message).toBe("API rate limited");
      expect(error.statusCode).toBe(500);
    });

    it("カスタムステータスで DiscordApiError が生成されること", () => {
      const error = new DiscordApiError("Unauthorized", 401);
      expect(error.statusCode).toBe(401);
    });
  });

  describe("PermissionError", () => {
    // 権限エラーのHTTPステータスを検証
    it("PermissionError が正しい HTTP ステータスで生成されること", () => {
      const error = new PermissionError("Access denied");

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("PermissionError");
      expect(error.message).toBe("Access denied");
      expect(error.statusCode).toBe(403);
    });
  });

  describe("NotFoundError", () => {
    // not found メッセージの組み立てを検証
    it("リソース名を含む NotFoundError が生成されること", () => {
      const error = new NotFoundError("Guild");

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("NotFoundError");
      expect(error.message).toBe("Guild not found");
      expect(error.statusCode).toBe(404);
    });

    it("異なるリソース種別でメッセージが正しく組み立てられること", () => {
      const userError = new NotFoundError("User");
      const channelError = new NotFoundError("Channel");

      expect(userError.message).toBe("User not found");
      expect(channelError.message).toBe("Channel not found");
    });
  });

  describe("TimeoutError", () => {
    // タイムアウトエラーの基本属性を検証
    it("TimeoutError が正しい基本属性で生成されること", () => {
      const error = new TimeoutError("Request timed out");

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("TimeoutError");
      expect(error.message).toBe("Request timed out");
      expect(error.statusCode).toBe(408);
    });
  });

  describe("RateLimitError", () => {
    // レート制限エラーの基本属性を検証
    it("RateLimitError が正しい基本属性で生成されること", () => {
      const error = new RateLimitError("Too many requests");

      expect(error).toBeInstanceOf(BaseError);
      expect(error.name).toBe("RateLimitError");
      expect(error.message).toBe("Too many requests");
      expect(error.statusCode).toBe(429);
    });
  });

  describe("Error Handling Scenarios", () => {
    it("再送出しても主要なエラー情報が保持されること", () => {
      // 再送出/再捕捉しても主要情報が失われないこと
      try {
        throw new ValidationError("Original error");
      } catch (error) {
        if (error instanceof ValidationError) {
          expect(error.name).toBe("ValidationError");
          expect(error.message).toBe("Original error");
          expect(error.stack).toBeDefined();
        }
      }
    });

    it("instanceof チェックが正しく機能すること", () => {
      // 継承関係が期待どおりに機能することを確認
      const validationErr = new ValidationError("test");
      const dbErr = new DatabaseError("test");

      expect(validationErr instanceof ValidationError).toBe(true);
      expect(validationErr instanceof DatabaseError).toBe(false);
      expect(dbErr instanceof DatabaseError).toBe(true);
      expect(dbErr instanceof ValidationError).toBe(false);

      // Both are BaseErrors
      expect(validationErr instanceof BaseError).toBe(true);
      expect(dbErr instanceof BaseError).toBe(true);
    });

    it("isOperational フラグで運用エラーとプログラミングエラーを区別できること", () => {
      // 運用エラーとプログラミングエラーをフラグで区別できること
      const operationalError = new DatabaseError("Connection lost", true);
      const programmingError = new DatabaseError("Invalid SQL", false);

      expect(operationalError.isOperational).toBe(true);
      expect(programmingError.isOperational).toBe(false);
    });
  });
});
