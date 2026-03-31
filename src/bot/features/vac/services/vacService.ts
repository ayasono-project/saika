// src/bot/features/vac/services/vacService.ts
// VAC機能のビジネスロジックサービス

import { type Channel, ChannelType, type VoiceState } from "discord.js";
import {
  getVacConfigService,
  type VacConfigService,
} from "../../../../shared/features/vac/vacConfigService";
import { logPrefixed, tDefault } from "../../../../shared/locale/localeManager";
import { executeWithLoggedError } from "../../../../shared/utils/errorHandling";
import { logger } from "../../../../shared/utils/logger";
import type { BotClient } from "../../../client";
import { cleanupVacOnStartupUseCase } from "./usecases/cleanupVacOnStartup";
import { handleVacCreateUseCase } from "./usecases/handleVacCreate";
import { handleVacDeleteUseCase } from "./usecases/handleVacDelete";

/**
 * VAC機能のユースケースを担当するサービス
 */
export class VacService {
  private readonly vacRepository: VacConfigService;
  constructor(vacRepository: VacConfigService) {
    this.vacRepository = vacRepository;
  }

  /**
   * voiceStateUpdate を受け、VAC 作成/削除ユースケースを実行する
   */
  async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    await executeWithLoggedError(async () => {
      // ギルド外/状態変化なしは対象外
      if (!newState.guild || oldState.channelId === newState.channelId) {
        return;
      }

      // 入室側・退室側のユースケースを順に評価
      // 同一イベント内で create/delete を直列に処理し、競合条件を減らす
      await handleVacCreateUseCase(this.vacRepository, newState);
      await handleVacDeleteUseCase(this.vacRepository, oldState);
    }, tDefault("vac:log.voice_state_update_failed"));
  }

  /**
   * channelDelete 時に VAC 設定と管理対象チャンネル情報を同期する
   */
  async handleChannelDelete(channel: Channel): Promise<void> {
    await executeWithLoggedError(async () => {
      // DM チャンネル削除は対象外
      if (channel.isDMBased()) {
        return;
      }

      // VoiceChannel 以外の削除は VAC 同期対象外
      if (channel.type !== ChannelType.GuildVoice) {
        return;
      }

      // 現在の VAC 設定を読み込み、トリガー/生成済み情報を同期
      const config = await this.vacRepository.getVacConfigOrDefault(
        channel.guildId,
      );

      if (config.triggerChannelIds.includes(channel.id)) {
        // 削除イベントを単一の真実源に同期し、孤立トリガーを残さない
        // トリガー実体が消えた時点で設定側も必ず除去する
        await this.vacRepository.removeTriggerChannel(
          channel.guildId,
          channel.id,
        );
        logger.info(
          logPrefixed(
            "system:log_prefix.vac",
            "vac:log.trigger_removed_by_delete",
            {
              guildId: channel.guildId,
              channelId: channel.id,
            },
          ),
        );
      }

      const isManagedChannel = config.createdChannels.some(
        (item) => item.voiceChannelId === channel.id,
      );
      if (isManagedChannel) {
        // 実体削除時に createdChannels も同時に掃除する
        await this.vacRepository.removeCreatedVacChannel(
          channel.guildId,
          channel.id,
        );
      }
    }, tDefault("vac:log.channel_delete_sync_failed"));
  }

  /**
   * Bot 起動時に VAC 設定と実チャンネル状態の不整合を解消する
   */
  async cleanupOnStartup(client: BotClient): Promise<void> {
    await executeWithLoggedError(async () => {
      await cleanupVacOnStartupUseCase(this.vacRepository, client);
    }, tDefault("vac:log.startup_cleanup_failed"));
  }
}

let vacService: VacService | undefined;
let cachedRepository: VacConfigService | undefined;

/**
 * VAC サービスを依存注入で生成する
 */
export function createVacService(repository: VacConfigService): VacService {
  return new VacService(repository);
}

/**
 * VAC サービスのシングルトンを取得する
 */
export function getVacService(repository?: VacConfigService): VacService {
  // テスト時は注入サービスでモジュールキャッシュを上書きし、本番は遅延初期化を使用
  const resolved = repository ?? getVacConfigService();
  // 依存サービスが変わった場合はサービスを再生成
  if (!vacService || cachedRepository !== resolved) {
    vacService = createVacService(resolved);
    cachedRepository = resolved;
  }
  // 現在有効なシングルトンを返す
  return vacService;
}
