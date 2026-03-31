// tests/unit/shared/database/repositories/serializers/guildConfigSerializer.test.ts
import {
  toGuildConfig,
  toGuildConfigCreateData,
  toGuildConfigUpdateData,
} from "@/shared/database/repositories/serializers/guildConfigSerializer";

// DBレコード ↔ ドメインオブジェクト間の変換ロジックを検証する
describe("shared/database/repositories/serializers/guildConfigSerializer", () => {
  const baseRecord = {
    id: "id-1",
    guildId: "guild-1",
    locale: "ja",
    errorChannelId: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };

  it("toGuildConfig がレコードを GuildConfig ドメインオブジェクトへ変換すること", () => {
    expect(toGuildConfig(baseRecord)).toEqual({
      guildId: "guild-1",
      locale: "ja",
      errorChannelId: undefined,
      createdAt: baseRecord.createdAt,
      updatedAt: baseRecord.updatedAt,
    });
  });

  it("toGuildConfig が errorChannelId を正しく変換すること", () => {
    const record = { ...baseRecord, errorChannelId: "ch-1" };
    expect(toGuildConfig(record)).toEqual({
      guildId: "guild-1",
      locale: "ja",
      errorChannelId: "ch-1",
      createdAt: baseRecord.createdAt,
      updatedAt: baseRecord.updatedAt,
    });
  });

  // localeが空の場合はデフォルト値で補完されることを確認
  it("toGuildConfigCreateData が値をシリアライズしてデフォルトロケールを適用すること", () => {
    const data = toGuildConfigCreateData(
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

  it("toGuildConfigCreateData が指定された locale をそのまま保持すること", () => {
    const data = toGuildConfigCreateData(
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

  it("toGuildConfigCreateData が errorChannelId を含む場合にそのまま出力すること", () => {
    const data = toGuildConfigCreateData(
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

  it("toGuildConfigUpdateData が locale のみを含むオブジェクトを返すこと", () => {
    expect(toGuildConfigUpdateData({ locale: "en" })).toEqual({ locale: "en" });
  });

  // フィールドを一切渡さない場合は空オブジェクトが返ることを確認
  it("toGuildConfigUpdateData がフィールド未指定の場合に空オブジェクトを返すこと", () => {
    expect(toGuildConfigUpdateData({})).toEqual({});
  });

  it("toGuildConfigUpdateData が errorChannelId を文字列で渡した場合にそのまま保持すること", () => {
    expect(toGuildConfigUpdateData({ errorChannelId: "ch-1" })).toEqual({
      errorChannelId: "ch-1",
    });
  });
});
