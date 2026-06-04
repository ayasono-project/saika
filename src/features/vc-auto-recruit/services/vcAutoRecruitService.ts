// src/features/vc-auto-recruit/services/vcAutoRecruitService.ts
// VC自動募集機能のイベント処理（投稿・募集終了・同期）サービス

import {
  type Channel,
  ChannelType,
  type Guild,
  type MessageMentionOptions,
  type VoiceBasedChannel,
  type VoiceState,
} from "discord.js";
import type { BotClient } from "../../../bot/client";
import type { VcAutoRecruitRef } from "../../../shared/database/types";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import { logPrefixed, tDefault } from "../../../shared/locale/localeManager";
import { executeWithLoggedError } from "../../../shared/utils/errorHandling";
import { logger } from "../../../shared/utils/logger";
import { TtlMap } from "../../../shared/utils/ttlMap";
import {
  getVacSettingsService,
  type VacSettingsService,
} from "../../vac/vacSettingsService";
import {
  VC_AUTO_RECRUIT_REPOST_COOLDOWN_MS,
  VC_AUTO_RECRUIT_ROOT_CATEGORY,
} from "../constants/vcAutoRecruit.constants";
import {
  buildEndedComponents,
  buildInviteEmbed,
  buildJoinComponents,
  formatInviteMessage,
} from "../handlers/vcAutoRecruitMessageBuilder";
import {
  getVcAutoRecruitSettingsService,
  type VcAutoRecruitSettingsService,
} from "../vcAutoRecruitSettingsService";

/** content 中のメンションを実際にピングさせるための allowedMentions 設定 */
const INVITE_ALLOWED_MENTIONS: MessageMentionOptions = {
  parse: ["users", "roles", "everyone"],
};

/**
 * VC 内の人間（Bot 以外）メンバー数を数える
 * @param channel メンバー数を数えるボイスチャンネル
 * @returns 人間メンバー数
 */
function countHumanMembers(channel: VoiceBasedChannel): number {
  return channel.members.filter((member) => !member.user.bot).size;
}

/**
 * VC自動募集機能のイベントユースケースを担当するサービス
 */
export class VcAutoRecruitService {
  private readonly settingsService: VcAutoRecruitSettingsService;
  private readonly vacSettingsService: VacSettingsService;
  /** 同一 VC への連投抑制（インメモリ・Bot 再起動でリセット） */
  private readonly repostCooldown: TtlMap<true>;

  constructor(
    settingsService: VcAutoRecruitSettingsService,
    vacSettingsService: VacSettingsService,
  ) {
    this.settingsService = settingsService;
    this.vacSettingsService = vacSettingsService;
    this.repostCooldown = new TtlMap<true>(VC_AUTO_RECRUIT_REPOST_COOLDOWN_MS);
  }

  /**
   * voiceStateUpdate を受け、募集投稿（参加）と募集終了（空室）を処理する
   * @param oldState 変更前のボイス状態
   * @param newState 変更後のボイス状態
   * @returns 実行完了を示す Promise
   */
  async handleVoiceStateUpdate(
    oldState: VoiceState,
    newState: VoiceState,
  ): Promise<void> {
    await executeWithLoggedError(async () => {
      // チャンネル変化がなければ参加/退出のいずれでもない
      if (oldState.channelId === newState.channelId) {
        return;
      }
      // 参加側（投稿）と退出側（募集終了）を順に評価
      await this.handleJoin(newState);
      await this.handleLeave(oldState);
    }, tDefault("vcAutoRecruit:log.voice_state_update_failed"));
  }

  /**
   * VC が 0人→1人 になった最初の参加時に募集メッセージを投稿する
   * @param newState 変更後のボイス状態（参加先 VC を含む）
   * @returns 実行完了を示す Promise
   */
  private async handleJoin(newState: VoiceState): Promise<void> {
    const guild = newState.guild;
    const channel = newState.channel;
    const member = newState.member;
    // 新規参加（参加先あり）かつ Bot 以外のみ対象
    if (!channel || !member || member.user.bot) {
      return;
    }

    const settings = await this.settingsService.getVcAutoRecruitSettings(
      guild.id,
    );
    // 新規投稿の発火は enabled かつ投稿先設定済みのときのみ
    if (!settings?.enabled || !settings.channelId) {
      return;
    }

    // CreateVC トリガーチャンネルは除外（VAC の中継点・滞在しない）
    const vacSettings = await this.vacSettingsService.getVacSettingsOrDefault(
      guild.id,
    );
    if (vacSettings.triggerChannelIds.includes(channel.id)) {
      return;
    }
    // AFK チャンネルへの移動は除外
    if (guild.afkChannelId && channel.id === guild.afkChannelId) {
      return;
    }

    // カテゴリ allowlist（opt-in）: 所属カテゴリ（ルート直下は "TOP"）が有効な場合のみ。
    // @everyone 可視性は判定に用いない（メンバー専用 VC を誤除外しないため）
    const categoryKey = channel.parentId ?? VC_AUTO_RECRUIT_ROOT_CATEGORY;
    if (!settings.enabledCategoryIds.includes(categoryKey)) {
      return;
    }

    // 最初の1人（人間メンバーが本人のみ）のときだけ投稿
    if (countHumanMembers(channel) !== 1) {
      return;
    }

    // 連投抑制（同一 VC・直近クールダウン内）
    if (this.repostCooldown.has(channel.id)) {
      logger.debug(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.invite_skipped_cooldown",
          { guildId: guild.id, voiceChannelId: channel.id },
        ),
      );
      return;
    }

