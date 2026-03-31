// src/bot/features/ticket/handlers/ui/ticketTeardownButtonHandler.ts
// teardown フローの確認・キャンセル・全選択ボタンハンドラ

import type { ButtonInteraction } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import { TICKET_CUSTOM_ID } from "../../commands/ticketCommand.constants";
import { cleanupTicketConfigs } from "../../services/ticketCleanupService";
import { ticketTeardownSessions } from "./ticketTeardownState";

/**
 * teardown フローの確認・キャンセル・全選択ボタンを処理するハンドラ
 */
export const ticketTeardownButtonHandler: ButtonHandler = {
  /**
   * カスタムIDが teardown 確認またはキャンセルプレフィックスに一致するか判定する
   * @param customId カスタムID
   * @returns 一致する場合 true
   */
  matches(customId: string) {
    return (
      customId.startsWith(TICKET_CUSTOM_ID.TEARDOWN_CONFIRM_PREFIX) ||
      customId.startsWith(TICKET_CUSTOM_ID.TEARDOWN_CANCEL_PREFIX)
    );
  },

  /**
   * teardown の確認・キャンセルボタンの操作を処理する
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    if (
      interaction.customId.startsWith(TICKET_CUSTOM_ID.TEARDOWN_CONFIRM_PREFIX)
    ) {
      await handleConfirm(interaction);
    } else {
      await handleCancel(interaction);
    }
  },
};

/**
 * teardown 確認処理
 * @param interaction ボタンインタラクション
 */
async function handleConfirm(interaction: ButtonInteraction): Promise<void> {
  const sessionId = interaction.customId.slice(
    TICKET_CUSTOM_ID.TEARDOWN_CONFIRM_PREFIX.length,
  );
  const session = ticketTeardownSessions.get(sessionId);
  if (!session) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.session_expired"),
      { locale: interaction.locale },
    );
    await interaction.update({
      embeds: [embed],
      components: [],
    });
    return;
  }

  const configService = getBotTicketConfigService();
  const ticketRepository = getBotTicketRepository();
  const guildId = interaction.guildId;
  const guild = interaction.guild;
  if (!guildId || !guild) return;

  // 選択されたカテゴリの設定を取得
  const configs = [];
  for (const categoryId of session.categoryIds) {
    const config = await configService.findByGuildAndCategory(
      guildId,
      categoryId,
    );
    if (config) configs.push(config);
  }

  if (configs.length === 0) {
    const embed = createErrorEmbed(
      tInteraction(interaction.locale, "ticket:user-response.config_not_found"),
      { locale: interaction.locale },
    );
    await interaction.update({
      embeds: [embed],
      components: [],
    });
    return;
  }

  // 重い処理の前に応答を遅延させる
  await interaction.deferUpdate();

  // 共通クリーンアップ処理
  await cleanupTicketConfigs(guild, configs, configService, ticketRepository);

  // セッション削除
  ticketTeardownSessions.delete(sessionId);

  for (const config of configs) {
    logger.info(
      logPrefixed("system:log_prefix.ticket", "ticket:log.teardown", {
        guildId,
        categoryId: config.categoryId,
      }),
    );
  }

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.teardown_success"),
    { locale: interaction.locale },
  );
  await interaction.editReply({
    embeds: [embed],
    components: [],
  });
}

/**
 * teardown キャンセル処理
 * @param interaction ボタンインタラクション
 */
async function handleCancel(interaction: ButtonInteraction): Promise<void> {
  const sessionId = interaction.customId.slice(
    TICKET_CUSTOM_ID.TEARDOWN_CANCEL_PREFIX.length,
  );
  ticketTeardownSessions.delete(sessionId);

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "ticket:user-response.teardown_cancelled"),
    { locale: interaction.locale },
  );
  await interaction.update({
    embeds: [embed],
    components: [],
  });
}
