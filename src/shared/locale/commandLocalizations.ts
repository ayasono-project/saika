// コマンド定義用のローカライゼーションヘルパー

import { resources } from "./locales/resources";

type CommandLocalizationMap = Record<string, string>;

/**
 * コマンド説明文のローカライゼーションを取得
 * @param namespace 翻訳名前空間（例: "ping"）
 * @param key 翻訳キー（例: "ping.description"）
 * @returns Discord APIのLocalizationMap形式
 */
export function getCommandLocalizations<NS extends keyof typeof resources.ja>(
  namespace: NS,
  key: keyof (typeof resources.ja)[NS],
): {
  base: string;
  localizations: CommandLocalizationMap;
} {
  // 既定表示は英語（ディスカバリー審査フィルタが読むベース）。
  // 日本語クライアントには localizations.ja で上書き表示する。
  const jaValue = (resources.ja[namespace] as Record<string, string>)[
    key as string
  ];
  const enValue = (resources.en[namespace] as Record<string, string>)[
    key as string
  ];
  return {
    base: enValue,
    localizations: { ja: jaValue },
  };
}

/**
 * コマンドチョイスのローカライゼーションを取得
 * @param namespace 翻訳名前空間（例: "guildSettings"）
 * @param key 翻訳キー（例: "choice.locale.ja"）
 * @returns Discord APIのChoice形式（name + name_localizations）
 */
export function getChoiceLocalizations<NS extends keyof typeof resources.ja>(
  namespace: NS,
  key: keyof (typeof resources.ja)[NS],
  value: string,
): {
  name: string;
  name_localizations: CommandLocalizationMap;
  value: string;
} {
  const jaValue = (resources.ja[namespace] as Record<string, string>)[
    key as string
  ];
  const enValue = (resources.en[namespace] as Record<string, string>)[
    key as string
  ];
  return {
    name: enValue,
    name_localizations: { ja: jaValue },
    value,
  };
}
