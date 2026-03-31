// src/bot/features/vc-recruit/handlers/ui/vcRecruitModal.ts
// VC募集モーダル送信処理（ステップ2 → VC作成・募集投稿）

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type GuildMember,
  MessageFlags,
  type ModalSubmitInteraction,
  type TextChannel,
  type VoiceChannel,
} from "discord.js";
import {
  tGuild,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotVcRecruitRepository } from "../../../../services/botCompositionRoot";
import { safeReply } from "../../../../utils/interaction";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { sendVcControlPanel } from "../../../vc-panel/vcControlPanel";
import {
  VC_RECRUIT_CONFIG_COMMAND,
  VC_RECRUIT_PANEL_COLOR,
  VC_RECRUIT_PANEL_CUSTOM_ID,
  VC_RECRUIT_POST_CUSTOM_ID,
} from "../../commands/vcRecruitConfigCommand.constants";
import {
  deleteVcRecruitSession,
  getVcRecruitSession,
  NEW_VC_VALUE,
} from "./vcRecruitPanelState";

/**
 * 募集メッセージに添付するボタン行を構築する
 * @param guildId ギルドID
 * @param recruiterId 募集投稿者のユーザーID
 * @param voiceChannelId 対象VCのチャンネルID
 * @returns ボタン行の ActionRow 配列
 */
async function buildRecruitMessageButtons(
  guildId: string,
  recruiterId: string,
  voiceChannelId: string,
): Promise<ActionRowBuilder<ButtonBuilder>[]> {
  const idSuffix = `${recruiterId}:${voiceChannelId}`;

  // 「VCに参加」リンクボタン
  const joinButton = new ButtonBuilder()
    .setLabel(await tGuild(guildId, "vcRecruit:ui.button.join_vc"))
    .setStyle(ButtonStyle.Link)
    .setURL(`https://discord.com/channels/${guildId}/${voiceChannelId}`);

  // 「VC名を変更」ボタン
  const renameButton = new ButtonBuilder()
    .setCustomId(`${VC_RECRUIT_POST_CUSTOM_ID.RENAME_VC_PREFIX}${idSuffix}`)
    .setLabel(await tGuild(guildId, "vcRecruit:ui.button.rename_vc"))
    .setStyle(ButtonStyle.Secondary);

  // 「VCを終了」ボタン
  const endButton = new ButtonBuilder()
    .setCustomId(`${VC_RECRUIT_POST_CUSTOM_ID.END_VC_PREFIX}${idSuffix}`)
    .setLabel(await tGuild(guildId, "vcRecruit:ui.button.end_vc"))
    .setStyle(ButtonStyle.Secondary);

  // 「募集を削除」ボタン
  const deleteButton = new ButtonBuilder()
    .setCustomId(`${VC_RECRUIT_POST_CUSTOM_ID.DELETE_POST_PREFIX}${idSuffix}`)
    .setLabel(await tGuild(guildId, "vcRecruit:ui.button.delete_post"))
    .setStyle(ButtonStyle.Danger);

  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      joinButton,
      renameButton,
      endButton,
      deleteButton,
    ),
  ];
}

