// src/bot/features/vc-recruit/handlers/ui/vcRecruitPostButton.ts
// 募集メッセージのボタン処理（VC名変更・VCを終了・募集を削除・確認ボタン）

import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type Message,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import {
  tGuild,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotVcRecruitRepository } from "../../../../services/botCompositionRoot";
import { safeReply } from "../../../../utils/interaction";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { VC_RECRUIT_POST_CUSTOM_ID } from "../../commands/vcRecruitConfigCommand.constants";

/**
 * 募集メッセージのカスタムIDからrecruiterIdとvoiceChannelIdを抽出する
 * @param customId カスタムID
 * @param prefix プレフィックス文字列
 * @returns recruiterId と voiceChannelId のタプル、またはパース失敗時 null
 */
function parsePostButtonIds(
  customId: string,
  prefix: string,
): { recruiterId: string; voiceChannelId: string } | null {
  const rest = customId.slice(prefix.length);
  const colonIdx = rest.indexOf(":");
  if (colonIdx === -1) return null;
  return {
    recruiterId: rest.slice(0, colonIdx),
    voiceChannelId: rest.slice(colonIdx + 1),
  };
}

/**
 * 操作権限チェック（投稿者本人 or MANAGE_CHANNELS）
 * @param interaction ボタンインタラクション
 * @param recruiterId 投稿者のユーザーID
 * @returns 権限がある場合 true
 */
function hasPostPermission(
  interaction: ButtonInteraction,
  recruiterId: string,
): boolean {
  if (interaction.user.id === recruiterId) return true;
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (member?.permissions.has(PermissionFlagsBits.ManageChannels)) return true;
  return false;
}

/**
 * 募集メッセージのボタンを「VC終了済み」状態に更新する
 * @param message 対象の募集メッセージ
 * @param guildId ギルドID
 */
async function updateToEndedState(
  message: Message,
  guildId: string,
): Promise<void> {
  const endedLabel = await tGuild(guildId, "vcRecruit:ui.button.vc_ended");
  const deleteLabel = await tGuild(guildId, "vcRecruit:ui.button.delete_post");
  const endedTitle = await tGuild(
    guildId,
    "vcRecruit:embed.title.recruit_post_ended",
  );

  // 元の削除ボタンのカスタムIDを維持
  let resolvedDeleteId: string | undefined;
  for (const row of message.components) {
    if (!("components" in row)) continue;
    for (const c of row.components) {
      if (
        "customId" in c &&
        c.customId?.startsWith(VC_RECRUIT_POST_CUSTOM_ID.DELETE_POST_PREFIX)
      ) {
        resolvedDeleteId = c.customId;
      }
    }
  }

  // embedのタイトルを「募集終了」に更新
  const updatedEmbeds = message.embeds.map((embed) =>
    EmbedBuilder.from(embed).setTitle(endedTitle),
  );

  // 募集終了済みの表示用ボタン（操作不可・customId はディスパッチされないプレースホルダー）
  const endedButton = new ButtonBuilder()
    .setCustomId("vc-recruit:ended-placeholder")
    .setLabel(endedLabel)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  // 既存の削除ボタンID が取得できなかった場合のフォールバック（通常は到達しない）
  const deleteButton = new ButtonBuilder()
    .setCustomId(resolvedDeleteId ?? "vc-recruit:delete-fallback")
    .setLabel(deleteLabel)
    .setStyle(ButtonStyle.Danger);

  await message.edit({
    embeds: updatedEmbeds,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        endedButton,
        deleteButton,
      ),
    ],
  });
}

