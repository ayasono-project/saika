// tests/unit/shared/utils/errorHandling.test.ts

import type { MockedFunction } from "vitest";
import { DatabaseError } from "@/shared/errors/customErrors";
import {
  executeWithDatabaseError,
  executeWithLoggedError,
} from "@/shared/utils/errorHandling";
import { logger } from "@/shared/utils/logger";

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("shared/utils/errorHandling", () => {
  const loggerErrorMock = logger.error as unknown as MockedFunction<
    typeof logger.error
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executeWithDatabaseError が成功時に操作結果を返すこと", async () => {
    const operation = vi.fn().mockResolvedValue("ok");

    await expect(
      executeWithDatabaseError(operation, "db failed"),
    ).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(1);
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it("executeWithDatabaseError が失敗時にログ出力して DatabaseError をスローすること", async () => {
    const cause = new Error("boom");
    const operation = vi.fn().mockRejectedValue(cause);

    await expect(
      executeWithDatabaseError(operation, "query failed"),
    ).rejects.toBeInstanceOf(DatabaseError);
    await expect(
      executeWithDatabaseError(operation, "query failed"),
    ).rejects.toMatchObject({
      message: "query failed",
      name: "DatabaseError",
    });
    expect(loggerErrorMock).toHaveBeenCalledWith("query failed", cause);
  });

  it("executeWithLoggedError が成功時に undefined で解決すること", async () => {
    const operation = vi.fn().mockResolvedValue(undefined);

    await expect(
      executeWithLoggedError(operation, "ignored"),
    ).resolves.toBeUndefined();
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it("executeWithLoggedError が失敗時にログ出力してエラーを飲み込むこと", async () => {
    const cause = new Error("non-fatal");
    const operation = vi.fn().mockRejectedValue(cause);

    await expect(
      executeWithLoggedError(operation, "warn message"),
    ).resolves.toBeUndefined();
    expect(loggerErrorMock).toHaveBeenCalledWith("warn message", cause);
  });
});
