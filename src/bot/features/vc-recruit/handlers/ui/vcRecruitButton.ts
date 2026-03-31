// src/bot/features/vc-recruit/handlers/ui/vcRecruitButton.ts
// VC募集パネルのボタン処理（「VC募集を作成」・「次へ」・teardown 確認ボタン）

import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  ChannelType,
  DiscordAPIError,
  EmbedBuilder,
  MessageFlags,
  ModalBuilder,
  RESTJSONErrorCodes,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
  type VoiceChannel,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import {
  getBotVacConfigService,
  getBotVcRecruitRepository,
} from "../../../../services/botCompositionRoot";
import { safeReply } from "../../../../utils/interaction";
import {
  createSuccessEmbed,
  createWarningEmbed,
  STATUS_COLORS,
} from "../../../../utils/messageResponse";
import { buildTeardownSelectOptions } from "../../commands/usecases/vcRecruitConfigTeardown";
import {
  VC_RECRUIT_CONTENT_MAX_LENGTH,
  VC_RECRUIT_PANEL_CUSTOM_ID,
  VC_RECRUIT_TEARDOWN_CUSTOM_ID,
  VC_RECRUIT_TIMEOUT,
} from "../../commands/vcRecruitConfigCommand.constants";
import {
  getVcRecruitSession,
  NEW_VC_VALUE,
  setVcRecruitSession,
} from "./vcRecruitPanelState";
import {
  deleteTeardownConfirmSession,
  getTeardownConfirmSession,
} from "./vcRecruitTeardownState";