export const vcRecruitModalHandler: ModalHandler = {
  /**
   * VC募集モーダル送信に一致するか判定する
   * @param customId インタラクションのカスタムID
   * @returns 一致する場合 true
   */
  matches(customId) {
    return customId.startsWith(VC_RECRUIT_PANEL_CUSTOM_ID.MODAL_PREFIX);
  },

  /**
   * VC募集モーダル送信を処理する（VC作成・募集メッセージ投稿・ボタン添付）
   * @param interaction モーダル送信インタラクション
   */
  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    const sessionId = interaction.customId.slice(
      VC_RECRUIT_PANEL_CUSTOM_ID.MODAL_PREFIX.length,
    );

    // セッションを取得
    const session = getVcRecruitSession(sessionId);
    if (!session) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(interaction.locale, "common:interaction.timeout"),
            { title: tInteraction(interaction.locale, "common:title_timeout") },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // モーダル入力値を取得
    const content = interaction.fields.getTextInputValue(
      "vc-recruit:content-modal-input",
    );
    const vcName =
      session.selectedVcId === NEW_VC_VALUE
        ? interaction.fields.getTextInputValue("vc-recruit:vc-name-modal-input")
        : "";

    const repo = getBotVcRecruitRepository();

    // セットアップ情報を取得
    const setup = await repo.findSetupByPanelChannelId(
      guild.id,
      session.panelChannelId,
    );
    if (!setup) {
      await safeReply(interaction, {
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "vcRecruit:user-response.not_setup",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_config_required",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = (await guild.members
      .fetch(interaction.user.id)
      .catch(() => null)) as GuildMember | null;

    let voiceChannel: VoiceChannel;

    if (session.selectedVcId === NEW_VC_VALUE) {
      // カテゴリー上限チェック
      if (setup.categoryId) {
        const cat = await guild.channels
          .fetch(setup.categoryId)
          .catch(() => null);
        if (
          cat?.type === ChannelType.GuildCategory &&
          cat.children.cache.size >=
            VC_RECRUIT_CONFIG_COMMAND.CATEGORY_CHANNEL_LIMIT
        ) {
          await interaction.editReply({
            embeds: [
              createWarningEmbed(
                tInteraction(
                  interaction.locale,
                  "vcRecruit:user-response.category_full",
                ),
                {
                  title: tInteraction(
                    interaction.locale,
                    "common:title_limit_exceeded",
                  ),
                },
              ),
            ],
          });
          deleteVcRecruitSession(sessionId);
          return;
        }
      }

      // 新規VC作成
      const channelName =
        vcName.trim() ||
        `${member?.displayName ?? interaction.user.displayName}'s Room`;

      voiceChannel = (await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        parent: setup.categoryId ?? undefined,
      })) as VoiceChannel;

      // DB に追加
      await repo.addCreatedVoiceChannelId(
        guild.id,
        setup.panelChannelId,
        voiceChannel.id,
      );

      // VC操作パネルを新規VCに送信
      await sendVcControlPanel(voiceChannel);
    } else {
      // 既存VC
      const existing = await guild.channels
        .fetch(session.selectedVcId)
        .catch(() => null);
      if (!existing || existing.type !== ChannelType.GuildVoice) {
        await interaction.editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "vcRecruit:user-response.vc_deleted",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_resource_not_found",
                ),
              },
            ),
          ],
        });
        deleteVcRecruitSession(sessionId);
        return;
      }
      voiceChannel = existing as VoiceChannel;
    }

    // 投稿チャンネルに募集メッセージを送信
    const postChannel = (await guild.channels
      .fetch(setup.postChannelId)
      .catch(() => null)) as TextChannel | null;

    let postedMessageUrl: string | null = null;

    if (postChannel && postChannel.isSendable()) {
      const mentionText =
        session.mentionRoleIds.length > 0
          ? session.mentionRoleIds.map((id) => `<@&${id}>`).join(" ")
          : "";

      const embedTitle = tInteraction(
        interaction.locale,
        "vcRecruit:embed.title.recruit_post",
      );
      const fieldContent = tInteraction(
        interaction.locale,
        "vcRecruit:embed.field.name.content",
      );
      const fieldVc = tInteraction(
        interaction.locale,
        "vcRecruit:embed.field.name.vc",
      );
      const fieldRecruiter = tInteraction(
        interaction.locale,
        "vcRecruit:embed.field.name.recruiter",
      );

      const recruitEmbed = new EmbedBuilder()
        .setTitle(embedTitle)
        .addFields(
          { name: fieldContent, value: content },
          { name: fieldVc, value: `<#${voiceChannel.id}>` },
          {
            name: fieldRecruiter,
            value: `<@${interaction.user.id}>`,
          },
        )
        .setColor(VC_RECRUIT_PANEL_COLOR)
        .setTimestamp();

      // 募集メッセージにボタンを添付して送信
      const buttonRows = await buildRecruitMessageButtons(
        guild.id,
        interaction.user.id,
        voiceChannel.id,
      );

      const message = await postChannel.send({
        content: mentionText || undefined,
        embeds: [recruitEmbed],
        components: buttonRows,
      });

      postedMessageUrl = message.url;

      // スレッドを作成
      const threadName = tInteraction(
        interaction.locale,
        "vcRecruit:embed.field.value.thread_name",
        { recruiter: member?.displayName ?? interaction.user.displayName },
      );
      await message
        .startThread({
          name: threadName,
          autoArchiveDuration: setup.threadArchiveDuration,
          reason: "vc-recruit自動スレッド",
        })
        .catch(() => null);
    }

    // 投稿者をVCへ移動
    if (member && member.voice.channel) {
      await member.voice.setChannel(voiceChannel).catch(() => null);
    }

    // セッションを削除
    deleteVcRecruitSession(sessionId);

    // エフェメラルメッセージで成功通知＋投稿リンク
    const successText = tInteraction(
      interaction.locale,
      "vcRecruit:user-response.post_success",
    );

    if (postedMessageUrl) {
      const linkLabel = tInteraction(
        interaction.locale,
        "vcRecruit:user-response.post_success_link",
      );
      const linkButton = new ButtonBuilder()
        .setLabel(linkLabel)
        .setStyle(ButtonStyle.Link)
        .setURL(postedMessageUrl);

      await interaction
        .editReply({
          embeds: [createSuccessEmbed(successText)],
          components: [
            new ActionRowBuilder<ButtonBuilder>().addComponents(linkButton),
          ],
        })
        .catch(() => null);
    } else {
      await interaction
        .editReply({
          embeds: [createSuccessEmbed(successText)],
        })
        .catch(() => null);
    }
  },
};

export { buildRecruitMessageButtons };
