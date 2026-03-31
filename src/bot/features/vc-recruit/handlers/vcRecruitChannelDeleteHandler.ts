// src/bot/features/vc-recruit/handlers/vcRecruitChannelDeleteHandler.ts
// VC募集 channelDelete ハンドラー

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Channel,
  EmbedBuilder,
  type TextChannel,
} from "discord.js";
import { logPrefixed, tGuild } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotVcRecruitRepository } from "../../../services/botCompositionRoot";
import { notifyErrorChannel } from "../../../shared/errorChannelNotifier";
import { VC_RECRUIT_POST_CUSTOM_ID } from "../commands/vcRecruitConfigCommand.constants";

const VC_RECRUIT_LOG_KEYS = {
  PANEL_CHANNEL_DELETE_DETECTED: "vcRecruit:log.panel_channel_delete_detected",
  POST_CHANNEL_DELETE_FAILED: "vcRecruit:log.post_channel_delete_failed",
  POST_CHANNEL_DELETE_DETECTED: "vcRecruit:log.post_channel_delete_detected",
  PANEL_CHANNEL_CLEANUP_FAILED: "vcRecruit:log.panel_channel_cleanup_failed",
  CREATED_VC_MANUAL_DELETE_DETECTED:
    "vcRecruit:log.created_vc_manual_delete_detected",
} as const;

/**
 * channelDelete 時にVC募集セットアップのチャンネルが削除された場合、
 * ペアのチャンネルも削除し DB のセットアップレコードを除去する。
 * また、createdVoiceChannelIds に含まれるVCが削除された場合、
 * 募集メッセージのボタンを「VC終了済み」状態に更新する。
 * @param channel 削除されたチャンネル
 */
export async function handleVcRecruitChannelDelete(
  channel: Channel,
): Promise<void> {
  if (channel.isDMBased()) return;

  const guildId = channel.guildId;
  const repo = getBotVcRecruitRepository();

  // ── パネルチャンネルとして登録されているか確認 ──────────────────────
  const setupByPanel = await repo.findSetupByPanelChannelId(
    guildId,
    channel.id,
  );
  if (setupByPanel) {
    logger.info(
      logPrefixed(
        "system:log_prefix.vc_recruit",
        VC_RECRUIT_LOG_KEYS.PANEL_CHANNEL_DELETE_DETECTED,
        {
          guildId,
          panelChannelId: channel.id,
        },
      ),
    );
    // 投稿チャンネルを削除
    const postChannel = await channel.guild.channels
      .fetch(setupByPanel.postChannelId)
      .catch(() => null);
    if (postChannel)
      await postChannel.delete().catch(async (err: unknown) => {
        logger.error(
          logPrefixed(
            "system:log_prefix.vc_recruit",
            VC_RECRUIT_LOG_KEYS.POST_CHANNEL_DELETE_FAILED,
            {
              guildId,
              postChannelId: setupByPanel.postChannelId,
            },
          ),
          { error: err },
        );
        await notifyErrorChannel(channel.guild, err, {
          feature: "VC募集",
          action: "投稿チャンネル削除失敗",
        });
      });
    // DB からセットアップを削除
    await repo.removeSetup(guildId, setupByPanel.panelChannelId);
    return;
  }

  // ── 投稿チャンネルとして登録されているか確認 ──────────────────────
  const setupByPost = await repo.findSetupByPostChannelId(guildId, channel.id);
  if (setupByPost) {
    logger.info(
      logPrefixed(
        "system:log_prefix.vc_recruit",
        VC_RECRUIT_LOG_KEYS.POST_CHANNEL_DELETE_DETECTED,
        {
          guildId,
          postChannelId: channel.id,
        },
      ),
    );
    // パネルチャンネルを削除
    const panelChannel = await channel.guild.channels
      .fetch(setupByPost.panelChannelId)
      .catch(() => null);
    if (panelChannel)
      await panelChannel.delete().catch(async (err: unknown) => {
        logger.error(
          logPrefixed(
            "system:log_prefix.vc_recruit",
            VC_RECRUIT_LOG_KEYS.PANEL_CHANNEL_CLEANUP_FAILED,
            {
              guildId,
              panelChannelId: setupByPost.panelChannelId,
            },
          ),
          { error: err },
        );
        await notifyErrorChannel(channel.guild, err, {
          feature: "VC募集",
          action: "パネルチャンネル削除失敗",
        });
      });
    // DB からセットアップを削除
    await repo.removeSetup(guildId, setupByPost.panelChannelId);
    return;
  }

  // ── createdVoiceChannelIds に含まれるVCが削除されたか確認 ──────────
  const setupByCreatedVc = await repo.findSetupByCreatedVcId(
    guildId,
    channel.id,
  );
  if (setupByCreatedVc) {
    logger.info(
      logPrefixed(
        "system:log_prefix.vc_recruit",
        VC_RECRUIT_LOG_KEYS.CREATED_VC_MANUAL_DELETE_DETECTED,
        {
          guildId,
          vcId: channel.id,
        },
      ),
    );

    // DB から該当VCのIDを削除
    await repo.removeCreatedVoiceChannelId(guildId, channel.id);

    // 募集一覧チャンネルをスキャンし、該当VCのIDを含むボタンを持つメッセージを探す
    await updatePostButtonsForDeletedVc(
      channel.guild,
      setupByCreatedVc.postChannelId,
      channel.id,
      guildId,
    );
  }
}

