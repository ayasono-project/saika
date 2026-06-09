// tests/unit/shared/locale/commandLocalizations.test.ts
import {
  getCommandLocalizations,
  withLocalization,
} from "@/shared/locale/commandLocalizations";
import { resources } from "@/shared/locale/locales/resources";

// ディスカバリー審査の都合で、コマンド登録メタデータは英語のみ（localizations は空）。
// 審査通過後に日本語ローカライズを復活させる際は、本テストの期待値も { ja } に戻す。

describe("shared/locale/commandLocalizations", () => {
  it("英語を base に返し、ローカライズマップは空であること", () => {
    const localizations = getCommandLocalizations("ping", "ping.description");

    expect(localizations.base).toBe(resources.en.ping["ping.description"]);
    expect(localizations.localizations).toEqual({});
  });

  it("ヘルパーオブジェクトを生成してビルダーチェーンにローカライゼーションを適用すること", () => {
    const calls: Array<{ method: string; value: unknown }> = [];

    const builder = {
      setDescription(description: string) {
        calls.push({ method: "setDescription", value: description });
        return this;
      },
      setDescriptionLocalizations(localizations: Record<string, string>) {
        calls.push({
          method: "setDescriptionLocalizations",
          value: localizations,
        });
        return this;
      },
    };

    const localized = withLocalization("afk", "afk.description");
    const result = localized.apply(builder);

    expect(localized.description).toBe(resources.en.afk["afk.description"]);
    expect(localized.descriptionLocalizations).toEqual({});
    expect(result).toBe(builder);
    expect(calls).toEqual([
      { method: "setDescription", value: resources.en.afk["afk.description"] },
      {
        method: "setDescriptionLocalizations",
        value: {},
      },
    ]);
  });
});
