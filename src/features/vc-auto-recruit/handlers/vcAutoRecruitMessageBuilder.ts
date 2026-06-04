// src/features/vc-auto-recruit/handlers/vcAutoRecruitMessageBuilder.ts
// VC自動募集の content / Embed / ボタン生成ユーティリティ

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";
import type { GuildTFunction } from "../../../shared/locale/helpers";
import {
  buildChannelJumpUrl,
  VC_AUTO_RECRUIT_BUTTON_ID,
  VC_AUTO_RECRUIT_EMBED_COLOR,
} from "../constants/vcAutoRecruit.constants";

/** カスタム募集メッセージのプレースホルダー置換に使う値 */
export interface InviteMessageParams {
  /** 参加者メンション（`<@userId>`） */
  userMention: string;
  /** 参加者のユーザー名 */
  userName: string;
  /** VC のチャンネルメンション（`<#voiceChannelId>`） */
  channelMention: string;
  /** VC 名 */
  channelName: string;
  /** サーバー名 */
  serverName: string;
}

/**
 * カスタム募集メッセージのプレースホルダーを実値へ置換する
 * @param template プレースホルダー付きテンプレート文字列
 * @param params 置換に使う値
 * @returns 置換済み文字列
 */
export function formatInviteMessage(
  template: string,
  params: InviteMessageParams,
): string {
  // {userMention} 等のプレースホルダーを content 用の実値へ置換
  return template
    .replace(/\{userMention\}/g, params.userMention)
    .replace(/\{userName\}/g, params.userName)
    .replace(/\{channelMention\}/g, params.channelMention)
    .replace(/\{channelName\}/g, params.channelName)
    .replace(/\{serverName\}/g, params.serverName);
}

/** 募集 Embed 生成に使う値 */
export interface InviteEmbedParams {
  /** 募集対象のボイスチャンネルID */
  voiceChannelId: string;
  /** 開始した人（最初の参加者）のユーザーID */
  starterUserId: string;
  /** 開始した人のアバター画像 URL */
  starterAvatarUrl: string;
}

/**
 * 募集 Embed（補足情報カード）を生成する
 * @param t ギルドロケール対応の翻訳関数
 * @param params Embed 生成に使う値
 * @returns 募集 Embed
 */
export function buildInviteEmbed(
  t: GuildTFunction,
  params: InviteEmbedParams,
): EmbedBuilder {
  // 募集文は content 側に集約し、Embed は VC・開始者を示す補足カードにする
  return new EmbedBuilder()
    .setColor(VC_AUTO_RECRUIT_EMBED_COLOR)
    .setTitle(t("vcAutoRecruit:embed.title.invite"))
    .setThumbnail(params.starterAvatarUrl)
    .addFields(
      {
        name: t("vcAutoRecruit:embed.field.name.invite_channel"),
        value: `<#${params.voiceChannelId}>`,
        inline: true,
      },
      {
        name: t("vcAutoRecruit:embed.field.name.invite_starter"),
        value: `<@${params.starterUserId}>`,
        inline: true,
      },
    )
    .setTimestamp();
}

/**
 * 「VCに参加」Link ボタンを含む ActionRow を生成する
 * @param t ギルドロケール対応の翻訳関数
 * @param guildId ギルドID
 * @param voiceChannelId 募集対象のボイスチャンネルID
 * @returns 参加ボタン入り ActionRow
 */
export function buildJoinComponents(
  t: GuildTFunction,
  guildId: string,
  voiceChannelId: string,
): ActionRowBuilder<ButtonBuilder> {
  // Link スタイルは customId を持たず URL のみ（インタラクション非発生）
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setStyle(ButtonStyle.Link)
      .setURL(buildChannelJumpUrl(guildId, voiceChannelId))
      .setEmoji("🔊")
      .setLabel(t("vcAutoRecruit:ui.button.join")),
  );
}

/**
 * 募集終了（無効化）ボタンを含む ActionRow を生成する
 * @param t ギルドロケール対応の翻訳関数
 * @returns 押下不可の「募集終了」ボタン入り ActionRow
 */
export function buildEndedComponents(
  t: GuildTFunction,
): ActionRowBuilder<ButtonBuilder> {
  // 押下不可のため customId は付与するがインタラクションは発生しない
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(VC_AUTO_RECRUIT_BUTTON_ID.ENDED)
      .setStyle(ButtonStyle.Secondary)
      .setLabel(t("vcAutoRecruit:ui.button.ended"))
      .setDisabled(true),
  );
}
