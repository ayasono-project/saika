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
import { notifyWarnChannel } from "../../../bot/shared/errorChannelNotifier";
import type { VcAutoRecruitRef } from "../../../shared/database/types";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import { logPrefixed, tDefault } from "../../../shared/locale/localeManager";
import { jobScheduler } from "../../../shared/scheduler/jobScheduler";
import { executeWithLoggedError } from "../../../shared/utils/errorHandling";
import { logger } from "../../../shared/utils/logger";
import {
  getVacSettingsService,
  type VacSettingsService,
} from "../../vac/vacSettingsService";
import {
  VC_AUTO_RECRUIT_DEBOUNCE_JOB_PREFIX,
  VC_AUTO_RECRUIT_JOIN_DEBOUNCE_MS,
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
 * 入室デバウンスのジョブ ID を組み立てる
 * @param voiceChannelId 対象 VC チャンネル ID
 * @returns VC ごとに一意なジョブ ID
 */
function debounceJobId(voiceChannelId: string): string {
  return `${VC_AUTO_RECRUIT_DEBOUNCE_JOB_PREFIX}${voiceChannelId}`;
}

/**
 * VC自動募集機能のイベントユースケースを担当するサービス
 */
export class VcAutoRecruitService {
  private readonly settingsService: VcAutoRecruitSettingsService;
  private readonly vacSettingsService: VacSettingsService;
  constructor(
    settingsService: VcAutoRecruitSettingsService,
    vacSettingsService: VacSettingsService,
  ) {
    this.settingsService = settingsService;
    this.vacSettingsService = vacSettingsService;
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
   * VC が 0人→1人 になった最初の参加時に、デバウンスを挟んで募集投稿を予約する
   *
   * 即投稿しないのは、間違えて入って即抜けた場合や、人がいると思って入った場合に
   * ping だけが残るため。投稿が遅れても誰も損しないが、募集終了は遅らせない
   * （空 VC を指す「VCに参加」ボタンが生き残り、誤爆を機能側から作ることになる）。
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

    // チャンネル allowlist（opt-in）: 登録済み VC チャンネルのみ投稿する
    if (!settings.enabledChannelIds.includes(channel.id)) {
      return;
    }

    // 最初の1人（人間メンバーが本人のみ）のときだけ予約
    if (countHumanMembers(channel) !== 1) {
      return;
    }

    // 同 ID の置換がそのままデバウンスになる（入り直しは予約を取り直す）
    jobScheduler.addOneTimeJob(
      debounceJobId(channel.id),
      VC_AUTO_RECRUIT_JOIN_DEBOUNCE_MS,
      () => this.postInvite(guild, channel.id, member.id),
      { quiet: true },
    );
  }

  /**
   * デバウンス満了時に条件を再判定して募集メッセージを投稿する
   *
   * 予約から発火まで間があるため、握ったチャンネル参照も設定も古くなりうる。
   * `guild.channels.fetch` で取り直してから在室判定するのは、`VoiceState.channel`
   * がキャッシュの生参照で、時間をおいて `members` を読むと信用できないため
   * （過去に二重通知バグを生んだのと同じ罠）。
   * @param guild 対象ギルド
   * @param voiceChannelId 募集対象の VC チャンネル ID
   * @param starterUserId 予約のきっかけになったメンバーの ID
   * @returns 実行完了を示す Promise
   */
  private async postInvite(
    guild: Guild,
    voiceChannelId: string,
    starterUserId: string,
  ): Promise<void> {
    const settings = await this.settingsService.getVcAutoRecruitSettings(
      guild.id,
    );
    // 待っている間に無効化・投稿先解除・allowlist 解除が起きていないか再判定
    if (!settings?.enabled || !settings.channelId) {
      return;
    }
    if (!settings.enabledChannelIds.includes(voiceChannelId)) {
      return;
    }

    // キャッシュではなく実体を取り直す（削除済みなら取得できない）
    const channel = await guild.channels
      .fetch(voiceChannelId)
      .catch(() => null);
    if (!channel?.isVoiceBased()) {
      return;
    }

    // 待っている間に全員が抜けていれば投稿しない（これが誤爆抑制の本体）
    if (countHumanMembers(channel) < 1) {
      return;
    }

    // 予約のきっかけになった本人が残っていなければ、在室者から代表を立て直す。
    // 抜けた人をメンションした募集を出さないため。
    const starter =
      channel.members.get(starterUserId) ??
      channel.members.find((m) => !m.user.bot);
    if (!starter || starter.user.bot) {
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
          userMention: `<@${starter.id}>`,
          userName: starter.user.displayName,
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
            starterUserId: starter.id,
            starterAvatarUrl: starter.user.displayAvatarURL({ size: 256 }),
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

    logger.debug(
      logPrefixed(
        "system:log_prefix.vc_auto_recruit",
        "vcAutoRecruit:log.invite_sent",
        {
          guildId: guild.id,
          channelId: postChannel.id,
          userId: starter.id,
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
    // 人間メンバーが残っていれば通話継続中＝募集有効（開始者の在室は問わない）
    if (countHumanMembers(channel) > 0) {
      return;
    }
    // 空になったので保留中の投稿予約を捨てる（入って即抜けた場合はここで止まる）
    jobScheduler.removeJob(debounceJobId(channel.id));

    // 募集終了処理は enabled に依存せず、追跡中の募集があれば実行する
    const ref = await this.settingsService.getActiveInvite(
      guild.id,
      channel.id,
    );
    if (!ref) {
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

      // 削除された VC に保留中の投稿予約があれば捨てる
      jobScheduler.removeJob(debounceJobId(channel.id));

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
        // 黙って設定が消えると投稿が止まった理由が分からないため管理者へ知らせる
        // （メンバーログと同じ扱い: エラーチャンネル＋システムチャンネル）
        await notifyWarnChannel(guild, `Channel ${channel.id} not found`, {
          feature: "VC自動募集",
          action: "投稿先チャンネル消失→設定自動リセット",
        });
        const t = await getGuildTranslator(guild.id);
        await guild.systemChannel
          ?.send({
            content: t("vcAutoRecruit:user-response.channel_deleted_notice"),
          })
          .catch(() => null);
      }

      // (c) 有効チャンネルが削除された → allowlist から除去
      if (settings.enabledChannelIds.includes(channel.id)) {
        await this.settingsService.removeEnabledChannel(guild.id, channel.id);
        logger.info(
          logPrefixed(
            "system:log_prefix.vc_auto_recruit",
            "vcAutoRecruit:log.channel_removed_by_delete",
            { guildId: guild.id, channelId: channel.id },
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
