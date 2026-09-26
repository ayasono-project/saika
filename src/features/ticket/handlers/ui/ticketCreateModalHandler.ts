// チケット作成モーダル送信ハンドラ

import { MessageFlags, type ModalSubmitInteraction } from "discord.js";
import type { ModalHandler } from "../../../../bot/handlers/interactionCreate/ui/types";
import {
  getBotTicketRepository,
  getBotTicketSettingsService,
} from "../../../../bot/services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";
import { findCreatableTicketConfigOrReply } from "../../services/ticketGuards";
import { createTicketChannel } from "../../services/ticketService";

/**
 * 作成中のチケットのキー（ギルド・カテゴリ・ユーザー単位）
 *
 * 上限の確認からチケットの記録ができるまでの間は REST の往復があり、同じユーザーが別の端末から
 * ほぼ同時にモーダルを送信すると、どちらの確認も上限未満と判定して上限を超えて作れてしまう。
 * Bot は1プロセスで動くため、プロセス内の Set で1つに絞る（再起動で消えてよい）
 */
const creatingTicketKeys = new Set<string>();

/**
 * 作成中のチケットのキーを組み立てる
 * @param guildId ギルドID
 * @param categoryId チケットを作るカテゴリID
 * @param userId 作成者のユーザーID
 * @returns 排他のキー
 */
function toCreatingTicketKey(
  guildId: string,
  categoryId: string,
  userId: string,
): string {
  return `${guildId}:${categoryId}:${userId}`;
}

/**
 * チケット作成モーダルの送信を処理するハンドラ
 */
export const ticketCreateModalHandler: ModalHandler = {
  /**
   * カスタムIDがチケット作成モーダルプレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return customId.startsWith(TICKET_CUSTOM_ID.CREATE_MODAL_PREFIX);
  },

  /**
   * チケット作成モーダルの送信を処理する
   * @param interaction モーダル送信インタラクション
   */
  async execute(interaction: ModalSubmitInteraction) {
    const categoryId = interaction.customId.slice(
      TICKET_CUSTOM_ID.CREATE_MODAL_PREFIX.length,
    );
    const subject = interaction.fields.getTextInputValue(
      TICKET_CUSTOM_ID.CREATE_MODAL_SUBJECT,
    );
    const detail = interaction.fields.getTextInputValue(
      TICKET_CUSTOM_ID.CREATE_MODAL_DETAIL,
    );

    const guild = interaction.guild;
    if (!guild) return;

    const settingsService = getBotTicketSettingsService();
    const ticketRepository = getBotTicketRepository();

    // 同じユーザーが同じカテゴリのチケットを作成中なら、上限を確かめる前に断る
    // （確認とキーの登録の間に await を挟まない）
    const creatingKey = toCreatingTicketKey(
      guild.id,
      categoryId,
      interaction.user.id,
    );
    if (creatingTicketKeys.has(creatingKey)) {
      await interaction.reply({
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "ticket:user-response.ticket_creation_in_progress",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_already_running",
              ),
              locale: interaction.locale,
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }
    creatingTicketKeys.add(creatingKey);

    let created: Awaited<ReturnType<typeof createTicketChannel>>;
    try {
      // モーダルを開いた後にパネルが消えたり、別のモーダルからの作成で上限に達したりしていないか確かめ直す
      const config = await findCreatableTicketConfigOrReply(
        interaction,
        guild.id,
        categoryId,
        settingsService,
        ticketRepository,
      );
      if (!config) return;

      // チャンネル作成+権限設定+メッセージ送信で3秒を超えるため事前に応答を遅延
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      // MissingPermissions は上位の interactionErrorHandler で統一処理される
      created = await createTicketChannel(
        guild,
        categoryId,
        interaction.user.id,
        subject,
        detail,
        settingsService,
        ticketRepository,
      );
    } finally {
      // 作れた・失敗した・確認で断ったのいずれでも外す（作れた場合は記録ができているので、次の送信は上限を正しく数えられる）
      creatingTicketKeys.delete(creatingKey);
    }
    const { ticket, channel } = created;

    logger.info(
      logPrefixed("system:log_prefix.ticket", "ticket:log.ticket_created", {
        guildId: guild.id,
        channelId: channel.id,
        userId: interaction.user.id,
        ticketNumber: String(ticket.ticketNumber),
      }),
    );

    const embed = createSuccessEmbed(
      tInteraction(interaction.locale, "ticket:user-response.ticket_created", {
        channel: `<#${channel.id}>`,
      }),
      { locale: interaction.locale },
    );
    await interaction.editReply({
      embeds: [embed],
    });
  },
};
