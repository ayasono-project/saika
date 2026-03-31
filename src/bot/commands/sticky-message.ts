// src/bot/commands/sticky-message.ts
// スティッキーメッセージコマンド定義

import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import {
  getChoiceLocalizations,
  getCommandLocalizations,
} from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { STICKY_MESSAGE_COMMAND } from "../features/sticky-message/commands/stickyMessageCommand.constants";
import { executeStickyMessageCommand } from "../features/sticky-message/commands/stickyMessageCommand.execute";
import type { Command } from "../types/discord";

/**
 * スティッキーメッセージコマンド
 * チャンネルの最下部に常にメッセージを固定表示する
 */
export const stickyMessageCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.description",
    );
    // set サブコマンド
    const setDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.set.description",
    );
    const setChannelDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.set.channel.description",
    );
    const setStyleDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.set.style.description",
    );
    // update サブコマンド
    const updateDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.update.description",
    );
    const updateChannelDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.update.channel.description",
    );
    const updateStyleDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.update.style.description",
    );
    // remove / view サブコマンド
    const removeDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.remove.description",
    );
    const viewDesc = getCommandLocalizations(
      "stickyMessage",
      "sticky-message.view.description",
    );

    // チョイス名のローカライゼーション
    const styleChoiceText = getChoiceLocalizations(
      "stickyMessage",
      "choice.style.text",
      STICKY_MESSAGE_COMMAND.OPTION_VALUE.TEXT,
    );
    const styleChoiceEmbed = getChoiceLocalizations(
      "stickyMessage",
      "choice.style.embed",
      STICKY_MESSAGE_COMMAND.OPTION_VALUE.EMBED,
    );

    return (
      new SlashCommandBuilder()
        .setName(STICKY_MESSAGE_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        /* ── set ── */
        .addSubcommand((sub) =>
          sub
            .setName(STICKY_MESSAGE_COMMAND.SUBCOMMAND.SET)
            .setDescription(setDesc.ja)
            .setDescriptionLocalizations(setDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(STICKY_MESSAGE_COMMAND.OPTION.CHANNEL)
                .setDescription(setChannelDesc.ja)
                .setDescriptionLocalizations(setChannelDesc.localizations)
                .setRequired(false),
            )
            .addStringOption((opt) =>
              opt
                .setName(STICKY_MESSAGE_COMMAND.OPTION.STYLE)
                .setDescription(setStyleDesc.ja)
                .setDescriptionLocalizations(setStyleDesc.localizations)
                .addChoices(styleChoiceText, styleChoiceEmbed)
                .setRequired(false),
            ),
        )
        /* ── remove ── */
        .addSubcommand((sub) =>
          sub
            .setName(STICKY_MESSAGE_COMMAND.SUBCOMMAND.REMOVE)
            .setDescription(removeDesc.ja)
            .setDescriptionLocalizations(removeDesc.localizations),
        )
        /* ── view ── */
        .addSubcommand((sub) =>
          sub
            .setName(STICKY_MESSAGE_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        /* ── update ── */
        .addSubcommand((sub) =>
          sub
            .setName(STICKY_MESSAGE_COMMAND.SUBCOMMAND.UPDATE)
            .setDescription(updateDesc.ja)
            .setDescriptionLocalizations(updateDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(STICKY_MESSAGE_COMMAND.OPTION.CHANNEL)
                .setDescription(updateChannelDesc.ja)
                .setDescriptionLocalizations(updateChannelDesc.localizations)
                .setRequired(false),
            )
            .addStringOption((opt) =>
              opt
                .setName(STICKY_MESSAGE_COMMAND.OPTION.STYLE)
                .setDescription(updateStyleDesc.ja)
                .setDescriptionLocalizations(updateStyleDesc.localizations)
                .addChoices(styleChoiceText, styleChoiceEmbed)
                .setRequired(false),
            ),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeStickyMessageCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default stickyMessageCommand;
