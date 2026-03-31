// src/shared/features/vac/vacConfigService.ts
// VAC設定のサービス実装（Repositoryパターン準拠）

import { getVacConfigRepository } from "../../database/repositories/vacConfigRepository";
import {
  type IVacConfigRepository,
  type VacChannelPair,
  type VacConfig,
} from "../../database/types";
import { logPrefixed, tDefault } from "../../locale/localeManager";
import { executeWithDatabaseError } from "../../utils/errorHandling";
import { logger } from "../../utils/logger";
import { createServiceGetter } from "../../utils/serviceFactory";
import {
  createDefaultVacConfig,
  DEFAULT_VAC_CONFIG,
  normalizeVacConfig,
} from "./vacConfigDefaults";

export { DEFAULT_VAC_CONFIG };

/**
 * 指定VCが管理対象に含まれるか判定する
 */
function hasCreatedChannel(config: VacConfig, voiceChannelId: string): boolean {
  // 管理対象VC一覧に対象IDが存在するかを返す
  return config.createdChannels.some(
    (item) => item.voiceChannelId === voiceChannelId,
  );
}

/**
 * VAC設定の取得・更新を担当するサービス
 * DBアクセスは IVacConfigRepository 経由に統一する
 */
export class VacConfigService {
  private readonly guildConfigRepository: IVacConfigRepository;
  constructor(guildConfigRepository: IVacConfigRepository) {
    this.guildConfigRepository = guildConfigRepository;
  }

  /**
   * VAC設定を取得（未設定時は初期値を返す）
   */
  async getVacConfigOrDefault(guildId: string): Promise<VacConfig> {
    // まず永続化設定を取得
    const config = await this.guildConfigRepository.getVacConfig(guildId);
    // 未設定時は呼び出し側で null 判定不要なよう既定値を返す
    if (!config) {
      return createDefaultVacConfig();
    }

    // 呼び出し側で配列参照が共有されないよう正規化して返す
    return normalizeVacConfig(config);
  }

  /**
   * VAC設定を永続化する
   */
  async saveVacConfig(guildId: string, config: VacConfig): Promise<void> {
    // 保存前に配列を複製し、参照共有による副作用を防ぐ
    await this.guildConfigRepository.updateVacConfig(
      guildId,
      normalizeVacConfig(config),
    );
  }

  /**
   * トリガーチャンネルを追加し、VACを有効化する
   */
  async addTriggerChannel(
    guildId: string,
    channelId: string,
  ): Promise<VacConfig> {
    return executeWithDatabaseError(
      async () => {
        // 現在設定を取得し、差分がある場合のみ永続化する
        const config = await this.getVacConfigOrDefault(guildId);
        let updated = false;

        // 重複登録を避けてトリガー一覧へ追加
        if (!config.triggerChannelIds.includes(channelId)) {
          config.triggerChannelIds.push(channelId);
          updated = true;
        }

        // トリガー追加時は機能を有効化
        if (!config.enabled) {
          config.enabled = true;
          updated = true;
        }

        if (updated) {
          // saveVacConfig が失敗すると executeWithDatabaseError が例外を再スローするため、
          // return config に到達するのは保存成功時のみ
          await this.saveVacConfig(guildId, config);
          logger.debug(
            logPrefixed(
              "system:log_prefix.database",
              "vac:log.database_trigger_added",
              {
                guildId,
                channelId,
              },
            ),
          );
        }

        // 変更不要だった場合も保存成功後も、DB と一致した最新の config を返す
        return config;
      },
      tDefault("vac:log.database_trigger_add_failed", {
        guildId,
        channelId,
      }),
    );
  }

