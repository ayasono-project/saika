// src/bot/shared/vcBulkAction.ts
// /vc disconnect・/vc move・/afk の一括操作（target=channel）で共有する確認ダイアログ・実行処理・ボタンハンドラ

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  type ChatInputCommandInteraction,
  type Guild,
  MessageFlags,
  type VoiceChannel,
} from "discord.js";
import { logCommand, tInteraction } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import { TtlMap } from "../../shared/utils/ttlMap";
import type { ButtonHandler } from "../handlers/interactionCreate/ui/types";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../utils/messageResponse";
import { disableComponentsAfterTimeout } from "./disableComponentsAfterTimeout";
import {
  formatActionLog,
  formatMentionList,
  resolveAuditReason,
  type VcActionType,
} from "./vcActionLog";

/** 一括確認ダイアログの customId プレフィックスとタイムアウト */
export const VC_BULK_CONFIRM: {
  readonly CONFIRM_PREFIX: "vc-bulk:action-confirm:";
  readonly CANCEL_PREFIX: "vc-bulk:action-cancel:";
  readonly TIMEOUT_MS: number;
} = {
  CONFIRM_PREFIX: "vc-bulk:action-confirm:",
  CANCEL_PREFIX: "vc-bulk:action-cancel:",
  /** 確認ダイアログの自動キャンセルまでのタイムアウト（ミリ秒） */
  TIMEOUT_MS: 60 * 1000,
} as const;

/** 確認ダイアログ説明文に差し込む操作ラベルの i18n キー */
const BULK_ACTION_LABEL_KEYS = {
  disconnect: "vc:bulk-confirm.action.disconnect",
  move: "vc:bulk-confirm.action.move",
  afk: "vc:bulk-confirm.action.afk",
} as const;

/** 一括操作の確認待ちセッション */
export interface BulkActionSession {
  /** 操作種別 */
  action: VcActionType;
  /** 実行対象ギルドID */
  guildId: string;
  /** 実行者のユーザーID */
  invokerId: string;
  /** interaction.locale */
  locale: string;
  /** 対象VCチャンネルID */
  sourceChannelId: string;
  /** 移動先VCチャンネルID（move / afk のみ） */
  destinationChannelId?: string;
  /** ユーザー指定の理由（任意） */
  reason?: string;
}

// コマンド受付（interaction.id）と確認待ちセッションを紐づける短命ストア
const bulkActionSessions: TtlMap<BulkActionSession> =
  new TtlMap<BulkActionSession>(VC_BULK_CONFIRM.TIMEOUT_MS);

/**
 * 一括操作の確認ダイアログを ephemeral で表示する
 * @param interaction コマンド実行インタラクション
 * @param session 確認待ちセッション
 * @param memberIds コマンド受付時点の対象メンバーID一覧（スナップショット）
 * @returns 実行完了を示す Promise
 */
export async function presentBulkConfirm(
  interaction: ChatInputCommandInteraction,
  session: BulkActionSession,
  memberIds: string[],
): Promise<void> {
  bulkActionSessions.set(interaction.id, session);

  const actionLabel = tInteraction(
    session.locale,
    BULK_ACTION_LABEL_KEYS[session.action],
  );
  const description = tInteraction(
    session.locale,
    "vc:bulk-confirm.description",
    {
      channelId: session.sourceChannelId,
      action: actionLabel,
    },
  );
  const title = tInteraction(session.locale, "vc:bulk-confirm.title");

  const fields: { name: string; value: string; inline?: boolean }[] = [
    {
      name: tInteraction(session.locale, "vc:bulk-confirm.field.target"),
      value: formatMentionList(session.locale, memberIds),
      inline: false,
    },
  ];
  // 移動系は移動先を確認フィールドに表示する
  if (session.destinationChannelId) {
    fields.push({
      name: tInteraction(session.locale, "vc:bulk-confirm.field.destination"),
      value: `<#${session.destinationChannelId}>`,
      inline: true,
    });
  }

  const embed = createWarningEmbed(description, { title, fields });

  const confirmButton = new ButtonBuilder()
    .setCustomId(`${VC_BULK_CONFIRM.CONFIRM_PREFIX}${interaction.id}`)
    .setLabel(tInteraction(session.locale, "vc:ui.button.bulk_execute"))
    .setStyle(ButtonStyle.Danger);
  const cancelButton = new ButtonBuilder()
    .setCustomId(`${VC_BULK_CONFIRM.CANCEL_PREFIX}${interaction.id}`)
    .setLabel(tInteraction(session.locale, "common:ui.button.cancel"))
    .setStyle(ButtonStyle.Secondary);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    confirmButton,
    cancelButton,
  );

  await interaction.reply({
    embeds: [embed],
    components: [row],
    flags: MessageFlags.Ephemeral,
  });

  // タイムアウト後にボタンを無効化する（押下はセッション失効で別途弾く）
  disableComponentsAfterTimeout(interaction, [row], VC_BULK_CONFIRM.TIMEOUT_MS);
}

