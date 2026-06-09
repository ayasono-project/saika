// src/bot/commands/message-delete.ts
// /message-delete コマンド定義

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { executeMessageDeleteCommand } from "../../features/message-delete/commands/messageDeleteCommand.execute";
import { MSG_DEL_COMMAND } from "../../features/message-delete/constants/messageDeleteConstants";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

/**
 * /message-delete コマンド
 * サーバー内のメッセージを一括削除する（MANAGE_MESSAGES 権限必須）
 */
export const messageDeleteCommand: Command = {
  data: (() => {
    const desc = getCommandLocalizations(
      "messageDelete",
      "message-delete.description",
    );
    const countDesc = getCommandLocalizations(
      "messageDelete",
      "message-delete.count.description",
    );
    const keywordDesc = getCommandLocalizations(
      "messageDelete",
      "message-delete.keyword.description",
    );
    const daysDesc = getCommandLocalizations(
      "messageDelete",
      "message-delete.days.description",
    );
    const afterDesc = getCommandLocalizations(
      "messageDelete",
      "message-delete.after.description",
    );
    const beforeDesc = getCommandLocalizations(
      "messageDelete",
      "message-delete.before.description",
    );

    // user / channel は条件設定ステップの SelectMenu で選択するためスラッシュコマンドオプションから除外
    return new SlashCommandBuilder()
      .setName(MSG_DEL_COMMAND.NAME)
      .setDescription(desc.base)
      .setDescriptionLocalizations(desc.localizations)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption((opt) =>
        opt
          .setName(MSG_DEL_COMMAND.OPTION.COUNT)
          .setDescription(countDesc.base)
          .setDescriptionLocalizations(countDesc.localizations)
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(1000),
      )
      .addStringOption((opt) =>
        opt
          .setName(MSG_DEL_COMMAND.OPTION.KEYWORD)
          .setDescription(keywordDesc.base)
          .setDescriptionLocalizations(keywordDesc.localizations)
          .setRequired(false),
      )
      .addIntegerOption((opt) =>
        opt
          .setName(MSG_DEL_COMMAND.OPTION.DAYS)
          .setDescription(daysDesc.base)
          .setDescriptionLocalizations(daysDesc.localizations)
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(366),
      )
      .addStringOption((opt) =>
        opt
          .setName(MSG_DEL_COMMAND.OPTION.AFTER)
          .setDescription(afterDesc.base)
          .setDescriptionLocalizations(afterDesc.localizations)
          .setRequired(false),
      )
      .addStringOption((opt) =>
        opt
          .setName(MSG_DEL_COMMAND.OPTION.BEFORE)
          .setDescription(beforeDesc.base)
          .setDescriptionLocalizations(beforeDesc.localizations)
          .setRequired(false),
      );
  })(),

  async execute(interaction) {
    try {
      await executeMessageDeleteCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 5,
};