export const vcRecruitPostButtonHandler: ButtonHandler = {
  /**
   * 募集メッセージのボタンに一致するか判定する
   * @param customId インタラクションのカスタムID
   * @returns 一致する場合 true
   */
  matches(customId) {
    return (
      customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.RENAME_VC_PREFIX) ||
      customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.END_VC_PREFIX) ||
      customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.DELETE_POST_PREFIX) ||
      customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_END_VC_PREFIX) ||
      customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.CANCEL_END_VC_PREFIX) ||
      customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_DELETE_PREFIX) ||
      customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.CANCEL_DELETE_PREFIX)
    );
  },

  /**
   * 募集メッセージのボタン押下を処理する
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    // ── ✏️ VC名を変更 ─────────────────────────────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_POST_CUSTOM_ID.RENAME_VC_PREFIX,
      )
    ) {
      await handleRenameVc(interaction);
      return;
    }

    // ── 🔇 VCを終了 ──────────────────────────────────────────────
    if (
      interaction.customId.startsWith(VC_RECRUIT_POST_CUSTOM_ID.END_VC_PREFIX)
    ) {
      await handleEndVc(interaction);
      return;
    }

    // ── 🗑️ 募集を削除 ────────────────────────────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_POST_CUSTOM_ID.DELETE_POST_PREFIX,
      )
    ) {
      await handleDeletePost(interaction);
      return;
    }

    // ── VCを終了 確認 ─────────────────────────────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_END_VC_PREFIX,
      )
    ) {
      await handleConfirmEndVc(interaction);
      return;
    }

    // ── VCを終了 キャンセル ───────────────────────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_POST_CUSTOM_ID.CANCEL_END_VC_PREFIX,
      )
    ) {
      await handleCancel(interaction);
      return;
    }

    // ── 募集を削除 確認 ───────────────────────────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_DELETE_PREFIX,
      )
    ) {
      await handleConfirmDelete(interaction);
      return;
    }

    // ── 募集を削除 キャンセル ─────────────────────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_POST_CUSTOM_ID.CANCEL_DELETE_PREFIX,
      )
    ) {
      await handleCancel(interaction);
      return;
    }
  },
};

/**
 * VC名変更ボタンの処理（モーダル表示）
 * @param interaction ボタンインタラクション
 */