    // 投稿先チャンネルを取得（消失時はスキップ・channelDelete で設定クリア）
    const postChannel = await guild.channels
      .fetch(settings.channelId)
      .catch(() => null);
    if (!postChannel || postChannel.type !== ChannelType.GuildText) {
      logger.warn(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.channel_not_found",
          { guildId: guild.id, channelId: settings.channelId },
        ),
      );
      return;
    }

    const t = await getGuildTranslator(guild.id);
    const channelMention = `<#${channel.id}>`;
    // 募集文は常に content として送信（カスタム未設定時はデフォルト本文）
    const content = settings.message
      ? formatInviteMessage(settings.message, {
          userMention: `<@${member.id}>`,
          userName: member.user.displayName,
          channelMention,
          channelName: channel.name,
          serverName: guild.name,
        })
      : t("vcAutoRecruit:content.invite_default", { channel: channelMention });

    // Embed は embedEnabled のときだけ付与する補足カード
    const embeds = settings.embedEnabled
      ? [
          buildInviteEmbed(t, {
            voiceChannelId: channel.id,
            starterUserId: member.id,
            starterAvatarUrl: member.user.displayAvatarURL({ size: 256 }),
          }),
        ]
      : [];

    // メンションを実際にピングさせるため allowedMentions で解析を許可
    const sent = await postChannel.send({
      content,
      embeds,
      components: [buildJoinComponents(t, guild.id, channel.id)],
      allowedMentions: INVITE_ALLOWED_MENTIONS,
    });

    // 募集終了処理のためメッセージ参照を保存
    await this.settingsService.addActiveInvite(guild.id, {
      voiceChannelId: channel.id,
      postChannelId: postChannel.id,
      messageId: sent.id,
      createdAt: Date.now(),
    });
    // 連投抑制クールダウンを記録
    this.repostCooldown.set(channel.id, true);

    logger.debug(
      logPrefixed(
        "system:log_prefix.vc_auto_recruit",
        "vcAutoRecruit:log.invite_sent",
        {
          guildId: guild.id,
          channelId: postChannel.id,
          userId: member.id,
        },
      ),
    );
  }

  /**
   * VC から全員が退出して空になった時に募集終了へ差し替える
   * @param oldState 変更前のボイス状態（退出元 VC を含む）
   * @returns 実行完了を示す Promise
   */
  private async handleLeave(oldState: VoiceState): Promise<void> {
    const guild = oldState.guild;
    const channel = oldState.channel;
    // 退出元 VC が取得できない場合は対象外（削除時は channelDelete で処理）
    if (!channel) {
      return;
    }
    // 募集終了処理は enabled に依存せず、追跡中の募集があれば実行する
    const ref = await this.settingsService.getActiveInvite(
      guild.id,
      channel.id,
    );
    if (!ref) {
      return;
    }
    // 人間メンバーが残っていれば通話継続中＝募集有効（開始者の在室は問わない）
    if (countHumanMembers(channel) > 0) {
      return;
    }
    // 最後の1人が退出して空になったので募集終了へ差し替え
    await this.closeInvite(guild, ref);
  }

  /**
   * channelDelete 時に追跡中の募集・投稿先設定を同期する
   * @param channel 削除されたチャンネル
   * @returns 実行完了を示す Promise
   */
  async handleChannelDelete(channel: Channel): Promise<void> {
    await executeWithLoggedError(async () => {
      // DM チャンネル削除は対象外
      if (channel.isDMBased()) {
        return;
      }
      const guild = channel.guild;
      const settings = await this.settingsService.getVcAutoRecruitSettings(
        guild.id,
      );
      if (!settings) {
        return;
      }

      // (a) 追跡中の VC が削除された → 募集終了へ差し替え
      const ref = settings.activeInvites.find(
        (item) => item.voiceChannelId === channel.id,
      );
      if (ref) {
        await this.closeInvite(guild, ref);
      }

      // (b) 投稿先チャンネルが削除された → 設定をクリア（残った募集は空室時に自動整理）
      if (settings.channelId === channel.id) {
        await this.settingsService.disableAndClearChannel(guild.id);
        logger.info(
          logPrefixed(
            "system:log_prefix.vc_auto_recruit",
            "vcAutoRecruit:log.channel_deleted_config_cleared",
            { guildId: guild.id, channelId: channel.id },
          ),
        );
      }

      // (c) 有効カテゴリが削除された → allowlist から除去
      if (settings.enabledCategoryIds.includes(channel.id)) {
        await this.settingsService.removeEnabledCategory(guild.id, channel.id);
        logger.info(
          logPrefixed(
            "system:log_prefix.vc_auto_recruit",
            "vcAutoRecruit:log.category_removed_by_delete",
            { guildId: guild.id, categoryId: channel.id },
          ),
        );
      }
    }, tDefault("vcAutoRecruit:log.channel_delete_failed"));
  }

  /**
   * Bot 起動時に、既に空・不在の VC の募集を募集終了へ差し替えて追跡から除去する
   * @param client Bot クライアント
   * @returns 実行完了を示す Promise
   */
  async cleanupOnStartup(client: BotClient): Promise<void> {
    await executeWithLoggedError(async () => {
      let closed = 0;
      let removed = 0;
      for (const [, guild] of client.guilds.cache) {
        const settings = await this.settingsService.getVcAutoRecruitSettings(
          guild.id,
        );
        if (!settings || settings.activeInvites.length === 0) {
          continue;
        }
        // スナップショットを走査し、closeInvite が DB を逐次更新する
        for (const ref of settings.activeInvites) {
          const channel = await guild.channels
            .fetch(ref.voiceChannelId)
            .catch(() => null);
          const isAliveVoice =
            !!channel && channel.type === ChannelType.GuildVoice;
          // VC が存在しない or 空なら募集終了へ差し替えて除去
          if (!isAliveVoice || countHumanMembers(channel) === 0) {
            await this.closeInvite(guild, ref);
            if (isAliveVoice) {
              closed++;
            } else {
              removed++;
            }
          }
        }
      }
      logger.info(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.startup_cleanup_done",
          { closed, removed },
        ),
      );
    }, tDefault("vcAutoRecruit:log.startup_cleanup_failed"));
  }

  /**
   * 募集メッセージの「VCに参加」ボタンを「募集終了」へ差し替え、追跡から除去する
   * @param guild 対象ギルド
   * @param ref 募集終了にする募集メッセージ参照
   * @returns 実行完了を示す Promise
   */
  private async closeInvite(
    guild: Guild,
    ref: VcAutoRecruitRef,
  ): Promise<void> {
    const t = await getGuildTranslator(guild.id);
    try {
      const postChannel = await guild.channels
        .fetch(ref.postChannelId)
        .catch(() => null);
      if (postChannel && postChannel.type === ChannelType.GuildText) {
        const message = await postChannel.messages
          .fetch(ref.messageId)
          .catch(() => null);
        // メッセージが既に削除済みなら編集はスキップ（追跡除去のみ行う）
        if (message) {
          await message.edit({ components: [buildEndedComponents(t)] });
        }
      }
      logger.debug(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.invite_closed",
          {
            guildId: guild.id,
            voiceChannelId: ref.voiceChannelId,
            messageId: ref.messageId,
          },
        ),
      );
    } catch (error) {
      logger.warn(
        logPrefixed(
          "system:log_prefix.vc_auto_recruit",
          "vcAutoRecruit:log.invite_close_failed",
          { guildId: guild.id, messageId: ref.messageId },
        ),
        error,
      );
    } finally {
      // 編集成否に関わらず追跡から除去（二重処理を冪等に扱う）
      await this.settingsService.removeActiveInvite(
        guild.id,
        ref.voiceChannelId,
      );
    }
  }
}