/**
 * 実行時点で対象VCのメンバーを再取得し、各メンバーに一括操作を適用する
 * @param guild 対象ギルド
 * @param session 確認待ちセッション
 * @returns 対象ユーザーID一覧と失敗ユーザーID一覧
 */
async function executeBulkVcAction(
  guild: Guild,
  session: BulkActionSession,
): Promise<{ targetUserIds: string[]; failureUserIds: string[] }> {
  const sourceChannel = await guild.channels
    .fetch(session.sourceChannelId)
    .catch(() => null);
  if (!sourceChannel || sourceChannel.type !== ChannelType.GuildVoice) {
    return { targetUserIds: [], failureUserIds: [] };
  }

  const members = [...sourceChannel.members.values()];
  const targetUserIds = members.map((m) => m.id);

  // 移動系は移動先VCを解決する。消えていた場合は全件失敗扱い
  let destinationChannel: VoiceChannel | null = null;
  if (session.destinationChannelId) {
    const dest = await guild.channels
      .fetch(session.destinationChannelId)
      .catch(() => null);
    if (!dest || dest.type !== ChannelType.GuildVoice) {
      return { targetUserIds, failureUserIds: [...targetUserIds] };
    }
    destinationChannel = dest;
  }

  const auditReason = resolveAuditReason(
    session.action,
    session.locale,
    session.reason,
  );

  // 一部メンバーで失敗しても残りは続行し、失敗内訳を記録する
  const failureUserIds: string[] = [];
  for (const member of members) {
    try {
      if (session.action === "disconnect") {
        await member.voice.disconnect(auditReason);
      } else if (destinationChannel) {
        await member.voice.setChannel(destinationChannel, auditReason);
      }
    } catch {
      failureUserIds.push(member.id);
    }
  }

  return { targetUserIds, failureUserIds };
}

/**
 * 一括確認ダイアログの「実行」「キャンセル」ボタンを処理するハンドラ
 */
export const vcBulkActionButtonHandler: ButtonHandler = {
  matches(customId) {
    return (
      customId.startsWith(VC_BULK_CONFIRM.CONFIRM_PREFIX) ||
      customId.startsWith(VC_BULK_CONFIRM.CANCEL_PREFIX)
    );
  },

  async execute(interaction) {
    const isCancel = interaction.customId.startsWith(
      VC_BULK_CONFIRM.CANCEL_PREFIX,
    );
    const prefix = isCancel
      ? VC_BULK_CONFIRM.CANCEL_PREFIX
      : VC_BULK_CONFIRM.CONFIRM_PREFIX;
    const sessionId = interaction.customId.slice(prefix.length);
    const session = bulkActionSessions.get(sessionId);

    // セッション失効（タイムアウト）時はタイムアウト応答を返す
    if (!session) {
      await interaction.update({
        embeds: [
          createWarningEmbed(
            tInteraction(interaction.locale, "common:interaction.timeout"),
            { title: tInteraction(interaction.locale, "common:title_timeout") },
          ),
        ],
        components: [],
      });
      return;
    }

    bulkActionSessions.delete(sessionId);

    if (isCancel) {
      await interaction.update({
        embeds: [
          createSuccessEmbed(
            tInteraction(interaction.locale, "common:cancelled"),
          ),
        ],
        components: [],
      });
      return;
    }

    // 実行確定：メンバー数に比例して時間がかかるため先に応答を確保する
    await interaction.deferUpdate();

    const guild = interaction.guild;
    if (!guild) {
      return;
    }

    const { targetUserIds, failureUserIds } = await executeBulkVcAction(
      guild,
      session,
    );

    // 実行時点で対象VCが空 → no-op エラー（ephemeral のまま）
    if (targetUserIds.length === 0) {
      await interaction.editReply({
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "vc:user-response.channel_empty_now",
            ),
            {
              title: tInteraction(interaction.locale, "common:title_not_in_vc"),
            },
          ),
        ],
        components: [],
      });
      return;
    }

    // 確認ダイアログ（ephemeral）のボタンを除去し、結果は public で送信する
    await interaction.editReply({ components: [] });

    const logEmbed = formatActionLog({
      action: session.action,
      locale: session.locale,
      invokerId: session.invokerId,
      sourceChannelId: session.sourceChannelId,
      targetUserIds,
      failureUserIds,
      destinationChannelId: session.destinationChannelId,
      reason: session.reason,
    });
    await interaction.followUp({ embeds: [logEmbed] });

    const commandName =
      session.action === "afk" ? "/afk" : `/vc ${session.action}`;
    logger.info(
      logCommand(commandName, "vc:log.bulk_executed", {
        guildId: session.guildId,
        action: session.action,
        channelId: session.sourceChannelId,
        count: targetUserIds.length,
        failures: failureUserIds.length,
      }),
    );
  },
};
