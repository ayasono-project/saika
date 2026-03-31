// src/shared/features/afk/afkConfigService.ts
// AFK設定サービス実装（Repositoryパターン準拠）

import { getAfkConfigRepository } from "../../database/repositories/afkConfigRepository";
import {
  type AfkConfig,
  type IAfkConfigRepository,
} from "../../database/types";
import { logPrefixed, tDefault } from "../../locale/localeManager";
import { executeWithDatabaseError } from "../../utils/errorHandling";
import { logger } from "../../utils/logger";
import { createServiceGetter } from "../../utils/serviceFactory";
import {
  createDefaultAfkConfig,
  DEFAULT_AFK_CONFIG,
  normalizeAfkConfig,
} from "./afkConfigDefaults";

export type { AfkConfig };
export { DEFAULT_AFK_CONFIG };

/**
 * AFK設定の取得・更新を担当するサービス
 * DBアクセスは IAfkConfigRepository 経由に統一する
 */
export class AfkConfigService {
  private readonly guildConfigRepository: IAfkConfigRepository;
  constructor(guildConfigRepository: IAfkConfigRepository) {
    this.guildConfigRepository = guildConfigRepository;
  }

  /**
   * AFK設定を取得する
   */
  async getAfkConfig(guildId: string): Promise<AfkConfig | null> {
    // 永続化設定を取得
    const config = await this.guildConfigRepository.getAfkConfig(guildId);
    // 未設定時は null を返し、呼び出し側に初期化判断を委ねる
    if (!config) {
      return null;
    }
    // 参照共有を避けるため正規化して返す
    return normalizeAfkConfig(config);
  }

  /**
   * AFK設定を取得（未設定時は初期値を返す）
   */
  async getAfkConfigOrDefault(guildId: string): Promise<AfkConfig> {
    // 設定がなければ既定値を返し、呼び出し側の null 判定を不要化
    const config = await this.getAfkConfig(guildId);
    if (!config) {
      return createDefaultAfkConfig();
    }
    return config;
  }

  /**
   * AFK設定を永続化する
   */
  async saveAfkConfig(guildId: string, config: AfkConfig): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        // 保存前に正規化して副作用のある参照共有を防止
        await this.guildConfigRepository.updateAfkConfig(
          guildId,
          normalizeAfkConfig(config),
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
   */
  async setAfkChannel(guildId: string, channelId: string): Promise<void> {
    return executeWithDatabaseError(
      async () => {
        // チャンネル設定とAFK有効化は repository 実装へ委譲
        await this.guildConfigRepository.setAfkChannel(guildId, channelId);
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
 */
export function createAfkConfigService(
  repository: IAfkConfigRepository,
): AfkConfigService {
  return new AfkConfigService(repository);
}

/**
 * AFK設定サービスのシングルトンを取得する
 */
export const getAfkConfigService: (
  repository?: IAfkConfigRepository,
) => AfkConfigService = createServiceGetter(
  createAfkConfigService,
  getAfkConfigRepository,
);

/**
 * AFK設定を取得する
 */
export async function getAfkConfig(guildId: string): Promise<AfkConfig | null> {
  // 関数APIはシングルトンサービスへ委譲
  return getAfkConfigService().getAfkConfig(guildId);
}

/**
 * AFK設定を取得（未設定時は初期値を返す）
 */
export async function getAfkConfigOrDefault(
  guildId: string,
): Promise<AfkConfig> {
  // 関数APIはシングルトンサービスへ委譲
  return getAfkConfigService().getAfkConfigOrDefault(guildId);
}

/**
 * AFK設定を永続化する
 */
export async function saveAfkConfig(
  guildId: string,
  config: AfkConfig,
): Promise<void> {
  // 関数APIはシングルトンサービスへ委譲
  await getAfkConfigService().saveAfkConfig(guildId, config);
}

/**
 * AFKチャンネルを設定し、AFK機能を有効化する
 */
export async function setAfkChannel(
  guildId: string,
  channelId: string,
): Promise<void> {
  // 関数APIはシングルトンサービスへ委譲
  await getAfkConfigService().setAfkChannel(guildId, channelId);
}
