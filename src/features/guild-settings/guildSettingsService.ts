// ギルド設定のビジネスロジックを担当するサービス

import type {
  GuildSettings,
  IGuildCoreRepository,
  IGuildSettingsAggregateRepository,
} from "../../shared/database/types";
import { logPrefixed, tDefault } from "../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../shared/utils/errorHandling";
import { logger } from "../../shared/utils/logger";

/**
 * ギルド設定の取得・更新・一括削除を担当するサービス
 * コアCRUD は IGuildCoreRepository、一括削除は IGuildSettingsAggregateRepository 経由で行う
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
