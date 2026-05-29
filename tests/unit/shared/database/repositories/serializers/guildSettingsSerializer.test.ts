// tests/unit/shared/database/repositories/serializers/guildSettingsSerializer.test.ts
import {
  toGuildSettings,
  toGuildSettingsCreateData,
  toGuildSettingsUpdateData,
} from "@/shared/database/repositories/serializers/guildSettingsSerializer";

// DBレコード ↔ ドメインオブジェクト間の変換ロジックを検証する
describe("shared/database/repositories/serializers/guildSettingsSerializer", () => {
  const baseRecord = {
    id: "id-1",
    guildId: "guild-1",
    locale: "ja",
    errorChannelId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  it("toGuildSettings がレコードを GuildSettings ドメインオブジェクトへ変換すること", () => {
    expect(toGuildSettings(baseRecord)).toEqual({
      guildId: "guild-1",
      locale: "ja",
      errorChannelId: undefined,
      createdAt: baseRecord.createdAt,
      updatedAt: baseRecord.updatedAt,
    });
  });

  it("toGuildSettings が errorChannelId を正しく変換すること", () => {
    const record = { ...baseRecord, errorChannelId: "ch-1" };
    expect(toGuildSettings(record)).toEqual({
      guildId: "guild-1",
      locale: "ja",
      errorChannelId: "ch-1",
      createdAt: baseRecord.createdAt,
      updatedAt: baseRecord.updatedAt,
    });
  });

  // localeが空の場合はデフォルト値で補完されることを確認
  it("toGuildSettingsCreateData が値をシリアライズしてデフォルトロケールを適用すること", () => {
    const data = toGuildSettingsCreateData(
      {
        guildId: "guild-3",
        locale: "",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      "ja",
    );

    expect(data).toEqual({
      guildId: "guild-3",
      locale: "ja",
    });
  });

  it("toGuildSettingsCreateData が指定された locale をそのまま保持すること", () => {
    const data = toGuildSettingsCreateData(
      {
        guildId: "guild-4",
        locale: "en",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      "ja",
    );

    expect(data).toEqual({ guildId: "guild-4", locale: "en" });
  });

  it("toGuildSettingsCreateData が errorChannelId を含む場合にそのまま出力すること", () => {
    const data = toGuildSettingsCreateData(
      {
        guildId: "guild-5",
        locale: "ja",
        errorChannelId: "ch-err",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      "ja",
    );

    expect(data).toEqual({
      guildId: "guild-5",
      locale: "ja",
      errorChannelId: "ch-err",
    });
  });

  it("toGuildSettingsUpdateData が locale のみを含むオブジェクトを返すこと", () => {
    expect(toGuildSettingsUpdateData({ locale: "en" })).toEqual({
      locale: "en",
    });
  });

  // フィールドを一切渡さない場合は空オブジェクトが返ることを確認
  it("toGuildSettingsUpdateData がフィールド未指定の場合に空オブジェクトを返すこと", () => {
    expect(toGuildSettingsUpdateData({})).toEqual({});
  });

  it("toGuildSettingsUpdateData が errorChannelId を文字列で渡した場合にそのまま保持すること", () => {
    expect(toGuildSettingsUpdateData({ errorChannelId: "ch-1" })).toEqual({
      errorChannelId: "ch-1",
    });
  });
});