/**
 * 削除されたVCに紐づく募集メッセージのボタンを「VC終了済み」状態に更新する
 * @param guild ギルドオブジェクト
 * @param postChannelId 募集一覧チャンネルID
 * @param voiceChannelId 削除されたVCのチャンネルID
 * @param guildId ギルドID
 */
async function updatePostButtonsForDeletedVc(
  guild: { channels: { fetch: (id: string) => Promise<Channel | null> } },
  postChannelId: string,
  voiceChannelId: string,
  guildId: string,
): Promise<void> {
  const postChannel = (await guild.channels
    .fetch(postChannelId)
    .catch(() => null)) as TextChannel | null;
  if (!postChannel) return;

  // 直近のメッセージを取得して該当するカスタムIDを探す
  const messages = await postChannel.messages
    .fetch({ limit: 100 })
    .catch(() => null);
  if (!messages) return;

  for (const msg of messages.values()) {
    // ボタンのカスタムIDに該当VCのIDが含まれるか確認
    let hasTargetVc = false;
    let resolvedDeleteId: string | undefined;

    for (const row of msg.components) {
      if (!("components" in row)) continue;
      for (const c of row.components) {
        if ("customId" in c && c.customId?.endsWith(`:${voiceChannelId}`)) {
          hasTargetVc = true;
        }
        if (
          "customId" in c &&
          c.customId?.startsWith(VC_RECRUIT_POST_CUSTOM_ID.DELETE_POST_PREFIX)
        ) {
          resolvedDeleteId = c.customId;
        }
      }
    }

    if (!hasTargetVc) continue;

    // ボタンを「募集終了済み」状態に更新
    const endedLabel = await tGuild(guildId, "vcRecruit:ui.button.vc_ended");
    const deleteLabel = await tGuild(
      guildId,
      "vcRecruit:ui.button.delete_post",
    );
    const endedTitle = await tGuild(
      guildId,
      "vcRecruit:embed.title.recruit_post_ended",
    );

    // embedのタイトルを「募集終了」に更新
    const updatedEmbeds = msg.embeds.map((embed: unknown) =>
      EmbedBuilder.from(
        embed as Parameters<typeof EmbedBuilder.from>[0],
      ).setTitle(endedTitle),
    );

    const endedButton = new ButtonBuilder()
      .setCustomId("vc-recruit:ended-placeholder")
      .setLabel(endedLabel)
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(true);

    const deleteButton = new ButtonBuilder()
      .setCustomId(resolvedDeleteId ?? "vc-recruit:delete-fallback")
      .setLabel(deleteLabel)
      .setStyle(ButtonStyle.Danger);

    await msg
      .edit({
        embeds: updatedEmbeds,
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            endedButton,
            deleteButton,
          ),
        ],
      })
      .catch(() => null);
  }
}
