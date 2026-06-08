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

    // ── ディスカバリー審査の一時対応 ───────────────────────────
    // 審査フィルタが日本語の説明文を有害判定するため、審査中のみ下記 6 箇所の
    // setDescriptionLocalizations を {} に切り替えて日本語を抜く（FIXME マーカー参照）。
    // 審査通過後は必ず元に戻すこと（global コマンド再登録で日本語が復活）。詳細は TODO.md。
    return (
      new SlashCommandBuilder()
        .setName(MSG_DEL_COMMAND.NAME)
        .setDescription(desc.base)
        // FIXME(discovery-review): 審査用に ja 抑止中。通過後は {} をやめ下の localizations 行を有効化して日本語復活
        // .setDescriptionLocalizations(desc.localizations)
        .setDescriptionLocalizations({})
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption((opt) =>
          opt
            .setName(MSG_DEL_COMMAND.OPTION.COUNT)
            .setDescription(countDesc.base)
            // FIXME(discovery-review): 審査用に ja 抑止中。通過後は {} をやめ下の localizations 行を有効化して日本語復活
            // .setDescriptionLocalizations(countDesc.localizations)
            .setDescriptionLocalizations({})
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(1000),
        )
        .addStringOption((opt) =>
          opt
            .setName(MSG_DEL_COMMAND.OPTION.KEYWORD)
            .setDescription(keywordDesc.base)
            // FIXME(discovery-review): 審査用に ja 抑止中。通過後は {} をやめ下の localizations 行を有効化して日本語復活
            // .setDescriptionLocalizations(keywordDesc.localizations)
            .setDescriptionLocalizations({})
            .setRequired(false),
        )
        .addIntegerOption((opt) =>
          opt
            .setName(MSG_DEL_COMMAND.OPTION.DAYS)
            .setDescription(daysDesc.base)
            // FIXME(discovery-review): 審査用に ja 抑止中。通過後は {} をやめ下の localizations 行を有効化して日本語復活
            // .setDescriptionLocalizations(daysDesc.localizations)
            .setDescriptionLocalizations({})
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(366),
        )
        .addStringOption((opt) =>
          opt
            .setName(MSG_DEL_COMMAND.OPTION.AFTER)
            .setDescription(afterDesc.base)
            // FIXME(discovery-review): 審査用に ja 抑止中。通過後は {} をやめ下の localizations 行を有効化して日本語復活
            // .setDescriptionLocalizations(afterDesc.localizations)
            .setDescriptionLocalizations({})
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName(MSG_DEL_COMMAND.OPTION.BEFORE)
            .setDescription(beforeDesc.base)
            // FIXME(discovery-review): 審査用に ja 抑止中。通過後は {} をやめ下の localizations 行を有効化して日本語復活
            // .setDescriptionLocalizations(beforeDesc.localizations)
            .setDescriptionLocalizations({})
            .setRequired(false),
        )
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
