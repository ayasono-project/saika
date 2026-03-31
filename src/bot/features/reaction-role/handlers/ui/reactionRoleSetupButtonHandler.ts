// src/bot/features/reaction-role/handlers/ui/reactionRoleSetupButtonHandler.ts
// setup フローの「もう1つ追加」「完了」ボタンハンドラ

import {
  type ButtonInteraction,
  MessageFlags,
  type TextChannel,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import { REACTION_ROLE_CUSTOM_ID } from "../../commands/reactionRoleCommand.constants";
import {
  buildButtonSettingsModal,
  buildPanelButtonRows,
  buildPanelEmbed,
} from "../../services/reactionRolePanelBuilder";
import { reactionRoleSetupSessions } from "./reactionRoleSetupState";

/**
 * setup フローの「もう1つ追加」「完了」ボタンを処理するハンドラ
 */
export const reactionRoleSetupButtonHandler: ButtonHandler = {
  matches(customId: string) {
    return (
      customId.startsWith(REACTION_ROLE_CUSTOM_ID.SETUP_ADD_PREFIX) ||
      customId.startsWith(REACTION_ROLE_CUSTOM_ID.SETUP_DONE_PREFIX)
    );
  },

  async execute(interaction: ButtonInteraction) {
    if (
      interaction.customId.startsWith(REACTION_ROLE_CUSTOM_ID.SETUP_ADD_PREFIX)
    ) {
      await handleSetupAdd(interaction);
    } else {
      await handleSetupDone(interaction);
    }
  },
};

/**
 * 「もう1つ追加」→ ボタン設定モーダルを再表示
 * @param interaction 「もう1つ追加」ボタンのインタラクション
 */
async function handleSetupAdd(interaction: ButtonInteraction): Promise<void> {
  const sessionId = interaction.customId.slice(
    REACTION_ROLE_CUSTOM_ID.SETUP_ADD_PREFIX.length,
  );
  const session = reactionRoleSetupSessions.get(sessionId);
  if (!session) {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.session_expired",
      ),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // ボタン設定モーダルを表示
  const modal = buildButtonSettingsModal(
    REACTION_ROLE_CUSTOM_ID.SETUP_BUTTON_MODAL_PREFIX,
    sessionId,
    interaction.locale,
  );

  await interaction.showModal(modal);
}

/**
 * 「完了」→ パネルを設置
 * @param interaction 「完了」ボタンのインタラクション
 */
async function handleSetupDone(interaction: ButtonInteraction): Promise<void> {
  const sessionId = interaction.customId.slice(
    REACTION_ROLE_CUSTOM_ID.SETUP_DONE_PREFIX.length,
  );
  const session = reactionRoleSetupSessions.get(sessionId);
  if (!session) {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.session_expired",
      ),
      { locale: interaction.locale },
    );
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  await interaction.deferUpdate();

  const guildId = interaction.guildId;
  if (!guildId) return;

  const channel = interaction.channel as TextChannel | null;
  if (!channel) return;

  // パネル Embed + ボタンを構築
  const panelEmbed = buildPanelEmbed(
    session.title,
    session.description,
    session.color,
  );

  // 仮のパネルIDを使用（DB保存後に更新）
  const tempPanelId = "temp";
  const panelButtonRows = buildPanelButtonRows(tempPanelId, session.buttons);

  // パネルメッセージを送信
  const panelMessage = await channel.send({
    embeds: [panelEmbed],
    components: panelButtonRows,
  });

  // DB に設定を保存
  const configService = getBotReactionRolePanelConfigService();
  const panel = await configService.create({
    guildId,
    channelId: channel.id,
    messageId: panelMessage.id,
    mode: session.mode,
    title: session.title,
    description: session.description,
    color: session.color,
    buttons: JSON.stringify(session.buttons),
    buttonCounter: session.buttonCounter,
  });

  // パネルメッセージのボタン customId を正しいパネルIDで更新
  const finalButtonRows = buildPanelButtonRows(panel.id, session.buttons);
  await panelMessage.edit({
    components: finalButtonRows,
  });

  // セットアップフローのメッセージを削除
  await interaction.deleteReply().catch(() => null);

  // エフェメラルで成功通知（新しいフォローアップで送信）
  const successEmbed = createSuccessEmbed(
    tInteraction(
      interaction.locale,
      "reactionRole:user-response.setup_success",
    ),
    { locale: interaction.locale },
  );
  await interaction.followUp({
    embeds: [successEmbed],
    flags: MessageFlags.Ephemeral,
  });

  // セッションを削除
  reactionRoleSetupSessions.delete(sessionId);

  logger.info(
    logPrefixed("system:log_prefix.reaction_role", "reactionRole:log.setup", {
      guildId,
      channelId: channel.id,
    }),
  );
}
