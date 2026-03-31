// src/bot/features/message-delete/commands/usecases/runConditionSetupStep.ts
// 条件設定フェーズ: UserSelectMenu / ChannelSelectMenu でユーザー・チャンネルを選択

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
  ComponentType,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import {
  createInfoEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import {
  type ConditionSetupResult,
  MSG_DEL_CONDITION_STEP_TIMEOUT_MS,
  MSG_DEL_CUSTOM_ID,
  MSG_DEL_MODAL_TIMEOUT_MS,
  MSG_DEL_SELECT_MAX_OPTIONS,
} from "../../constants/messageDeleteConstants";

/**
 * 条件設定フェーズを表示し、ユーザー・チャンネルの選択結果を返す
 *
 * UserSelectMenu（最大25人）と ChannelSelectMenu（最大25チャンネル）を Ephemeral で表示し、
 * 「スキャン開始」ボタン押下で選択結果を返す。3分のタイムアウトを持つ。
 * スキャン開始ボタンの interaction を返すことで、後続フェーズが fresh な 15分 token を使えるようにする。
 *
 * @param interaction deferReply 済みの ChatInputCommandInteraction
 * @param hasSlashCommandFilter スラッシュコマンドオプションでフィルタ条件が1つ以上指定されているか
 * @returns 条件設定の結果（キャンセル/タイムアウト時は null）
 */
export async function runConditionSetupStep(
  interaction: ChatInputCommandInteraction,
  hasSlashCommandFilter: boolean,
): Promise<ConditionSetupResult | null> {
  // 選択状態を保持（セレクトメニューの interaction ごとに更新）
  let selectedUserIds: string[] = [];
  let selectedChannelIds: string[] = [];
  let webhookIds: string[] = [];

  // Row 1: UserSelectMenu
  const userSelect = new UserSelectMenuBuilder()
    .setCustomId(MSG_DEL_CUSTOM_ID.SELECT_USER)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "messageDelete:ui.select.condition_user_placeholder",
      ),
    )
    .setMinValues(0)
    .setMaxValues(MSG_DEL_SELECT_MAX_OPTIONS);

  // Row 2: ChannelSelectMenu
  const channelSelect = new ChannelSelectMenuBuilder()
    .setCustomId(MSG_DEL_CUSTOM_ID.SELECT_CHANNEL)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "messageDelete:ui.select.condition_channel_placeholder",
      ),
    )
    .setMinValues(0)
    .setMaxValues(MSG_DEL_SELECT_MAX_OPTIONS)
    .setChannelTypes(
      ChannelType.GuildText,
      ChannelType.GuildAnnouncement,
      ChannelType.AnnouncementThread,
      ChannelType.PublicThread,
      ChannelType.PrivateThread,
      ChannelType.GuildVoice,
    );

  // Row 3: ボタン（スキャン開始・Webhook ID 入力・キャンセル）
  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(MSG_DEL_CUSTOM_ID.START_SCAN)
      .setEmoji("🔍")
      .setLabel(
        tInteraction(interaction.locale, "messageDelete:ui.button.start_scan"),
      )
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(MSG_DEL_CUSTOM_ID.WEBHOOK_INPUT)
      .setEmoji("📩")
      .setLabel(
        tInteraction(
          interaction.locale,
          "messageDelete:ui.button.webhook_input",
        ),
      )
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(MSG_DEL_CUSTOM_ID.COND_CANCEL)
      .setEmoji("❌")
      .setLabel(
        tInteraction(
          interaction.locale,
          "messageDelete:ui.button.condition_cancel",
        ),
      )
      .setStyle(ButtonStyle.Secondary),
  );

  // 条件設定 UI を表示
  const message = await interaction.editReply({
    embeds: [
      createInfoEmbed(
        tInteraction(
          interaction.locale,
          "messageDelete:embed.title.condition_step",
        ),
      ),
    ],
    components: [
      new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(userSelect),
      new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(
        channelSelect,
      ),
      buttonRow,
    ],
    content: "",
  });

  // コレクターで操作を待機（3分タイムアウト）
  const collector = message.createMessageComponentCollector({
    time: MSG_DEL_CONDITION_STEP_TIMEOUT_MS,
  });

  return new Promise<ConditionSetupResult | null>((resolve) => {
    let resolved = false;

    /* istanbul ignore start -- Discord.js collector callback */
    collector.on("collect", async (i) => {
      // 実行者本人以外の操作は無視
      if (i.user.id !== interaction.user.id) {
        await i.deferUpdate().catch(() => {});
        return;
      }

      const { customId } = i;

      // UserSelectMenu
      if (
        customId === MSG_DEL_CUSTOM_ID.SELECT_USER &&
        i.componentType === ComponentType.UserSelect
      ) {
        selectedUserIds = [...i.values];
        await i.deferUpdate().catch(() => {});
        return;
      }

      // ChannelSelectMenu
      if (
        customId === MSG_DEL_CUSTOM_ID.SELECT_CHANNEL &&
        i.componentType === ComponentType.ChannelSelect
      ) {
        selectedChannelIds = [...i.values];
        await i.deferUpdate().catch(() => {});
        return;
      }

      // Webhook ID 入力ボタン
      if (customId === MSG_DEL_CUSTOM_ID.WEBHOOK_INPUT) {
        const modal = new ModalBuilder()
          .setCustomId(MSG_DEL_CUSTOM_ID.MODAL_WEBHOOK)
          .setTitle(
            tInteraction(
              interaction.locale,
              "messageDelete:ui.modal.webhook_title",
            ),
          )
          .addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder()
                .setCustomId(MSG_DEL_CUSTOM_ID.MODAL_INPUT_WEBHOOK)
                .setLabel(
                  tInteraction(
                    interaction.locale,
                    "messageDelete:ui.modal.webhook_label",
                  ),
                )
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder(
                  tInteraction(
                    interaction.locale,
                    "messageDelete:ui.modal.webhook_placeholder",
                  ),
                ),
            ),
          );

        await i.showModal(modal);
        const submit = await i
          .awaitModalSubmit({ time: MSG_DEL_MODAL_TIMEOUT_MS })
          .catch(() => null);
        if (!submit) return;

        const webhookId = submit.fields
          .getTextInputValue(MSG_DEL_CUSTOM_ID.MODAL_INPUT_WEBHOOK)
          .trim();

        // バリデーション: 17〜20桁の数字
        if (!/^\d{17,20}$/.test(webhookId)) {
          await submit.reply({
            embeds: [
              createWarningEmbed(
                tInteraction(
                  i.locale,
                  "messageDelete:user-response.webhook_invalid_format",
                ),
                { title: tInteraction(i.locale, "common:title_invalid_input") },
              ),
            ],
            ephemeral: true,
          });
          return;
        }

        // 重複を排除してリストに追加
        if (!webhookIds.includes(webhookId)) {
          webhookIds.push(webhookId);
        }
        await submit.deferUpdate().catch(() => {});
        return;
      }

      // スキャン開始ボタン
      if (customId === MSG_DEL_CUSTOM_ID.START_SCAN) {
        // フィルタ条件の最終バリデーション
        const hasUserFilter =
          selectedUserIds.length > 0 || webhookIds.length > 0;
        if (!hasSlashCommandFilter && !hasUserFilter) {
          await i.reply({
            embeds: [
              createWarningEmbed(
                tInteraction(
                  i.locale,
                  "messageDelete:user-response.condition_step_no_filter",
                ),
                {
                  title: tInteraction(i.locale, "common:title_filter_required"),
                },
              ),
            ],
            ephemeral: true,
          });
          return;
        }

        await i.deferUpdate().catch(() => {});
        resolved = true;
        collector.stop("start_scan");
        resolve({
          targetUserIds: [...selectedUserIds, ...webhookIds],
          channelIds: selectedChannelIds,
          scanInteraction: i,
        });
        return;
      }

      // キャンセルボタン
      if (customId === MSG_DEL_CUSTOM_ID.COND_CANCEL) {
        await i.deferUpdate().catch(() => {});
        resolved = true;
        collector.stop("cancel");

        await interaction
          .editReply({
            embeds: [
              createInfoEmbed(
                tInteraction(
                  interaction.locale,
                  "messageDelete:user-response.cancelled",
                ),
              ),
            ],
            components: [],
            content: "",
          })
          .catch(() => {});

        resolve(null);
        return;
      }
    });
    /* istanbul ignore stop */

    /* istanbul ignore start -- Discord.js collector callback */
    collector.on("end", async (_collected, _reason) => {
      if (resolved) return;

      // タイムアウト: コンポーネントを無効化してメッセージを更新
      await interaction
        .editReply({
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "messageDelete:user-response.condition_step_timeout",
              ),
              {
                title: tInteraction(interaction.locale, "common:title_timeout"),
              },
            ),
          ],
          components: [],
          content: "",
        })
        .catch(() => {});

      resolve(null);
    });
    /* istanbul ignore stop */
  });
}
