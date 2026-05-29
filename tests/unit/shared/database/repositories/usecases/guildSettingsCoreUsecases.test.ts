// tests/unit/shared/database/repositories/usecases/guildSettingsCoreUsecases.test.ts

import type { MockedFunction } from "vitest";
import {
  existsGuildSettingsRecord,
  findGuildLocale,
  findGuildSettingsRecord,
} from "@/shared/database/repositories/persistence/guildSettingsReadPersistence";
import {
  createGuildSettingsRecord,
  deleteGuildSettingsRecord,
  upsertGuildSettingsRecord,
} from "@/shared/database/repositories/persistence/guildSettingsWritePersistence";
import {
  toGuildSettings,
  toGuildSettingsCreateData,
  toGuildSettingsUpdateData,
} from "@/shared/database/repositories/serializers/guildSettingsSerializer";
import {
  deleteGuildSettingsUsecase,
  existsGuildSettingsUsecase,
  getGuildLocaleUsecase,
  getGuildSettingsUsecase,
  saveGuildSettingsUsecase,
  updateGuildLocaleUsecase,
  updateGuildSettingsUsecase,
} from "@/shared/database/repositories/usecases/guildSettingsCoreUsecases";

vi.mock(
  "@/shared/database/repositories/persistence/guildSettingsReadPersistence",
  () => ({
    existsGuildSettingsRecord: vi.fn(),
    findGuildSettingsRecord: vi.fn(),
    findGuildLocale: vi.fn(),
  }),
);

vi.mock(
  "@/shared/database/repositories/persistence/guildSettingsWritePersistence",
  () => ({
    createGuildSettingsRecord: vi.fn(),
    deleteGuildSettingsRecord: vi.fn(),
    upsertGuildSettingsRecord: vi.fn(),
  }),
);

vi.mock(
  "@/shared/database/repositories/serializers/guildSettingsSerializer",
  () => ({
    toGuildSettings: vi.fn(),
    toGuildSettingsCreateData: vi.fn(),
    toGuildSettingsUpdateData: vi.fn(),
  }),
);

