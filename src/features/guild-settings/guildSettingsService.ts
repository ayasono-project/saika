// src/shared/features/guild-settings/guildSettingsService.ts
// ギルド設定のビジネスロジックを担当するサービス

import type {
  FullGuildSettings,
  GuildSettings,
  IGuildCoreRepository,
  IGuildSettingsAggregateRepository,
  ImportMergePlan,
} from "../../shared/database/types";
import { emptyFullGuildState } from "../../shared/database/types";
import { logPrefixed, tDefault } from "../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../shared/utils/errorHandling";
import { logger } from "../../shared/utils/logger";
import {
  EXPORT_SCHEMA_VERSION,
  type GuildSettingsExportData,
  type GuildSettingsExportSettings,
} from "./guildSettingsDefaults";

/**
 * ギルド設定の取得・更新・エクスポート・インポートを担当するサービス
 * コアCRUD は IGuildCoreRepository、一括操作は IGuildSettingsAggregateRepository 経由で行う
 */
export class GuildSettingsService {
  private readonly coreRepo: IGuildCoreRepository;
  private readonly aggregateRepo: IGuildSettingsAggregateRepository;
  constructor(
    coreRepo: IGuildCoreRepository,
    aggregateRepo: IGuildSettingsAggregateRepository,
  ) {
    this.coreRepo = coreRepo;
    this.aggregateRepo = aggregateRepo;
  }

  /**
   * ギルド設定を取得する
   * @param guildId 取得対象のギルドID
   * @returns ギルド設定（未設定時は null）
   */
  async getSettings(guildId: string): Promise<GuildSettings | null> {
    return this.coreRepo.getSettings(guildId);
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
            "guildSettings:log.locale_set",
            { guildId, locale },
          ),
        );
      },
      tDefault("guildSettings:log.locale_set", { guildId, locale }),
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
            "guildSettings:log.error_channel_set",
            { guildId, channelId },
          ),
        );
      },
      tDefault("guildSettings:log.error_channel_set", { guildId, channelId }),
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
            "guildSettings:log.reset",
            { guildId },
          ),
        );
      },
      tDefault("guildSettings:log.reset", { guildId }),
    );
  }

  /**
   * 全機能の設定を一括削除する
   * @param guildId 対象ギルドID
   */
  async deleteAllSettings(guildId: string): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        await this.aggregateRepo.deleteAllSettings(guildId);
        logger.debug(
          logPrefixed(
            "system:log_prefix.guild_config",
            "guildSettings:log.reset_all",
            { guildId },
          ),
        );
      },
      tDefault("guildSettings:log.reset_all", { guildId }),
    );
  }

  /**
   * 全設定をエクスポート用JSON構造に変換する
   * @param guildId 対象ギルドID
   * @returns エクスポートJSON（設定が存在しない場合は null）
   */
  async exportSettings(
    guildId: string,
  ): Promise<GuildSettingsExportData | null> {
    const fullSettings = await this.aggregateRepo.getFullSettings(guildId);
    if (!fullSettings) return null;

    const { state, ...settingsPart } = fullSettings;
    return {
      version: EXPORT_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      guildId,
      settings: settingsPart,
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
      return "guildSettings:user-response.import_invalid_json";
    }

    const obj = data as Record<string, unknown>;

    // version チェック
    if (obj.version !== EXPORT_SCHEMA_VERSION) {
      return "guildSettings:user-response.import_unsupported_version";
    }

    // guildId 一致チェック
    if (obj.guildId !== guildId) {
      return "guildSettings:user-response.import_guild_mismatch";
    }

    // settings オブジェクト存在チェック
    if (!obj.settings || typeof obj.settings !== "object") {
      return "guildSettings:user-response.import_invalid_json";
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
    data: GuildSettingsExportData,
  ): Promise<ImportMergePlan> {
    return this.aggregateRepo.planImportMerge(
      guildId,
      toFullGuildSettings(data),
    );
  }

  /**
   * エクスポートJSONからインポートする
   * @param guildId 対象ギルドID
   * @param data インポートデータ
   */
  async importSettings(
    guildId: string,
    data: GuildSettingsExportData,
  ): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        await this.aggregateRepo.importFullSettings(
          guildId,
          toFullGuildSettings(data),
        );
        logger.debug(
          logPrefixed(
            "system:log_prefix.guild_config",
            "guildSettings:log.imported",
            { guildId },
          ),
        );
      },
      tDefault("guildSettings:log.imported", { guildId }),
    );
  }
}

/**
 * エクスポートJSON 構造を FullGuildSettings に組み直す。
 * state 不在時は空構造でフォールバック（v0 互換）。
 */
function toFullGuildSettings(data: GuildSettingsExportData): FullGuildSettings {
  const settings: GuildSettingsExportSettings = data.settings;
  return {
    ...settings,
    state: data.state ?? emptyFullGuildState(),
  };
}

/**
 * GuildSettingsService のインスタンスを生成する
 * @param coreRepo コアCRUDリポジトリ
 * @param aggregateRepo 一括操作リポジトリ
 * @returns GuildSettingsService インスタンス
 */
export function createGuildSettingsService(
  coreRepo: IGuildCoreRepository,
  aggregateRepo: IGuildSettingsAggregateRepository,
): GuildSettingsService {
  return new GuildSettingsService(coreRepo, aggregateRepo);
}
