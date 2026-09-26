// チケット操作の前提確認（満たさないときは理由を返信する）。コマンドとボタン・モーダルで共通

import { MessageFlags, type RepliableInteraction } from "discord.js";
import { createErrorEmbed } from "../../../bot/utils/messageResponse";
import type {
  GuildTicketSettings,
  ITicketRepository,
  Ticket,
} from "../../../shared/database/types";
import { tInteraction } from "../../../shared/locale/localeManager";
import type { TicketSettingsService } from "../ticketSettingsService";

/**
 * エラーの embed を操作者だけに見える形で返信する
 * @param interaction 返信先のインタラクション
 * @param message 本文
 * @returns 実行完了を示す Promise
 */
async function replyEphemeralError(
  interaction: RepliableInteraction,
  message: string,
): Promise<void> {
  const embed = createErrorEmbed(message, { locale: interaction.locale });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * チケットのカテゴリの設定を取得する。無ければ、その旨を返信して null を返す
 *
 * 設定は、パネル設置チャンネルやパネルメッセージの削除、Web ダッシュボードでのパネル削除で消える
 * （チケットの記録とチャンネルは残す）。設定が無いとスタッフロールも自動削除の日数も分からないため、
 * そのカテゴリのチケットは Bot からは操作しない。返信では次の3点を案内する。
 * - 同じカテゴリにパネルを設置し直すと操作できるようになる
 * - ただし設定が無い間もクローズからの経過は数えるので、クローズから自動削除の日数を過ぎている
 *   チケットは、設置し直した時点で削除される（resumeAutoDeleteForCategory）
 * - 不要ならチャンネルを直接削除すれば記録も片付く
 * @param interaction 返信先のインタラクション
 * @param ticket 操作対象のチケット
 * @param settingsService チケット設定サービス
 * @returns カテゴリの設定（無ければ返信したうえで null）
 */
export async function findTicketConfigOrReply(
  interaction: RepliableInteraction,
  ticket: Ticket,
  settingsService: TicketSettingsService,
): Promise<GuildTicketSettings | null> {
  const config = await settingsService.findByGuildAndCategory(
    ticket.guildId,
    ticket.categoryId,
  );
  if (config) return config;

  await replyEphemeralError(
    interaction,
    tInteraction(
      interaction.locale,
      "ticket:user-response.ticket_config_missing",
    ),
  );
  return null;
}

/**
 * 操作者がこのカテゴリにチケットを作れるか確かめる。作れなければ理由を返信して null を返す
 *
 * パネルの設定が無いとき、または操作者がこのカテゴリで同時作成の上限に達しているときは作れない。
 * 作成ボタンでモーダルを開く前と、モーダルの送信時の両方で確かめる（ボタンを続けて押すと、
 * 上限に達する前に開いたモーダルが複数残り、送信のたびに作れてしまうため）
 * @param interaction 返信先のインタラクション（操作者は interaction.user）
 * @param guildId ギルドID
 * @param categoryId チケットを作るカテゴリID
 * @param settingsService チケット設定サービス
 * @param ticketRepository チケットリポジトリ
 * @returns カテゴリの設定（作れなければ返信したうえで null）
 */
export async function findCreatableTicketConfigOrReply(
  interaction: RepliableInteraction,
  guildId: string,
  categoryId: string,
  settingsService: TicketSettingsService,
  ticketRepository: ITicketRepository,
): Promise<GuildTicketSettings | null> {
  const config = await settingsService.findByGuildAndCategory(
    guildId,
    categoryId,
  );
  if (!config) {
    await replyEphemeralError(
      interaction,
      tInteraction(interaction.locale, "ticket:user-response.panel_not_found"),
    );
    return null;
  }

  const openTickets = await ticketRepository.findOpenByUserAndCategory(
    guildId,
    categoryId,
    interaction.user.id,
  );
  if (openTickets.length >= config.maxTicketsPerUser) {
    await replyEphemeralError(
      interaction,
      tInteraction(
        interaction.locale,
        "ticket:user-response.max_tickets_reached",
        { max: config.maxTicketsPerUser },
      ),
    );
    return null;
  }

  return config;
}