export const vcRecruitButtonHandler: ButtonHandler = {
  /**
   * VC募集ボタン（パネル生成ボタン・次へボタン・teardown ボタン）に一致するか判定する
   * @param customId ボタンの customId
   * @returns VC募集関連ボタンの場合 true
   */
  matches(customId) {
    return (
      customId.startsWith(VC_RECRUIT_PANEL_CUSTOM_ID.CREATE_BUTTON_PREFIX) ||
      customId.startsWith(
        VC_RECRUIT_PANEL_CUSTOM_ID.MODAL_OPEN_BUTTON_PREFIX,
      ) ||
      customId.startsWith(VC_RECRUIT_TEARDOWN_CUSTOM_ID.CONFIRM_PREFIX) ||
      customId.startsWith(VC_RECRUIT_TEARDOWN_CUSTOM_ID.CANCEL_PREFIX) ||
      customId.startsWith(VC_RECRUIT_TEARDOWN_CUSTOM_ID.REDO_PREFIX)
    );
  },

  /**
   * VC募集ボタンのインタラクションを処理する
   * @param interaction ボタンインタラクション
   */
  async execute(interaction: ButtonInteraction) {
    const guild = interaction.guild;
    if (!guild) return;

    // ── 「VC募集を作成」ボタン → ステップ1 セレクトメニュー表示 ─────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_PANEL_CUSTOM_ID.CREATE_BUTTON_PREFIX,
      )
    ) {
      const panelChannelId = interaction.customId.slice(
        VC_RECRUIT_PANEL_CUSTOM_ID.CREATE_BUTTON_PREFIX.length,
      );

      const repo = getBotVcRecruitRepository();

      // パネルチャンネルの存在確認
      const panelChannel = await guild.channels
        .fetch(panelChannelId)
        .catch(() => null);
      if (!panelChannel) {
        await safeReply(interaction, {
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "vcRecruit:user-response.panel_channel_not_found",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_channel_not_found",
                ),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // セットアップ情報確認
      const setup = await repo.findSetupByPanelChannelId(
        guild.id,
        panelChannelId,
      );
      if (!setup) {
        await safeReply(interaction, {
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "vcRecruit:user-response.not_setup",
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_config_required",
                ),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // ── メンション候補ロールのセレクトメニューを構築 ────────────
      const config = await repo.getVcRecruitConfigOrDefault(guild.id);

      const mentionOptions: StringSelectMenuOptionBuilder[] = [];

      for (const roleId of config.mentionRoleIds.slice(0, 25)) {
        const role = guild.roles.cache.get(roleId);
        if (role) {
          mentionOptions.push(
            new StringSelectMenuOptionBuilder()
              .setValue(roleId)
              .setLabel(`@${role.name}`),
          );
        }
      }

      // メンション候補がある場合のみセレクトメニューを構築
      let mentionSelect: StringSelectMenuBuilder | null = null;
      if (mentionOptions.length > 0) {
        mentionSelect = new StringSelectMenuBuilder()
          .setCustomId(
            `${VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_MENTION_PREFIX}${interaction.id}`,
          )
          .setPlaceholder(
            tInteraction(
              interaction.locale,
              "vcRecruit:ui.select.mention_placeholder",
            ),
          )
          .setMinValues(0)
          .setMaxValues(mentionOptions.length)
          .addOptions(mentionOptions);
      }

      // ── VCセレクトメニューを構築 ────────────────────────────────
      const vacConfig = await getBotVacConfigService().getVacConfigOrDefault(
        guild.id,
      );
      const vacTriggerIds = new Set(vacConfig.triggerChannelIds);

      const existingVcs = guild.channels.cache
        .filter(
          (ch): ch is VoiceChannel =>
            ch.type === ChannelType.GuildVoice &&
            (ch.parentId ?? null) === (setup.categoryId ?? null) &&
            !vacTriggerIds.has(ch.id),
        )
        .sort((a, b) => a.position - b.position)
        .toJSON();

      const newVcLabel = tInteraction(
        interaction.locale,
        "vcRecruit:ui.select.new_vc",
      );

      const vcOptions: StringSelectMenuOptionBuilder[] = [
        new StringSelectMenuOptionBuilder()
          .setValue(NEW_VC_VALUE)
          .setLabel(newVcLabel)
          .setDefault(true),
        ...existingVcs
          .slice(0, 24)
          .map((vc) =>
            new StringSelectMenuOptionBuilder()
              .setValue(vc.id)
              .setLabel(`🔊 ${vc.name}`),
          ),
      ];

      const vcSelect = new StringSelectMenuBuilder()
        .setCustomId(
          `${VC_RECRUIT_PANEL_CUSTOM_ID.SELECT_VC_PREFIX}${interaction.id}`,
        )
        .setPlaceholder(
          tInteraction(
            interaction.locale,
            "vcRecruit:ui.select.vc_placeholder",
          ),
        )
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(vcOptions);

      // ── 「次へ（詳細入力）」ボタンを構築 ──────────────────────────
      const openModalLabel = tInteraction(
        interaction.locale,
        "vcRecruit:ui.button.open_modal",
      );
      const openModalButton = new ButtonBuilder()
        .setCustomId(
          `${VC_RECRUIT_PANEL_CUSTOM_ID.MODAL_OPEN_BUTTON_PREFIX}${interaction.id}`,
        )
        .setLabel(openModalLabel)
        .setStyle(ButtonStyle.Primary);

      // ── セッション保存（panelChannelId・デフォルト選択状態） ────
      setVcRecruitSession(interaction.id, {
        panelChannelId,
        mentionRoleIds: [],
        selectedVcId: NEW_VC_VALUE,
        createdAt: Date.now(),
      });

      // ── ステップ1 エフェメラルを送信 ──────────────────────────
      const step1Title = tInteraction(
        interaction.locale,
        "vcRecruit:embed.title.select_step",
      );
      const step1Description = tInteraction(
        interaction.locale,
        "vcRecruit:embed.description.select_step",
      );

      const components: (
        | ActionRowBuilder<StringSelectMenuBuilder>
        | ActionRowBuilder<ButtonBuilder>
      )[] = [];
      if (mentionSelect) {
        components.push(
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            mentionSelect,
          ),
        );
      }
      components.push(
        new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(vcSelect),
        new ActionRowBuilder<ButtonBuilder>().addComponents(openModalButton),
      );

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(step1Title)
            .setDescription(step1Description)
            .setColor(STATUS_COLORS.info),
        ],
        components,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // ── 「次へ（詳細入力）」ボタン → モーダル表示 ────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_PANEL_CUSTOM_ID.MODAL_OPEN_BUTTON_PREFIX,
      )
    ) {
      const sessionId = interaction.customId.slice(
        VC_RECRUIT_PANEL_CUSTOM_ID.MODAL_OPEN_BUTTON_PREFIX.length,
      );

      // セッションを確認（タイムアウト検知）
      const session = getVcRecruitSession(sessionId);
      if (!session) {
        await safeReply(interaction, {
          embeds: [
            createWarningEmbed(
              tInteraction(interaction.locale, "common:interaction.timeout"),
              {
                title: tInteraction(interaction.locale, "common:title_timeout"),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const modalTitle = tInteraction(
        interaction.locale,
        "vcRecruit:ui.modal.create_title",
      );
      const contentLabel = tInteraction(
        interaction.locale,
        "vcRecruit:ui.modal.content_label",
      );
      const contentPlaceholder = tInteraction(
        interaction.locale,
        "vcRecruit:ui.modal.content_placeholder",
      );

      const modal = new ModalBuilder()
        .setCustomId(`${VC_RECRUIT_PANEL_CUSTOM_ID.MODAL_PREFIX}${sessionId}`)
        .setTitle(modalTitle)
        .addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("vc-recruit:content-modal-input")
              .setLabel(contentLabel)
              .setPlaceholder(contentPlaceholder)
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
              .setMaxLength(VC_RECRUIT_CONTENT_MAX_LENGTH),
          ),
        );

      // 新規VC作成が選択されている場合のみ VC名フィールドを追加
      if (session.selectedVcId === NEW_VC_VALUE) {
        const vcNameLabel = tInteraction(
          interaction.locale,
          "vcRecruit:ui.modal.vc_name_label",
        );
        const vcNamePlaceholder = tInteraction(
          interaction.locale,
          "vcRecruit:ui.modal.vc_name_placeholder",
        );
        modal.addComponents(
          new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder()
              .setCustomId("vc-recruit:vc-name-modal-input")
              .setLabel(vcNameLabel)
              .setPlaceholder(vcNamePlaceholder)
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
              .setMaxLength(100),
          ),
        );
      }

      await interaction.showModal(modal);
      return;
    }

    // ── teardown 選び直すボタン ──────────────────────────────────────
    if (
      interaction.customId.startsWith(VC_RECRUIT_TEARDOWN_CUSTOM_ID.REDO_PREFIX)
    ) {
      const selectInteractionId = interaction.customId.slice(
        VC_RECRUIT_TEARDOWN_CUSTOM_ID.REDO_PREFIX.length,
      );
      deleteTeardownConfirmSession(selectInteractionId);

      // teardown select menu を再構築する
      const repo = getBotVcRecruitRepository();
      const config = await repo.getVcRecruitConfigOrDefault(guild.id);
      const options = buildTeardownSelectOptions(
        guild,
        interaction.locale,
        config.setups,
      );

      const placeholder = tInteraction(
        interaction.locale,
        "vcRecruit:ui.select.teardown_placeholder",
      );

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(
          `${VC_RECRUIT_TEARDOWN_CUSTOM_ID.SELECT_PREFIX}${interaction.id}`,
        )
        .setPlaceholder(placeholder)
        .setMinValues(1)
        .setMaxValues(Math.min(config.setups.length, 25))
        .addOptions(options);

      await interaction.update({
        embeds: [],
        components: [
          new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
            selectMenu,
          ),
        ],
      });

      // タイムアウト後にセレクトメニューを無効化
      setTimeout(() => {
        const disabledMenu = StringSelectMenuBuilder.from(
          selectMenu.toJSON(),
        ).setDisabled(true);
        interaction
          .editReply({
            components: [
              new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
                disabledMenu,
              ),
            ],
          })
          .catch(() => {});
      }, VC_RECRUIT_TIMEOUT.COMPONENT_DISABLE_MS);

      return;
    }

    if (
      interaction.customId.startsWith(
        VC_RECRUIT_TEARDOWN_CUSTOM_ID.CANCEL_PREFIX,
      )
    ) {
      const selectInteractionId = interaction.customId.slice(
        VC_RECRUIT_TEARDOWN_CUSTOM_ID.CANCEL_PREFIX.length,
      );
      deleteTeardownConfirmSession(selectInteractionId);

      const cancelledText = tInteraction(
        interaction.locale,
        "vcRecruit:user-response.teardown_cancelled",
      );
      await interaction.update({
        embeds: [createSuccessEmbed(cancelledText)],
        components: [],
      });
      return;
    }

    // ── teardown 撤去するボタン ──────────────────────────────────────
    if (
      interaction.customId.startsWith(
        VC_RECRUIT_TEARDOWN_CUSTOM_ID.CONFIRM_PREFIX,
      )
    ) {
      const selectInteractionId = interaction.customId.slice(
        VC_RECRUIT_TEARDOWN_CUSTOM_ID.CONFIRM_PREFIX.length,
      );

      const session = getTeardownConfirmSession(selectInteractionId);
      if (!session) {
        await safeReply(interaction, {
          embeds: [
            createWarningEmbed(
              tInteraction(interaction.locale, "common:interaction.timeout"),
              {
                title: tInteraction(interaction.locale, "common:title_timeout"),
              },
            ),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      deleteTeardownConfirmSession(selectInteractionId);
      await interaction.deferUpdate();

      const repo = getBotVcRecruitRepository();
      const successLines: string[] = [];
      const errorLines: string[] = [];

      for (const entry of session.selectedSetups) {
        try {
          const setup = await repo.findSetupByPanelChannelId(
            session.guildId,
            entry.panelChannelId,
          );
          if (!setup) {
            // DBにレコードがない場合はスキップ
            continue;
          }

          // DB からセットアップを削除（先に行うことで messageDelete/channelDelete の自己修復ループを防ぐ）
          await repo.removeSetup(session.guildId, entry.panelChannelId);

          // パネルチャンネルのピン留めメッセージを削除
          if (setup.panelMessageId) {
            const panelCh = guild.channels.cache.get(setup.panelChannelId);
            if (panelCh?.isTextBased()) {
              const msg = await panelCh.messages
                .fetch(setup.panelMessageId)
                .catch(() => null);
              if (msg) await msg.delete().catch(() => null);
            }
          }

          // パネルチャンネルを削除
          const panelChannel = await guild.channels
            .fetch(setup.panelChannelId)
            .catch(() => null);
          if (panelChannel) {
            await panelChannel.delete().catch((err: unknown) => {
              if (
                err instanceof DiscordAPIError &&
                err.code === RESTJSONErrorCodes.UnknownChannel
              )
                return;
              throw err;
            });
          }

          // 投稿チャンネルを削除
          const postChannel = await guild.channels
            .fetch(setup.postChannelId)
            .catch(() => null);
          if (postChannel) {
            await postChannel.delete().catch((err: unknown) => {
              if (
                err instanceof DiscordAPIError &&
                err.code === RESTJSONErrorCodes.UnknownChannel
              )
                return;
              throw err;
            });
          }

          const itemText = tInteraction(
            interaction.locale,
            "vcRecruit:user-response.teardown_category_item",
            { category: entry.categoryLabel },
          );
          successLines.push(itemText);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errorLines.push(`・${entry.categoryLabel}：${errMsg}`);
        }
      }

      // 完了メッセージを構築
      const successHeader = tInteraction(
        interaction.locale,
        "vcRecruit:user-response.teardown_success",
      );

      let description = successLines.join("\n");

      if (errorLines.length > 0) {
        const errorHeader = tInteraction(
          interaction.locale,
          "vcRecruit:user-response.teardown_partial_error",
        );
        description += "\n\n" + errorHeader + "\n" + errorLines.join("\n");
      }

      const resultEmbed = createSuccessEmbed(description, {
        title: successHeader,
      });

      await interaction
        .editReply({
          embeds: [resultEmbed],
          components: [],
        })
        .catch(() => null);
    }
  },
};
