// チケット操作の前提確認（満たさないときは理由を返信する）。コマンドとボタン・モーダルで共通

import {
  type Guild,
  MessageFlags,
  PermissionFlagsBits,
  type PermissionsString,
  type RepliableInteraction,
  type TextChannel,
} from "discord.js";
import { createErrorEmbed } from "../../../bot/utils/messageResponse";
import type {
  GuildTicketSettings,
  ITicketRepository,
  Ticket,
} from "../../../shared/database/types";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { TICKET_CHANNEL_BOT_PERMISSIONS } from "../commands/ticketCommand.constants";
import type { TicketSettingsService } from "../ticketSettingsService";
import {
  getTicketChannelAccess,
  toBotChannelAccessMessageKey,
} from "./ticketChannelAccess";

/**
 * チケットの操作の種類（操作者に求める権限が操作ごとに違う）
 * - close_open: クローズ・再オープン。作成者・スタッフロールを持つメンバー・管理者権限を持つメンバーができる
 * - delete: 削除。スタッフロールを持つメンバー・管理者権限を持つメンバーができる（作成者だけでは削除できない）
 */
export type TicketOperation = "close_open" | "delete";

/** チケットの操作者（ボタンを押した人・コマンドを実行した人）の、権限の判定に使う情報 */
export interface TicketOperator {
  /** ユーザーID */
  userId: string;
  /** 持っているロールのID */
  roleIds: readonly string[];
  /** 管理者権限（Administrator）を持っているか（サーバーオーナーは全権限を持つ扱いなので true になる） */
  isAdministrator: boolean;
}

/** 操作の種類ごとの、操作者の権限が足りないときの案内のキー（{{staffRoles}} にスタッフロールを入れる） */
const NOT_AUTHORIZED_MESSAGE_KEYS = {
  close_open: "ticket:user-response.not_authorized_close_open",
  delete: "ticket:user-response.not_authorized_delete",
} as const satisfies Readonly<Record<TicketOperation, string>>;

/**
 * エラーの embed を操作者だけに見える形で返信する
 * @param interaction 返信先のインタラクション
 * @param message 本文
 * @param title タイトル（省略時は既定のエラーのタイトル）
 * @returns 実行完了を示す Promise
 */
