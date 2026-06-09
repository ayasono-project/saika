// src/shared/locale/commandLocalizations.ts
// コマンド定義用のローカライゼーションヘルパー

import { resources } from "./locales/resources";

type CommandLocalizationMap = Record<string, string>;

/**
 * コマンド説明文のローカライゼーションを取得
 * @param namespace 翻訳名前空間（例: "ping"）
 * @param key 翻訳キー（例: "description"）
 * @returns Discord APIのLocalizationMap形式
 */
export function getCommandLocalizations<NS extends keyof typeof resources.ja>(
  namespace: NS,
  key: keyof (typeof resources.ja)[NS],
): {
  base: string;
  localizations: CommandLocalizationMap;
} {
  // ディスカバリー審査の都合で、コマンド登録メタデータは英語のみとする
  // （日本語をサポートロケールとして登録しない）。実行時応答（tInteraction / tGuild）は
  // 別経路のため日本語のまま。審査通過後に日本語ローカライズを復活させる。
  const enValue = (resources.en[namespace] as Record<string, string>)[
    key as string
  ];
  return {
    base: enValue,
    localizations: {},
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
  const enValue = (resources.en[namespace] as Record<string, string>)[
    key as string
  ];
  return {
    name: enValue,
    name_localizations: {},
    value,
  };
}

/**
 * コマンド説明文とローカライゼーションを一度に設定するヘルパー
 * @param namespace 翻訳名前空間
 * @param key 翻訳キー
 * @example
 * .setName("ping")
 * ...withLocalization("ping", "description")
 */
export function withLocalization<NS extends keyof typeof resources.ja>(
  namespace: NS,
  key: keyof (typeof resources.ja)[NS],
): {
  description: string;
  descriptionLocalizations: CommandLocalizationMap;
  apply: <
    T extends {
      setDescription: (desc: string) => T;
      setDescriptionLocalizations: (loc: CommandLocalizationMap) => T;
    },
  >(
    builder: T,
  ) => T;
} {
  // キーに対応する説明文をまとめて取得して再利用
  const { base, localizations } = getCommandLocalizations(namespace, key);
  return {
    // Discord クライアント既定表示向け（英語ベース）
    description: base,
    // クライアントロケール別の説明文マップ（ja）
    descriptionLocalizations: localizations,
    /**
     * SlashCommandBuilderなどに適用
     */
    apply: <
      T extends {
        setDescription: (desc: string) => T;
        setDescriptionLocalizations: (loc: CommandLocalizationMap) => T;
      },
    >(
      builder: T,
    ): T => {
      // builder への適用順を固定し、戻り値チェーンを維持
      return builder
        .setDescription(base)
        .setDescriptionLocalizations(localizations);
    },
  };
}