async function handleRenameVc(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const parsed = parsePostButtonIds(
    interaction.customId,
    VC_RECRUIT_POST_CUSTOM_ID.RENAME_VC_PREFIX,
  );
  if (!parsed) return;

  // 権限チェック
  if (!hasPostPermission(interaction, parsed.recruiterId)) {
    await safeReply(interaction, {
      embeds: [
        createWarningEmbed(
          tInteraction(
            interaction.locale,
            "vcRecruit:user-response.no_permission",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:title_permission_denied",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // VCの存在確認
  const vc = await guild.channels
    .fetch(parsed.voiceChannelId)
    .catch(() => null);
  if (!vc || vc.type !== ChannelType.GuildVoice) {
    await safeReply(interaction, {
      embeds: [
        createWarningEmbed(
          tInteraction(
            interaction.locale,
            "vcRecruit:user-response.vc_already_deleted",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:title_resource_not_found",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // モーダルを表示（現在のVC名をプリフィル）
  const modalTitle = tInteraction(
    interaction.locale,
    "vcRecruit:ui.modal.rename_title",
  );
  const vcNameLabel = tInteraction(
    interaction.locale,
    "vcRecruit:ui.modal.rename_vc_name_label",
  );
  const vcNamePlaceholder = tInteraction(
    interaction.locale,
    "vcRecruit:ui.modal.rename_vc_name_placeholder",
  );

  const modal = new ModalBuilder()
    .setCustomId(
      `${VC_RECRUIT_POST_CUSTOM_ID.RENAME_VC_MODAL_PREFIX}${parsed.voiceChannelId}`,
    )
    .setTitle(modalTitle)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("vc-recruit:rename-vc-name-modal-input")
          .setLabel(vcNameLabel)
          .setPlaceholder(vcNamePlaceholder)
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setValue(vc.name),
      ),
    );

  await interaction.showModal(modal);
}

/**
 * VCを終了ボタンの処理（確認プロンプト表示）
 * @param interaction ボタンインタラクション
 */
async function handleEndVc(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const parsed = parsePostButtonIds(
    interaction.customId,
    VC_RECRUIT_POST_CUSTOM_ID.END_VC_PREFIX,
  );
  if (!parsed) return;

  // 権限チェック
  if (!hasPostPermission(interaction, parsed.recruiterId)) {
    await safeReply(interaction, {
      embeds: [
        createWarningEmbed(
          tInteraction(
            interaction.locale,
            "vcRecruit:user-response.no_permission",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:title_permission_denied",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const repo = getBotVcRecruitRepository();
  const isCreatedVc = await repo.isCreatedVcRecruitChannel(
    guild.id,
    parsed.voiceChannelId,
  );

  // 確認メッセージの文面を決定
  const confirmText = isCreatedVc
    ? tInteraction(interaction.locale, "vcRecruit:user-response.end_vc_created")
    : tInteraction(
        interaction.locale,
        "vcRecruit:user-response.end_vc_existing",
      );

  const confirmLabel = tInteraction(
    interaction.locale,
    "vcRecruit:ui.button.end_confirm",
  );
  const cancelLabel = tInteraction(
    interaction.locale,
    "common:ui.button.cancel",
  );

  // 元メッセージIDを確認ボタンに埋め込む
  const msgId = interaction.message.id;
  const idSuffix = `${parsed.recruiterId}:${parsed.voiceChannelId}:${msgId}`;

  const confirmButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_END_VC_PREFIX}${idSuffix}`,
    )
    .setLabel(confirmLabel)
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`${VC_RECRUIT_POST_CUSTOM_ID.CANCEL_END_VC_PREFIX}${idSuffix}`)
    .setLabel(cancelLabel)
    .setStyle(ButtonStyle.Secondary);

  await safeReply(interaction, {
    content: confirmText,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        cancelButton,
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 募集を削除ボタンの処理（確認プロンプト表示）
 * @param interaction ボタンインタラクション
 */
async function handleDeletePost(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const parsed = parsePostButtonIds(
    interaction.customId,
    VC_RECRUIT_POST_CUSTOM_ID.DELETE_POST_PREFIX,
  );
  if (!parsed) return;

  // 権限チェック
  if (!hasPostPermission(interaction, parsed.recruiterId)) {
    await safeReply(interaction, {
      embeds: [
        createWarningEmbed(
          tInteraction(
            interaction.locale,
            "vcRecruit:user-response.no_permission",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:title_permission_denied",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const repo = getBotVcRecruitRepository();
  const isCreatedVc = await repo.isCreatedVcRecruitChannel(
    guild.id,
    parsed.voiceChannelId,
  );

  // 確認メッセージの文面を決定
  const confirmText = isCreatedVc
    ? tInteraction(interaction.locale, "vcRecruit:user-response.delete_created")
    : tInteraction(
        interaction.locale,
        "vcRecruit:user-response.delete_existing",
      );

  const confirmLabel = tInteraction(
    interaction.locale,
    "vcRecruit:ui.button.delete_confirm",
  );
  const cancelLabel = tInteraction(
    interaction.locale,
    "common:ui.button.cancel",
  );

  // 元メッセージIDを確認ボタンに埋め込む
  const msgId = interaction.message.id;
  const idSuffix = `${parsed.recruiterId}:${parsed.voiceChannelId}:${msgId}`;

  const confirmButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_DELETE_PREFIX}${idSuffix}`,
    )
    .setLabel(confirmLabel)
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(`${VC_RECRUIT_POST_CUSTOM_ID.CANCEL_DELETE_PREFIX}${idSuffix}`)
    .setLabel(cancelLabel)
    .setStyle(ButtonStyle.Secondary);

  await safeReply(interaction, {
    content: confirmText,
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        cancelButton,
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 確認ボタンのIDから recruiter / voiceChannelId / messageId を抽出する
 * @param customId カスタムID
 * @param prefix プレフィックス文字列
 * @returns パース結果
 */
function parseConfirmIds(
  customId: string,
  prefix: string,
): {
  recruiterId: string;
  voiceChannelId: string;
  messageId: string;
} | null {
  const rest = customId.slice(prefix.length);
  const parts = rest.split(":");
  const recruiterId = parts[0];
  const voiceChannelId = parts[1];
  const messageId = parts[2];
  if (!recruiterId || !voiceChannelId || !messageId) return null;
  return { recruiterId, voiceChannelId, messageId };
}

/**
 * VCを終了 確認ボタンの処理
 * @param interaction ボタンインタラクション
 */
async function handleConfirmEndVc(
  interaction: ButtonInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const parsed = parseConfirmIds(
    interaction.customId,
    VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_END_VC_PREFIX,
  );
  if (!parsed) return;

  await interaction.deferUpdate();

  const repo = getBotVcRecruitRepository();
  const isCreatedVc = await repo.isCreatedVcRecruitChannel(
    guild.id,
    parsed.voiceChannelId,
  );

  // 新規作成VCなら削除
  if (isCreatedVc) {
    // DB から先に削除（channelDelete ハンドラーのスキップを保証）
    await repo.removeCreatedVoiceChannelId(guild.id, parsed.voiceChannelId);

    const vc = await guild.channels
      .fetch(parsed.voiceChannelId)
      .catch(() => null);
    if (vc) await vc.delete().catch(() => null);
  }

  // 募集メッセージのボタンを「VC終了済み」状態に更新
  const postMessage = await interaction.channel?.messages
    .fetch(parsed.messageId)
    .catch(() => null);
  if (postMessage) {
    await updateToEndedState(postMessage, guild.id);
  }

  // エフェメラルを成功メッセージに更新
  const successText = tInteraction(
    interaction.locale,
    "vcRecruit:user-response.end_vc_success",
  );
  await interaction
    .editReply({
      content: null,
      embeds: [createSuccessEmbed(successText)],
      components: [],
    })
    .catch(() => null);
}

/**
 * 募集を削除 確認ボタンの処理
 * @param interaction ボタンインタラクション
 */
async function handleConfirmDelete(
  interaction: ButtonInteraction,
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const parsed = parseConfirmIds(
    interaction.customId,
    VC_RECRUIT_POST_CUSTOM_ID.CONFIRM_DELETE_PREFIX,
  );
  if (!parsed) return;

  await interaction.deferUpdate();

  const repo = getBotVcRecruitRepository();
  const isCreatedVc = await repo.isCreatedVcRecruitChannel(
    guild.id,
    parsed.voiceChannelId,
  );

  // 新規作成VCなら削除
  if (isCreatedVc) {
    // DB から先に削除（channelDelete ハンドラーのスキップを保証）
    await repo.removeCreatedVoiceChannelId(guild.id, parsed.voiceChannelId);

    const vc = await guild.channels
      .fetch(parsed.voiceChannelId)
      .catch(() => null);
    if (vc) await vc.delete().catch(() => null);
  }

  // 募集メッセージのスレッドとメッセージを削除
  const postMessage = await interaction.channel?.messages
    .fetch(parsed.messageId)
    .catch(() => null);
  if (postMessage) {
    // スレッドを先に削除（親メッセージ削除後もスレッドは残るため明示的に削除）
    if (postMessage.thread) {
      await postMessage.thread.delete().catch(() => null);
    }
    await postMessage.delete().catch(() => null);
  }

  // エフェメラルを更新（メッセージは削除済みなので単純に閉じる）
  await interaction
    .editReply({
      content: null,
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "vcRecruit:user-response.delete_success",
          ),
        ),
      ],
      components: [],
    })
    .catch(() => null);
}

/**
 * キャンセルボタンの処理
 * @param interaction ボタンインタラクション
 */
async function handleCancel(interaction: ButtonInteraction): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;
  const cancelText = tInteraction(
    interaction.locale,
    "vcRecruit:user-response.cancelled",
  );
  await interaction
    .update({
      content: null,
      embeds: [createSuccessEmbed(cancelText)],
      components: [],
    })
    .catch(() => null);
}

export { parsePostButtonIds, updateToEndedState };
