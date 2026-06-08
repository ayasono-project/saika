// tests/unit/shared/locale/descriptionLength.test.ts
// コマンド/オプション説明文の長さが Discord の上限(100文字)以内であることを保証する回帰テスト。
// 説明文は base(英語)・localizations(日本語)いずれも Discord 側で 1〜100 文字に制限されるため、
// 両ロケールの "*.description" キーを検証する。超過すると本番のコマンド登録時に弾かれる。
import { resources } from "@/shared/locale/locales/resources";

// Discord: command/option description は最大 100 文字
const MAX_DESCRIPTION_LENGTH = 100;

const collectOffenders = (
  locale: Record<string, Record<string, string>>,
): string[] => {
  const offenders: string[] = [];
  for (const [namespace, table] of Object.entries(locale)) {
    for (const [key, value] of Object.entries(table)) {
      if (
        key.endsWith(".description") &&
        value.length > MAX_DESCRIPTION_LENGTH
      ) {
        offenders.push(`${namespace}/${key}: ${value.length} 文字`);
      }
    }
  }
  return offenders;
};

describe("shared/locale 説明文の長さ制限", () => {
  it("英語(base)の *.description が 100 文字以内であること", () => {
    expect(collectOffenders(resources.en)).toEqual([]);
  });

  it("日本語(localizations)の *.description が 100 文字以内であること", () => {
    expect(collectOffenders(resources.ja)).toEqual([]);
  });
});
