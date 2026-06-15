// tests/unit/shared/locale/commandLocalizations.test.ts
import {
  getCommandLocalizations,
  withLocalization,
} from "@/shared/locale/commandLocalizations";
import { resources } from "@/shared/locale/locales/resources";

describe("shared/locale/commandLocalizations", () => {
  it("英語をデフォルト(base)、日本語をローカライゼーションマップに返すこと", () => {
    const localizations = getCommandLocalizations("ping", "ping.description");

    expect(localizations.base).toBe(resources.en.ping["ping.description"]);
    expect(localizations.localizations).toEqual({
      ja: resources.ja.ping["ping.description"],
    });
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
    expect(localized.descriptionLocalizations).toEqual({
      ja: resources.ja.afk["afk.description"],
    });
    expect(result).toBe(builder);
    expect(calls).toEqual([
      { method: "setDescription", value: resources.en.afk["afk.description"] },
      {
        method: "setDescriptionLocalizations",
        value: {
          ja: resources.ja.afk["afk.description"],
        },
      },
    ]);
  });
});
