// src/bot/features/reaction-role/handlers/ui/reactionRoleClickHandler.ts
// パネルボタンクリック時のロール操作ハンドラ

import {
  type ButtonInteraction,
  type GuildMember,
  MessageFlags,
} from "discord.js";
import { REACTION_ROLE_MODE } from "../../../../../shared/database/types/reactionRoleTypes";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotReactionRolePanelConfigService } from "../../../../services/botCompositionRoot";
import {
  createErrorEmbed,
  createInfoEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import {
  parseButtons,
  REACTION_ROLE_CUSTOM_ID,
} from "../../commands/reactionRoleCommand.constants";

/**
 * パネルボタンクリック時のロール操作を処理するハンドラ
 */
export const reactionRoleClickHandler: ButtonHandler = {
  matches(customId: string) {
    return customId.startsWith(REACTION_ROLE_CUSTOM_ID.CLICK_PREFIX);
  },

  async execute(interaction: ButtonInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const suffix = interaction.customId.slice(
      REACTION_ROLE_CUSTOM_ID.CLICK_PREFIX.length,
    );
    // customId からパネルIDとボタンIDを抽出
    const lastColon = suffix.lastIndexOf(":");
    if (lastColon === -1) {
      await interaction.deleteReply().catch(() => null);
      return;
    }

    const panelId = suffix.slice(0, lastColon);
    const buttonId = Number(suffix.slice(lastColon + 1));

    // パネル設定をDBから取得
    const configService = getBotReactionRolePanelConfigService();
    const panel = await configService.findById(panelId);
    if (!panel) {
      const embed = createErrorEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.panel_message_not_found",
        ),
        { locale: interaction.locale },
      );
      await interaction.editReply({ embeds: [embed] });
      return;
    }

    // クリックされたボタンの割り当てロールを特定
    const buttons = parseButtons(panel.buttons);
    const clickedButton = buttons.find((b) => b.buttonId === buttonId);
    if (!clickedButton) {
      await interaction.deleteReply().catch(() => null);
      return;
    }

    const member = interaction.member as GuildMember;
    const botMember = interaction.guild?.members.me;

    // Bot のロールより上位のロールは操作不可
    for (const roleId of clickedButton.roleIds) {
      const role = interaction.guild?.roles.cache.get(roleId);
      if (
        role &&
        botMember &&
        role.position >= botMember.roles.highest.position
      ) {
        const embed = createErrorEmbed(
          tInteraction(
            interaction.locale,
            "reactionRole:user-response.role_too_high",
          ),
          { locale: interaction.locale },
        );
        await interaction.editReply({ embeds: [embed] });
        return;
      }
    }

    const roleIds = clickedButton.roleIds;
    const roleMentions = roleIds.map((id) => `<@&${id}>`).join(", ");

    switch (panel.mode) {
      case REACTION_ROLE_MODE.TOGGLE:
        await handleToggle(interaction, member, roleIds, roleMentions);
        break;
      case REACTION_ROLE_MODE.ONE_ACTION:
        await handleOneAction(interaction, member, roleIds, roleMentions);
        break;
      case REACTION_ROLE_MODE.EXCLUSIVE:
        await handleExclusive(
          interaction,
          member,
          buttons,
          clickedButton,
          roleMentions,
        );
        break;
    }
  },
};

/**
 * toggle モード: ボタンの全ロールを一括で付与/解除
 * @param interaction ボタンクリックのインタラクション（deferReply 済み）
 * @param member ロール操作対象のギルドメンバー
 * @param roleIds 付与/解除するロールIDの配列
 * @param roleMentions 応答メッセージ用のロールメンション文字列
 */
