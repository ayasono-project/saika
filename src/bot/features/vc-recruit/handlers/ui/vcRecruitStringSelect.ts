// src/bot/features/vc-recruit/handlers/ui/vcRecruitStringSelect.ts
// VC募集のセレクトメニュー処理（メンション選択・VC選択・teardown カテゴリー選択）

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  type StringSelectMenuInteraction,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { StringSelectHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotVcRecruitRepository } from "../../../../services/botCompositionRoot";
import { STATUS_COLORS } from "../../../../utils/messageResponse";
import {
  VC_RECRUIT_PANEL_CUSTOM_ID,
  VC_RECRUIT_TEARDOWN_CUSTOM_ID,
  VC_RECRUIT_TIMEOUT,
} from "../../commands/vcRecruitConfigCommand.constants";
import { updateVcRecruitSession } from "./vcRecruitPanelState";
import {
  setTeardownConfirmSession,
  type TeardownSetupEntry,
} from "./vcRecruitTeardownState";

export const vcRecruitStringSelectHandler: StringSelectHandler = {
  /**
   * VC募集関連セレクトメニューに一致するか判定する
   * @param customId セレクトメニューの customId
   * @returns VC募集関連セレクトメニューの場合 true
   */
  matches(customId) {
    return (
      customId.startsWith(VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_MENTION_PREFIX) ||
      customId.startsWith(VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_VC_PREFIX) ||
      customId.startsWith(VC_RECRUIT_TEARDOWN_CUSTOM_ID.SELECT_PREFIX)
    );
  },

  /**
   * VC募集関連セレクトメニューのインタラクションを処理する
   * @param interaction セレクトメニューインタラクション
   */
  async execute(interaction: StringSelectMenuInteraction) {
    const { customId, values } = interaction;

    // ── teardown カテゴリー選択 ─────────────────────────────────────
    if (customId.startsWith(VC_RECRUIT_TEARDOWN_CUSTOM_ID.SELECT_PREFIX)) {
      await handleTeardownSelect(interaction, values);
      return;
    }

    // ── パネル用セレクトメニュー ────────────────────────────────────
    if (customId.startsWith(VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_MENTION_PREFIX)) {
      const interactionId = customId.slice(
        VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_MENTION_PREFIX.length,
      );
      updateVcRecruitSession(interactionId, { mentionRoleIds: values });
    } else if (
      customId.startsWith(VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_VC_PREFIX)
    ) {
      const selectedValue = values[0] ?? "";
      const interactionId = customId.slice(
        VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_VC_PREFIX.length,
      );
      updateVcRecruitSession(interactionId, { selectedVcId: selectedValue });
    }

    // Discord はセレクトメニューの操作に対してレスポンスが必要
    await interaction.deferUpdate();
  },
};

/**
 * teardown カテゴリー選択後の確認パネルを表示する
 * @param interaction セレクトメニューインタラクション
 * @param selectedPanelChannelIds 選択されたパネルチャンネルID一覧
 */
async function handleTeardownSelect(
  interaction: StringSelectMenuInteraction,
  selectedPanelChannelIds: string[],
): Promise<void> {
  const guild = interaction.guild;
  if (!guild) return;

  const guildId = guild.id;
  const repo = getBotVcRecruitRepository();

  // 選択されたパネルチャンネルIDに対応するセットアップを取得してラベルを決定
  const selectedSetups: TeardownSetupEntry[] = [];

  for (const panelChannelId of selectedPanelChannelIds) {
    const setup = await repo.findSetupByPanelChannelId(guildId, panelChannelId);
    if (!setup) continue;

    let categoryLabel: string;
    if (setup.categoryId === null) {
      categoryLabel = tInteraction(
        interaction.locale,
        "vcRecruit:ui.select.teardown_top",
      );
    } else {
      const cat = guild.channels.cache.get(setup.categoryId);
      if (cat) {
        categoryLabel = cat.name;
      } else {
        categoryLabel = tInteraction(
          interaction.locale,
          "vcRecruit:ui.select.teardown_unknown_category",
          { id: setup.categoryId },
        );
      }
    }
    selectedSetups.push({ panelChannelId, categoryLabel });
  }

  // セッションを保存
  setTeardownConfirmSession(interaction.id, { guildId, selectedSetups });

  // 確認パネル Embed を構築
  const confirmTitle = tInteraction(
    interaction.locale,
    "vcRecruit:embed.title.teardown_confirm",
  );
  const fieldCategories = tInteraction(
    interaction.locale,
    "vcRecruit:embed.field.name.teardown_categories",
  );
  const warning = tInteraction(
    interaction.locale,
    "vcRecruit:embed.description.teardown_warning",
  );

  const categoryList = selectedSetups
    .map((s) => `・${s.categoryLabel}`)
    .join("\n");

  const confirmEmbed = new EmbedBuilder()
    .setTitle(confirmTitle)
    .addFields({ name: fieldCategories, value: categoryList })
    .setDescription(`⚠️ ${warning}`)
    .setColor(STATUS_COLORS.error);

  // ボタンを構築
  const confirmLabel = tInteraction(
    interaction.locale,
    "vcRecruit:ui.button.teardown_confirm",
  );
  const cancelLabel = tInteraction(
    interaction.locale,
    "vcRecruit:ui.button.teardown_cancel",
  );

  const confirmButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_TEARDOWN_CUSTOM_ID.CONFIRM_PREFIX}${interaction.id}`,
    )
    .setLabel(confirmLabel)
    .setStyle(ButtonStyle.Danger);

  const cancelButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_TEARDOWN_CUSTOM_ID.CANCEL_PREFIX}${interaction.id}`,
    )
    .setLabel(cancelLabel)
    .setStyle(ButtonStyle.Secondary);

  const redoLabel = tInteraction(
    interaction.locale,
    "vcRecruit:ui.button.teardown_redo",
  );
  const redoButton = new ButtonBuilder()
    .setCustomId(
      `${VC_RECRUIT_TEARDOWN_CUSTOM_ID.REDO_PREFIX}${interaction.id}`,
    )
    .setLabel(redoLabel)
    .setStyle(ButtonStyle.Primary);

  await interaction.update({
    embeds: [confirmEmbed],
    components: [
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        confirmButton,
        cancelButton,
        redoButton,
      ),
    ],
  });

  // タイムアウト後にボタンを無効化
  setTimeout(() => {
    const disabledConfirm = ButtonBuilder.from(
      confirmButton.toJSON(),
    ).setDisabled(true);
    const disabledCancel = ButtonBuilder.from(
      cancelButton.toJSON(),
    ).setDisabled(true);
    const disabledRedo = ButtonBuilder.from(redoButton.toJSON()).setDisabled(
      true,
    );
    interaction
      .editReply({
        components: [
          new ActionRowBuilder<ButtonBuilder>().addComponents(
            disabledConfirm,
            disabledCancel,
            disabledRedo,
          ),
        ],
      })
      .catch(() => {});
  }, VC_RECRUIT_TIMEOUT.COMPONENT_DISABLE_MS);
}