// guild設定に対するCRUD・ロケール取得ユースケースが、永続化層・シリアライザーを
// 正しくオーケストレーションしエラーをラップして返すことを検証するグループ
describe("shared/database/repositories/usecases/guildSettingsCoreUsecases", () => {
  const deps = {
    prisma: { guildSettings: {} } as never,
    defaultLocale: "ja",
    toDatabaseError: vi.fn(
      (prefix: string, error: unknown) =>
        new Error(
          `${prefix}:${error instanceof Error ? error.message : String(error)}`,
        ),
    ),
  };

  const findGuildSettingsRecordMock = findGuildSettingsRecord as MockedFunction<
    typeof findGuildSettingsRecord
  >;
  const toGuildSettingsMock = toGuildSettings as MockedFunction<
    typeof toGuildSettings
  >;
  const toCreateDataMock = toGuildSettingsCreateData as MockedFunction<
    typeof toGuildSettingsCreateData
  >;
  const createGuildSettingsRecordMock =
    createGuildSettingsRecord as MockedFunction<
      typeof createGuildSettingsRecord
    >;
  const toUpdateDataMock = toGuildSettingsUpdateData as MockedFunction<
    typeof toGuildSettingsUpdateData
  >;
  const upsertGuildSettingsRecordMock =
    upsertGuildSettingsRecord as MockedFunction<
      typeof upsertGuildSettingsRecord
    >;
  const deleteGuildSettingsRecordMock =
    deleteGuildSettingsRecord as MockedFunction<
      typeof deleteGuildSettingsRecord
    >;
  const existsGuildSettingsRecordMock =
    existsGuildSettingsRecord as MockedFunction<
      typeof existsGuildSettingsRecord
    >;
  const findGuildLocaleMock = findGuildLocale as MockedFunction<
    typeof findGuildLocale
  >;

  // テスト間でモックの呼び出し記録が持ち越されないようにクリアする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getGuildSettingsUsecase が変換済み設定または null を返すこと", async () => {
    findGuildSettingsRecordMock.mockResolvedValueOnce({
      guildId: "g1",
    } as never);
    toGuildSettingsMock.mockReturnValueOnce({
      guildId: "g1",
      locale: "ja",
    } as never);

    await expect(getGuildSettingsUsecase(deps, "g1")).resolves.toEqual({
      guildId: "g1",
      locale: "ja",
    });
    expect(toGuildSettingsMock).toHaveBeenCalled();

    findGuildSettingsRecordMock.mockResolvedValueOnce(null);
    await expect(getGuildSettingsUsecase(deps, "g2")).resolves.toBeNull();
  });

  // DBエラーが toDatabaseError でラップされ、適切なプレフィックス付きメッセージで再スローされることを確認
  it("getGuildSettingsUsecase がエラーを toDatabaseError でラップすること", async () => {
    findGuildSettingsRecordMock.mockRejectedValueOnce(new Error("db down"));

    await expect(getGuildSettingsUsecase(deps, "g1")).rejects.toThrow(
      "Failed to get guild config:db down",
    );
    expect(deps.toDatabaseError).toHaveBeenCalled();
  });

  it("saveGuildSettingsUsecase が作成データをシリアライズして永続化すること", async () => {
    const config = { guildId: "g1", locale: "ja" } as never;
    const createData = { guildId: "g1", locale: "ja" } as never;
    toCreateDataMock.mockReturnValueOnce(createData);

    await saveGuildSettingsUsecase(deps, config);
    expect(toCreateDataMock).toHaveBeenCalledWith(config, "ja");
    expect(createGuildSettingsRecordMock).toHaveBeenCalledWith(
      deps.prisma,
      createData,
    );
  });

  // upsertペイロードが(updateData + createFallback)として正しく構築され、失敗時はエラーがラップされることを検証
  it("updateGuildSettingsUsecase が upsert ペイロードを構築し、失敗時はエラーをラップすること", async () => {
    toUpdateDataMock.mockReturnValueOnce({ afkSettings: "{}" });

    await updateGuildSettingsUsecase(deps, "g1", { locale: "en" } as never);
    expect(upsertGuildSettingsRecordMock).toHaveBeenCalledWith(
      deps.prisma,
      "g1",
      { afkSettings: "{}" },
      { guildId: "g1", locale: "en", afkSettings: "{}" },
    );

    upsertGuildSettingsRecordMock.mockRejectedValueOnce(new Error("conflict"));
    await expect(
      updateGuildSettingsUsecase(deps, "g1", {} as never),
    ).rejects.toThrow("Failed to update guild config:conflict");
  });

  it("delete/exists ユースケースが処理を委譲し、失敗時にエラーをラップすること", async () => {
    await deleteGuildSettingsUsecase(deps, "g1");
    expect(deleteGuildSettingsRecordMock).toHaveBeenCalledWith(
      deps.prisma,
      "g1",
    );

    deleteGuildSettingsRecordMock.mockRejectedValueOnce(
      new Error("delete err"),
    );
    await expect(deleteGuildSettingsUsecase(deps, "g1")).rejects.toThrow(
      "Failed to delete guild config:delete err",
    );

    existsGuildSettingsRecordMock.mockResolvedValueOnce(true);
    await expect(existsGuildSettingsUsecase(deps, "g1")).resolves.toBe(true);

    existsGuildSettingsRecordMock.mockRejectedValueOnce(
      new Error("exists err"),
    );
    await expect(existsGuildSettingsUsecase(deps, "g1")).rejects.toThrow(
      "Failed to check guild config existence:exists err",
    );
  });

  // ロケールが見つからない(null)場合とDBエラー発生時の両方でデフォルトロケールにフォールバックすることを確認
  it("getGuildLocaleUsecase がロケール・null 時フォールバック・エラー時フォールバックを正しく返すこと", async () => {
    findGuildLocaleMock.mockResolvedValueOnce("en");
    await expect(getGuildLocaleUsecase(deps, "g1")).resolves.toBe("en");

    findGuildLocaleMock.mockResolvedValueOnce(null);
    await expect(getGuildLocaleUsecase(deps, "g1")).resolves.toBe("ja");

    findGuildLocaleMock.mockRejectedValueOnce(new Error("locale err"));
    await expect(getGuildLocaleUsecase(deps, "g1")).resolves.toBe("ja");
  });

  it("updateGuildLocaleUsecase が updateGuildSettingsUsecase を経由して処理を委譲すること", async () => {
    toUpdateDataMock.mockReturnValueOnce({ locale: "en" });
    await updateGuildLocaleUsecase(deps, "g1", "en");

    expect(upsertGuildSettingsRecordMock).toHaveBeenCalledWith(
      deps.prisma,
      "g1",
      { locale: "en" },
      { guildId: "g1", locale: "en" },
    );
  });
});
