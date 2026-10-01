// AFK設定サービス実装（Repositoryパターン準拠）

import {
  type AfkSettings,
  type IAfkSettingsRepository,
} from "../../shared/database/types";
import { logPrefixed, tDefault } from "../../shared/locale/localeManager";
import { executeWithDatabaseError } from "../../shared/utils/errorHandling";
import { logger } from "../../shared/utils/logger";
import {
  createDefaultAfkSettings,
  normalizeAfkSettings,
} from "./afkSettingsDefaults";

/**
 * AFK設定の取得・更新を担当するサービス
 * DBアクセスは IAfkSettingsRepository 経由に統一する
 */
export class AfkSettingsService {
  private readonly guildSettingsRepository: IAfkSettingsRepository;
  constructor(guildSettingsRepository: IAfkSettingsRepository) {
    this.guildSettingsRepository = guildSettingsRepository;
  }

  /**
   * AFK設定を取得する
   * @param guildId 取得対象のギルドID
   * @returns AFK設定（未設定時は null）
   */
  async getAfkSettings(guildId: string): Promise<AfkSettings | null> {
    // 永続化設定を取得
    const config = await this.guildSettingsRepository.getAfkSettings(guildId);
    // 未設定時は null を返し、呼び出し側に初期化判断を委ねる
    if (!config) {
      return null;
    }
    // 参照共有を避けるため正規化して返す
    return normalizeAfkSettings(config);
  }

  /**
   * AFK設定を取得（未設定時は初期値を返す）
   * @param guildId 取得対象のギルドID
   * @returns AFK設定（未設定時は既定値）
   */
  async getAfkSettingsOrDefault(guildId: string): Promise<AfkSettings> {
    // 設定がなければ既定値を返し、呼び出し側の null 判定を不要化
    const config = await this.getAfkSettings(guildId);
    if (!config) {
      return createDefaultAfkSettings();
    }
    return config;
  }

  /**
   * AFK設定を永続化する
   * @param guildId 保存対象のギルドID
   * @param config 保存するAFK設定
   */
  async saveAfkSettings(guildId: string, config: AfkSettings): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        // 保存前に正規化して副作用のある参照共有を防止
        await this.guildSettingsRepository.updateAfkSettings(
          guildId,
          normalizeAfkSettings(config),
        );
        logger.debug(
          logPrefixed(
            "system:log_prefix.database",
            "afk:log.database_config_saved",
            { guildId },
          ),
        );
      },
      tDefault("afk:log.database_config_save_failed", { guildId }),
    );
  }

  /**
   * AFKチャンネルを設定し、AFK機能を有効化する
   * @param guildId 設定対象のギルドID
   * @param channelId AFKチャンネルのID
   */
  async setAfkChannel(guildId: string, channelId: string): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        // チャンネル設定とAFK有効化は repository 実装へ委譲
        await this.guildSettingsRepository.setAfkChannel(guildId, channelId);
        logger.debug(
          logPrefixed(
            "system:log_prefix.database",
            "afk:log.database_channel_set",
            { guildId, channelId },
          ),
        );
      },
      tDefault("afk:log.database_channel_set_failed", {
        guildId,
        channelId,
      }),
    );
  }
}

/**
 * AFK設定サービスを依存注入で生成する
 * @param repository 利用するリポジトリ実装
 * @returns AfkSettingsService インスタンス
 */
export function createAfkSettingsService(
  repository: IAfkSettingsRepository,
): AfkSettingsService {
  return new AfkSettingsService(repository);
}