let vcAutoRecruitService: VcAutoRecruitService | undefined;
let cachedSettingsService: VcAutoRecruitSettingsService | undefined;
let cachedVacSettingsService: VacSettingsService | undefined;

/**
 * VcAutoRecruitService を依存注入で生成する
 * @param settingsService VC自動募集設定サービス
 * @param vacSettingsService VAC 設定サービス（トリガーチャンネル除外判定に使用）
 * @returns VcAutoRecruitService インスタンス
 */
export function createVcAutoRecruitService(
  settingsService: VcAutoRecruitSettingsService,
  vacSettingsService: VacSettingsService,
): VcAutoRecruitService {
  return new VcAutoRecruitService(settingsService, vacSettingsService);
}

/**
 * VcAutoRecruitService のシングルトンを取得する
 * @param settingsService 明示的に利用する設定サービス（省略時は既定）
 * @param vacSettingsService 明示的に利用する VAC 設定サービス（省略時は既定）
 * @returns VcAutoRecruitService シングルトン
 */
export function getVcAutoRecruitService(
  settingsService?: VcAutoRecruitSettingsService,
  vacSettingsService?: VacSettingsService,
): VcAutoRecruitService {
  // 依存が変わった場合のみ再生成し、それ以外はシングルトンを返す
  const resolvedSettings = settingsService ?? getVcAutoRecruitSettingsService();
  const resolvedVac = vacSettingsService ?? getVacSettingsService();
  if (
    !vcAutoRecruitService ||
    cachedSettingsService !== resolvedSettings ||
    cachedVacSettingsService !== resolvedVac
  ) {
    vcAutoRecruitService = createVcAutoRecruitService(
      resolvedSettings,
      resolvedVac,
    );
    cachedSettingsService = resolvedSettings;
    cachedVacSettingsService = resolvedVac;
  }
  return vcAutoRecruitService;
}