async function replyEphemeralError(
  interaction: RepliableInteraction,
  message: string,
  title?: string,
): Promise<void> {
  const embed = createErrorEmbed(message, {
    locale: interaction.locale,
    title,
  });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * チケットのカテゴリの設定を取得する。無ければ、その旨を返信して null を返す
 *
 * 設定は、パネル設置チャンネルやパネルメッセージの削除、Web ダッシュボードでのパネル削除で消える
 * （チケットの記録とチャンネルは残す）。設定が無いとスタッフロールも自動削除の日数も分からないため、
 * そのカテゴリのチケットは Bot からは操作しない。返信では次の3点を案内する。
 * - 同じカテゴリを指定してパネルを設置し直すと操作できるようになる
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
 * 操作者の、権限の判定に使う情報をインタラクションから取り出す
 * @param interaction 操作者のインタラクション
 * @returns 操作者の情報
 */
function getTicketOperator(interaction: RepliableInteraction): TicketOperator {
  return {
    userId: interaction.user.id,
    // ロールはキャッシュ済みのメンバー（GuildMember）から取る。取れなければロール無しとして扱う
    roleIds: Array.from(
      interaction.member && "cache" in interaction.member.roles
        ? interaction.member.roles.cache.keys()
        : [],
    ),
    // サーバーオーナーは、Discord が全権限を持つ扱いで送ってくるので Administrator を持つ
    isAdministrator:
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ??
      false,
  };
}

/**
 * 操作者がチケットを操作できるか判定する
 *
 * 管理者権限を持つメンバーとスタッフロールを持つメンバーは、クローズ・再オープン・削除のどれもできる。
 * チケットの作成者は、クローズ・再オープンだけできる
 * @param ticket 操作対象のチケット
 * @param operator 操作者
 * @param staffRoleIds そのカテゴリのスタッフロールID
 * @param operation 操作の種類
 * @returns 操作できる場合 true
 */
export function canOperateTicket(
  ticket: Ticket,
  operator: TicketOperator,
  staffRoleIds: readonly string[],
  operation: TicketOperation,
): boolean {
  if (operator.isAdministrator) return true;
  if (operator.roleIds.some((roleId) => staffRoleIds.includes(roleId))) {
    return true;
  }
  return operation === "close_open" && ticket.userId === operator.userId;
}

/**
 * スタッフロールを、操作者の権限が足りないときの案内に入れる文字列（ロールのメンションの並び）にする
 * 案内は embed の本文なので、メンションしても通知は飛ばない。スタッフロールが1つも無い設定
 * （Web API はスタッフロールの空の配列を拒まない）では、「未設定」を入れて括弧の中を空にしない
 * @param locale 操作者の言語
 * @param staffRoleIds そのカテゴリのスタッフロールID
 * @returns 案内に入れる文字列
 */
function formatStaffRoleMentions(
  locale: string,
  staffRoleIds: readonly string[],
): string {
  if (staffRoleIds.length === 0) {
    return tInteraction(locale, "ticket:user-response.staff_roles_not_set");
  }
  return staffRoleIds
    .map((roleId) => `<@&${roleId}>`)
    .join(tInteraction(locale, "ticket:user-response.staff_roles_separator"));
}

/**
 * 操作者がチケットを操作できるか確かめる。できなければ、誰が操作できるかを返信して false を返す
 *
 * 判定は canOperateTicket に任せる（管理者権限・スタッフロール・作成者）。返信では、その操作ができる人と、
 * そのカテゴリのスタッフロールをメンションで示す（どうすれば操作できるかが分かるように）。
 * クローズ・再オープン・削除のコマンドとボタン（削除の確認を含む）の全経路で、カテゴリの設定を取得した後、
 * Bot がチャンネルを扱えるかの確認（findHandleableTicketChannelOrReply）の前に呼ぶ
 * @param interaction 操作者のインタラクション（返信先）
 * @param ticket 操作対象のチケット
 * @param config チケットのカテゴリの設定
 * @param operation 操作の種類
 * @returns 操作できる場合 true（できなければ返信したうえで false）
 */
export async function canOperateTicketOrReply(
  interaction: RepliableInteraction,
  ticket: Ticket,
  config: GuildTicketSettings,
  operation: TicketOperation,
): Promise<boolean> {
  if (
    canOperateTicket(
      ticket,
      getTicketOperator(interaction),
      config.staffRoleIds,
      operation,
    )
  ) {
    return true;
  }

  await replyEphemeralError(
    interaction,
    tInteraction(interaction.locale, NOT_AUTHORIZED_MESSAGE_KEYS[operation], {
      staffRoles: formatStaffRoleMentions(
        interaction.locale,
        config.staffRoleIds,
      ),
    }),
    tInteraction(interaction.locale, "common:title_permission_denied"),
  );
  return false;
}

/**
 * Bot がチケットのチャンネルを扱えるか確かめる。扱えなければ、理由と対処を返信して null を返す
 *
 * Bot をサーバーから外すと、Discord はチケットのチャンネルに付けていた Bot 自身への上書きを消す。
 * 入れ直した後、それより前に作ったチケットのチャンネルは、Administrator の無い Bot には見えない。
 * そのままクローズ・再オープン・削除を進めると、記録だけが変わってチャンネルの操作で失敗し、食い違いが残る。
 * Bot は見えないチャンネルの上書きを自分では直せないので、何も変えずに止め、管理者に付け直してもらうよう案内する。
 * 削除の経路では「チャンネルの管理」も確かめ（TICKET_CHANNEL_BOT_DELETE_PERMISSIONS）、それだけが無いときは
 * Bot のロールかチャンネルの権限設定を見直す案内を返す。
 * クローズ・再オープン・削除のコマンドとボタン（削除の確認を含む）の全経路で、操作者の権限を確かめた
 * （canOperateTicketOrReply）後に呼ぶ
 * @param interaction 返信先のインタラクション
 * @param guild 対象ギルド
 * @param ticket 操作対象のチケット
 * @param requiredPermissions Bot に必要な権限（削除の経路では TICKET_CHANNEL_BOT_DELETE_PERMISSIONS を渡す）
 * @returns Bot が扱えるチケットのチャンネル（扱えなければ返信したうえで null）
 */
export async function findHandleableTicketChannelOrReply(
  interaction: RepliableInteraction,
  guild: Guild,
  ticket: Ticket,
  requiredPermissions: readonly PermissionsString[] = TICKET_CHANNEL_BOT_PERMISSIONS,
): Promise<TextChannel | null> {
  const access = await getTicketChannelAccess(
    guild,
    ticket.channelId,
    requiredPermissions,
  );
  if (access.status === "handleable") return access.channel;

  logger.warn(
    logPrefixed(
      "system:log_prefix.ticket",
      "ticket:log.ticket_channel_access_missing",
      { guildId: guild.id, channelId: ticket.channelId },
    ),
  );
  await replyEphemeralError(
    interaction,
    tInteraction(interaction.locale, toBotChannelAccessMessageKey(access)),
    tInteraction(interaction.locale, "common:title_bot_permission_denied"),
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
