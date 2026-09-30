import { getCommandLocalizations } from "@/shared/locale/commandLocalizations";
import { resources } from "@/shared/locale/locales/resources";

describe("shared/locale/commandLocalizations", () => {
  it("英語をデフォルト(base)、日本語をローカライゼーションマップに返すこと", () => {
    const localizations = getCommandLocalizations("ping", "ping.description");

    expect(localizations.base).toBe(resources.en.ping["ping.description"]);
    expect(localizations.localizations).toEqual({
      ja: resources.ja.ping["ping.description"],
    });
  });
});
