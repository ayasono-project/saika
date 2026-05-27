// src/shared/features/guild-config/guildConfigService.ts
// ギルド設定のビジネスロジックを担当するサービス

import type {
  FullGuildConfig,
  GuildConfig,
  IGuildConfigAggregateRepository,
  IGuildCoreRepository,
  ImportMergePlan,
} from "../../database/types";
import { emptyFullGuildState } from "../../database/types";
import { logPrefixed, tDefault } from "../../locale/localeManager";
import { executeWithDatabaseError } from "../../utils/errorHandling";
import { logger } from "../../utils/logger";
import {
  EXPORT_SCHEMA_VERSION,
  type GuildConfigExportConfig,
  type GuildConfigExportData,
} from "./guildConfigDefaults";

/**
 * ギルド設定の取得・更新・エクスポート・インポートを担当するサービス
 * コアCRUD は IGuildCoreRepository、一括操作は IGuildConfigAggregateRepository 経由で行う
 */
export class GuildConfigService {
  private readonly coreRepo: IGuildCoreRepository;
  private readonly aggregateRepo: IGuildConfigAggregateRepository;
  constructor(
    coreRepo: IGuildCoreRepository,
    aggregateRepo: IGuildConfigAggregateRepository,
  ) {
    this.coreRepo = coreRepo;
    this.aggregateRepo = aggregateRepo;
  }

  /**
   * ギルド設定を取得する
   * @param guildId 取得対象のギルドID
   * @returns ギルド設定（未設定時は null）
   */
  async getConfig(guildId: string): Promise<GuildConfig | null> {
    return this.coreRepo.getConfig(guildId);
  }

  /**
   * ロケールを更新する
   * @param guildId 対象ギルドID
   * @param locale 設定するロケール
   */
  async updateLocale(guildId: string, locale: string): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        await this.coreRepo.updateLocale(guildId, locale);
        logger.debug(
          logPrefixed(
            "system:log_prefix.guild_config",
            "guildConfig:log.locale_set",
            { guildId, locale },
          ),
        );
      },
      tDefault("guildConfig:log.locale_set", { guildId, locale }),
    );
  }

  /**
   * エラー通知チャンネルを設定する
   * @param guildId 対象ギルドID
   * @param channelId エラー通知先チャンネルID
   */
  async updateErrorChannel(guildId: string, channelId: string): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        await this.coreRepo.updateErrorChannel(guildId, channelId);
        logger.debug(
          logPrefixed(
            "system:log_prefix.guild_config",
            "guildConfig:log.error_channel_set",
            { guildId, channelId },
          ),
        );
      },
      tDefault("guildConfig:log.error_channel_set", { guildId, channelId }),
    );
  }

  /**
   * ギルド設定（locale・errorChannelId）をデフォルトにリセットする
   * @param guildId 対象ギルドID
   */
  async resetGuildSettings(guildId: string): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        await this.coreRepo.resetGuildSettings(guildId);
        logger.debug(
          logPrefixed(
            "system:log_prefix.guild_config",
            "guildConfig:log.reset",
            { guildId },
          ),
        );
      },
      tDefault("guildConfig:log.reset", { guildId }),
    );
  }

  /**
   * 全機能の設定を一括削除する
   * @param guildId 対象ギルドID
   */
  async deleteAllConfig(guildId: string): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        await this.aggregateRepo.deleteAllConfigs(guildId);
        logger.debug(
          logPrefixed(
            "system:log_prefix.guild_config",
            "guildConfig:log.reset_all",
            { guildId },
          ),
        );
      },
      tDefault("guildConfig:log.reset_all", { guildId }),
    );
  }

  /**
   * 全設定をエクスポート用JSON構造に変換する
   * @param guildId 対象ギルドID
   * @returns エクスポートJSON（設定が存在しない場合は null）
   */
  async exportConfig(guildId: string): Promise<GuildConfigExportData | null> {
    const fullConfig = await this.aggregateRepo.getFullConfig(guildId);
    if (!fullConfig) return null;

    const { state, ...configPart } = fullConfig;
    return {
      version: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      guildId,
      config: configPart,
      state: state ?? emptyFullGuildState(),
    };
  }

  /**
   * エクスポートJSONを検証する
   * @param data パース済みJSON
   * @param guildId 実行サーバーのギルドID
   * @returns エラーキー（問題なければ null）
   */
  validateImportData(data: unknown, guildId: string): string | null {
    // オブジェクト形式チェック
    if (!data || typeof data !== "object") {
      return "guildConfig:user-response.import_invalid_json";
    }

    const obj = data as Record<string, unknown>;

    // version チェック
    if (obj.version !== EXPORT_SCHEMA_VERSION) {
      return "guildConfig:user-response.import_unsupported_version";
    }

    // guildId 一致チェック
    if (obj.guildId !== guildId) {
      return "guildConfig:user-response.import_guild_mismatch";
    }

    // config オブジェクト存在チェック
    if (!obj.config || typeof obj.config !== "object") {
      return "guildConfig:user-response.import_invalid_json";
    }

    return null;
  }

  /**
   * import 実行前にマージ計画（新規追加予定件数）を算出する
   * @param guildId 対象ギルドID
   * @param data インポートデータ
   */
  async planImport(
    guildId: string,
    data: GuildConfigExportData,
  ): Promise<ImportMergePlan> {
    return this.aggregateRepo.planImportMerge(guildId, toFullGuildConfig(data));
  }

  /**
   * エクスポートJSONからインポートする
   * @param guildId 対象ギルドID
   * @param data インポートデータ
   */
  async importConfig(
    guildId: string,
    data: GuildConfigExportData,
  ): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        await this.aggregateRepo.importFullConfig(
          guildId,
          toFullGuildConfig(data),
        );
        logger.debug(
          logPrefixed(
            "system:log_prefix.guild_config",
            "guildConfig:log.imported",
            { guildId },
          ),
        );
      },
      tDefault("guildConfig:log.imported", { guildId }),
    );
  }
}

/**
 * エクスポートJSON 構造を FullGuildConfig に組み直す。
 * state 不在時は空構造でフォールバック（v0 互換）。
 */
function toFullGuildConfig(data: GuildConfigExportData): FullGuildConfig {
  const config: GuildConfigExportConfig = data.config;
  return {
    ...config,
    state: data.state ?? emptyFullGuildState(),
  };
}

/**
 * GuildConfigService のインスタンスを生成する
 * @param coreRepo コアCRUDリポジトリ
 * @param aggregateRepo 一括操作リポジトリ
 * @returns GuildConfigService インスタンス
 */
export function createGuildConfigService(
  coreRepo: IGuildCoreRepository,
  aggregateRepo: IGuildConfigAggregateRepository,
): GuildConfigService {
  return new GuildConfigService(coreRepo, aggregateRepo);
}