  /**
   * トリガーチャンネルを設定から削除する
   */
  async removeTriggerChannel(
    guildId: string,
    channelId: string,
  ): Promise<VacConfig> {
    return executeWithDatabaseError(
      async () => {
        // 対象ID除去前後で件数を比較し、変化時のみ保存
        const config = await this.getVacConfigOrDefault(guildId);
        const previousLength = config.triggerChannelIds.length;
        config.triggerChannelIds = config.triggerChannelIds.filter(
          (id) => id !== channelId,
        );

        if (config.triggerChannelIds.length !== previousLength) {
          // saveVacConfig が失敗すると executeWithDatabaseError が例外を再スローするため、
          // return config に到達するのは保存成功時のみ
          await this.saveVacConfig(guildId, config);
          logger.debug(
            logPrefixed(
              "system:log_prefix.database",
              "vac:log.database_trigger_removed",
              {
                guildId,
                channelId,
              },
            ),
          );
        }

        // 変更不要だった場合も保存成功後も、DB と一致した最新の config を返す
        return config;
      },
      tDefault("vac:log.database_trigger_remove_failed", {
        guildId,
        channelId,
      }),
    );
  }

  /**
   * 管理対象VC（自動作成VC）を設定に登録する
   */
  async addCreatedVacChannel(
    guildId: string,
    channel: VacChannelPair,
  ): Promise<VacConfig> {
    return executeWithDatabaseError(
      async () => {
        // 同一VCの二重登録を避けて管理対象へ追加
        const config = await this.getVacConfigOrDefault(guildId);
        const exists = hasCreatedChannel(config, channel.voiceChannelId);
        if (!exists) {
          config.createdChannels.push(channel);
          // saveVacConfig が失敗すると executeWithDatabaseError が例外を再スローするため、
          // return config に到達するのは保存成功時のみ
          await this.saveVacConfig(guildId, config);
          logger.debug(
            logPrefixed(
              "system:log_prefix.database",
              "vac:log.database_channel_registered",
              {
                guildId,
                voiceChannelId: channel.voiceChannelId,
              },
            ),
          );
        }
        // 変更不要だった場合も保存成功後も、DB と一致した最新の config を返す
        return config;
      },
      tDefault("vac:log.database_channel_register_failed", {
        guildId,
        voiceChannelId: channel.voiceChannelId,
      }),
    );
  }

  /**
   * 管理対象VC（自動作成VC）を設定から削除する
   */
  async removeCreatedVacChannel(
    guildId: string,
    voiceChannelId: string,
  ): Promise<VacConfig> {
    return executeWithDatabaseError(
      async () => {
        // 対象VC除去前後で件数を比較し、変化時のみ保存
        const config = await this.getVacConfigOrDefault(guildId);
        const previousLength = config.createdChannels.length;
        config.createdChannels = config.createdChannels.filter(
          (item) => item.voiceChannelId !== voiceChannelId,
        );

        if (config.createdChannels.length !== previousLength) {
          // saveVacConfig が失敗すると executeWithDatabaseError が例外を再スローするため、
          // return config に到達するのは保存成功時のみ
          await this.saveVacConfig(guildId, config);
          logger.debug(
            logPrefixed(
              "system:log_prefix.database",
              "vac:log.database_channel_unregistered",
              {
                guildId,
                voiceChannelId,
              },
            ),
          );
        }

        // 変更不要だった場合も保存成功後も、DB と一致した最新の config を返す
        return config;
      },
      tDefault("vac:log.database_channel_unregister_failed", {
        guildId,
        voiceChannelId,
      }),
    );
  }

  /**
   * 指定VCがVAC管理下か判定する
   */
  async isManagedVacChannel(
    guildId: string,
    voiceChannelId: string,
  ): Promise<boolean> {
    // 管理対象判定のみ必要なため、設定取得して presence を確認
    const config = await this.guildConfigRepository.getVacConfig(guildId);
    if (!config) {
      return false;
    }
    return hasCreatedChannel(config, voiceChannelId);
  }
}

/**
 * VAC設定サービスを依存注入で生成する
 */
export function createVacConfigService(
  repository: IVacConfigRepository,
): VacConfigService {
  return new VacConfigService(repository);
}

/**
 * VAC設定サービスのシングルトンを取得する
 */
export const getVacConfigService: (
  repository?: IVacConfigRepository,
) => VacConfigService = createServiceGetter(
  createVacConfigService,
  getVacConfigRepository,
);
