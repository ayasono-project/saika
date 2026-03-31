// src/shared/locale/localeManager.ts
// Guild別言語対応（i18next版）

import i18next, { type TFunction, type TOptionsBase } from "i18next";
import { env, NODE_ENV } from "../config/env";
import type { IGuildCoreRepository } from "../database/types";
import { logger } from "../utils/logger";
import {
  type AllParseKeys,
  DEFAULT_LOCALE,
  I18N_NAMESPACES,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "./i18n";
import { resources } from "./locales/resources";

/**
 * i18next.t を any なしで呼び出すための型エイリアス
 * i18next v25 は各キーの補間変数を厳密に推論するが、
 * 全キーの共通ラッパーには柔軟なシグネチャが必要なためここで定義する
 */
type FlexibleT = (
  key: AllParseKeys,
  options: TOptionsBase & Record<string, unknown>,
) => string;

/**
 * ロケールマネージャー
 * Guild別に動的に言語を切り替える
 */
export class LocaleManager {
  private defaultLocale: SupportedLocale;
  private repository?: IGuildCoreRepository;
  private initialized = false;
  /** 初期化中の Promise（並行呼び出しによる二重初期化防止） */
  private _initPromise: Promise<void> | null = null;

  /** Guild locale を一時キャッシュ（DB クエリ削減用） */
  private readonly localeCache = new Map<
    string,
    { locale: SupportedLocale; expiresAt: number }
  >();

  /** キャッシュ TTL: 5分 */
  private readonly LOCALE_CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(defaultLocale: SupportedLocale = DEFAULT_LOCALE) {
    this.defaultLocale = defaultLocale;
  }

  /**
   * i18nextを初期化
   * 複数の並行呼び出しがあっても init() は一度だけ実行される
   */
  async initialize(): Promise<void> {
    // 初期化済みなら即 return
    if (this.initialized) {
      return;
    }
    // 並行初期化は同一 Promise を共有
    if (!this._initPromise) {
      this._initPromise = this._doInitialize();
    }
    try {
      // 初期化完了まで待機（並行呼び出しは同一Promiseを共有）
      await this._initPromise;
    } catch (error) {
      // 初期化失敗時は _initPromise をリセットして再試行を可能にする
      this._initPromise = null;
      throw error;
    }
  }

  /**
   * i18nextの初期化本体処理
   */
  private async _doInitialize(): Promise<void> {
    // i18next 本体を resources + namespace 設定で初期化
    await i18next.init({
      lng: this.defaultLocale,
      fallbackLng: this.defaultLocale,
      debug: env.NODE_ENV === NODE_ENV.DEVELOPMENT,

      resources: {
        ja: resources.ja,
        en: resources.en,
      },

      interpolation: {
        escapeValue: false,
      },

      keySeparator: false,

      ns: [...I18N_NAMESPACES],
      defaultNS: "common",
    });

    // 初期化完了フラグを立てる
    this.initialized = true;
    logger.info(
      logPrefixed("system:log_prefix.bot", "system:locale.manager_initialized"),
    );
  }

  /**
   * Repositoryを設定（DIパターン）
   */
  setRepository(repository: IGuildCoreRepository): void {
    // Guild locale 取得元（DB repository）を差し替える
    this.repository = repository;
  }

  /**
   * Guild ロケールキャッシュを無効化
   * ロケール設定変更後に呼び出す
   */
  invalidateLocaleCache(guildId: string): void {
    // 該当 guild のキャッシュだけ削除
    this.localeCache.delete(guildId);
  }

  /**
   * キャッシュ付きで Guild ロケールを取得する内部ヘルパー
   */
  private async getCachedLocale(guildId: string): Promise<SupportedLocale> {
    const now = Date.now();
    const cached = this.localeCache.get(guildId);
    // TTL 内キャッシュがあれば再利用
    if (cached && cached.expiresAt > now) {
      return cached.locale;
    }

    // デフォルト言語を起点に、repository があれば guild 設定で上書き
    let locale: SupportedLocale = this.defaultLocale;
    if (this.repository) {
      // 永続化設定から guild のロケールを取得
      const guildLocale = await this.repository.getLocale(guildId);
      if (guildLocale && this.isSupported(guildLocale)) {
        locale = guildLocale as SupportedLocale;
      }
    }

    // 解決した locale を TTL 付きで保存
    this.localeCache.set(guildId, {
      locale,
      expiresAt: now + this.LOCALE_CACHE_TTL_MS,
    });

    return locale;
  }

  /**
   * Guild別の翻訳文字列を取得
   */
  async translate(
    guildId: string | undefined,
    key: AllParseKeys,
    params?: Record<string, unknown>,
  ): Promise<string> {
    try {
      // 未初期化時は初期化してから翻訳
      if (!this.initialized) {
        await this.initialize();
      }

      // Guild IDが指定されている場合、キャッシュ経由で言語を取得（DB クエリ削減）
      const locale = guildId
        ? await this.getCachedLocale(guildId)
        : this.defaultLocale;

      // i18nextで翻訳（モジュールレベルFlexibleTでキャストしanyを回避する）
      const options: TOptionsBase & Record<string, unknown> = params
        ? { lng: locale, ...params }
        : { lng: locale };
      return (i18next.t as unknown as FlexibleT)(key, options);
    } catch (error) {
      logger.error(
        logPrefixed(
          "system:log_prefix.bot",
          "system:locale.translation_failed",
          { key },
        ),
        error,
      );
      // 失敗時はキー文字列を返して UI 崩壊を避ける
      return key;
    }
  }

  /**
   * 翻訳関数を取得（特定の言語用）
   */
  getFixedT(locale: SupportedLocale): TFunction {
    // 指定言語固定の i18next translator を返す
    return i18next.getFixedT(locale);
  }

  /**
   * Guild別の翻訳関数を取得
   */
  async getGuildT(guildId: string | undefined): Promise<TFunction> {
    // 未指定時はデフォルトロケールを使用
    // キャッシュ経由でロケールを取得（DB クエリ削減）
    const locale = guildId
      ? await this.getCachedLocale(guildId)
      : this.defaultLocale;

    // 解決済み locale 固定 translator を返す
    return this.getFixedT(locale);
  }

  /**
   * デフォルト言語を取得
   */
  getDefaultLocale(): SupportedLocale {
    return this.defaultLocale;
  }

  /**
   * 対応言語一覧を取得
   */
  getSupportedLocales(): readonly SupportedLocale[] {
    return SUPPORTED_LOCALES;
  }

  /**
   * 言語が対応しているか確認
   */
  isSupported(locale: string): boolean {
    return SUPPORTED_LOCALES.includes(locale as SupportedLocale);
  }
}

// シングルトンインスタンス
export const localeManager: LocaleManager = new LocaleManager();

/**
 * ヘルパー関数：Guild別翻訳
 */
export const tGuild = async (
  guildId: string | undefined,
  key: AllParseKeys,
  params?: Record<string, unknown>,
): Promise<string> => {
  // シングルトン LocaleManager へ委譲（guildId なしは既定言語）
  return localeManager.translate(guildId, key, params);
};

/**
 * ヘルパー関数：interaction.locale ベースで翻訳
 * Discord クライアントの言語設定に基づいてユーザー応答を翻訳する（同期）
 * "ja" → 日本語、それ以外 → 英語
 */
export const tInteraction = (
  locale: string,
  key: AllParseKeys,
  params?: Record<string, unknown>,
): string => {
  // Discord locale が "ja" なら日本語、それ以外は英語にフォールバック
  const resolvedLocale: SupportedLocale = locale === "ja" ? "ja" : "en";
  const options: TOptionsBase & Record<string, unknown> = params
    ? { lng: resolvedLocale, ...params }
    : { lng: resolvedLocale };
  return (i18next.t as unknown as FlexibleT)(key, options);
};

/**
 * ヘルパー関数：デフォルト言語で翻訳
 */
export const tDefault = (
  key: AllParseKeys,
  params?: Record<string, unknown>,
): string => {
  // デフォルト言語固定 translator として利用
  // default locale を明示して翻訳
  const options: TOptionsBase & Record<string, unknown> = params
    ? { lng: localeManager.getDefaultLocale(), ...params }
    : { lng: localeManager.getDefaultLocale() };
  return (i18next.t as unknown as FlexibleT)(key, options);
};

/**
 * プレフィックス付きログメッセージを生成する
 * @param prefixKey ログプレフィックスの i18n キー（例: "system:log_prefix.bump_reminder"）
 * @param messageKey ログメッセージの i18n キー（例: "bumpReminder:bump-reminder.log.detected"）
 * @param params メッセージの補間パラメータ
 * @param sub サブプレフィックス（例: "command"）— "[interactionCreate:command]" の形式になる
 * @returns "[プレフィックス] メッセージ" 形式の文字列
 */
export const logPrefixed = (
  prefixKey: AllParseKeys,
  messageKey: AllParseKeys,
  params?: Record<string, unknown>,
  sub?: string,
): string => {
  const prefix = tDefault(prefixKey);
  const message = tDefault(messageKey, params);
  const tag = sub ? `[${prefix}:${sub}]` : `[${prefix}]`;
  return `${tag} ${message}`;
};

/**
 * コマンド名プレフィックス付きログメッセージを生成する
 * @param commandName スラッシュコマンド名（例: "/message-delete"）
 * @param messageKey ログメッセージの i18n キー
 * @param params メッセージの補間パラメータ
 * @returns "[/command-name] メッセージ" 形式の文字列
 */
export const logCommand = (
  commandName: string,
  messageKey: AllParseKeys,
  params?: Record<string, unknown>,
): string => {
  const message = tDefault(messageKey, params);
  return `[${commandName}] ${message}`;
};