async function handleToggle(
  interaction: ButtonInteraction,
  member: GuildMember,
  roleIds: string[],
  roleMentions: string,
): Promise<void> {
  const hasAll = roleIds.every((id) => member.roles.cache.has(id));

  try {
    if (hasAll) {
      // 全ロールを解除
      await member.roles.remove(roleIds);

      logger.info(
        logPrefixed(
          "system:log_prefix.reaction_role",
          "reactionRole:log.role_removed",
          {
            guildId: member.guild.id,
            userId: member.id,
            roleIds: roleIds.join(","),
          },
        ),
      );

      const embed = createSuccessEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.role_removed",
          {
            roles: roleMentions,
          },
        ),
        { locale: interaction.locale },
      );
      await interaction.editReply({ embeds: [embed] });
    } else {
      // 未付与のロールを付与
      const toAdd = roleIds.filter((id) => !member.roles.cache.has(id));
      await member.roles.add(toAdd);

      logger.info(
        logPrefixed(
          "system:log_prefix.reaction_role",
          "reactionRole:log.role_granted",
          {
            guildId: member.guild.id,
            userId: member.id,
            roleIds: toAdd.join(","),
          },
        ),
      );

      const embed = createSuccessEmbed(
        tInteraction(
          interaction.locale,
          "reactionRole:user-response.role_added",
          {
            roles: roleMentions,
          },
        ),
        { locale: interaction.locale },
      );
      await interaction.editReply({ embeds: [embed] });
    }
  } catch {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.role_too_high",
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });
  }
}

/**
 * one-action モード: ロールを付与（取り消し不可）
 * @param interaction ボタンクリックのインタラクション（deferReply 済み）
 * @param member ロール操作対象のギルドメンバー
 * @param roleIds 付与するロールIDの配列
 * @param roleMentions 応答メッセージ用のロールメンション文字列
 */
async function handleOneAction(
  interaction: ButtonInteraction,
  member: GuildMember,
  roleIds: string[],
  roleMentions: string,
): Promise<void> {
  const hasAll = roleIds.every((id) => member.roles.cache.has(id));

  if (hasAll) {
    const embed = createInfoEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.role_already_granted",
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  try {
    // 未付与分を付与
    const toAdd = roleIds.filter((id) => !member.roles.cache.has(id));
    await member.roles.add(toAdd);

    logger.info(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.role_granted",
        {
          guildId: member.guild.id,
          userId: member.id,
          roleIds: toAdd.join(","),
        },
      ),
    );

    const embed = createSuccessEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.role_added",
        {
          roles: roleMentions,
        },
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });
  } catch {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.role_too_high",
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });
  }
}

/**
 * exclusive モード: グループ内で1つだけ選択可能
 * @param interaction ボタンクリックのインタラクション（deferReply 済み）
 * @param member ロール操作対象のギルドメンバー
 * @param allButtons パネル内の全ボタン定義（他ボタンのロール解除用）
 * @param clickedButton クリックされたボタンの定義
 * @param roleMentions 応答メッセージ用のロールメンション文字列
 */
async function handleExclusive(
  interaction: ButtonInteraction,
  member: GuildMember,
  allButtons: { buttonId: number; roleIds: string[] }[],
  clickedButton: { buttonId: number; roleIds: string[] },
  roleMentions: string,
): Promise<void> {
  const hasAll = clickedButton.roleIds.every((id) =>
    member.roles.cache.has(id),
  );

  if (hasAll) {
    const embed = createInfoEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.role_already_selected",
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });
    return;
  }

  try {
    // 他ボタンのロールをすべて解除
    const otherRoleIds = allButtons
      .filter((b) => b.buttonId !== clickedButton.buttonId)
      .flatMap((b) => b.roleIds);
    const uniqueOtherRoleIds = [...new Set(otherRoleIds)];
    const toRemove = uniqueOtherRoleIds.filter((id) =>
      member.roles.cache.has(id),
    );

    if (toRemove.length > 0) {
      await member.roles.remove(toRemove);

      logger.info(
        logPrefixed(
          "system:log_prefix.reaction_role",
          "reactionRole:log.role_removed",
          {
            guildId: member.guild.id,
            userId: member.id,
            roleIds: toRemove.join(","),
          },
        ),
      );
    }

    // クリックしたボタンのロールを付与
    const toAdd = clickedButton.roleIds.filter(
      (id) => !member.roles.cache.has(id),
    );
    if (toAdd.length > 0) {
      await member.roles.add(toAdd);
    }

    logger.info(
      logPrefixed(
        "system:log_prefix.reaction_role",
        "reactionRole:log.role_granted",
        {
          guildId: member.guild.id,
          userId: member.id,
          roleIds: clickedButton.roleIds.join(","),
        },
      ),
    );

    const embed = createSuccessEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.role_switched",
        { roles: roleMentions },
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });
  } catch {
    const embed = createErrorEmbed(
      tInteraction(
        interaction.locale,
        "reactionRole:user-response.role_too_high",
      ),
      { locale: interaction.locale },
    );
    await interaction.editReply({ embeds: [embed] });
  }
}
