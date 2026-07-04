// src/features/inactive-kick/commands/inactiveKickSettingsCommand.tier.ts
// inactive-kick-settings の tier サブコマンドグループ（set / remove / list）

import { ValidationError } from "@ayasono/shared/core";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  type Locale,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import {
  createInfoEmbed,
  createSuccessEmbed,
} from "../../../bot/utils/messageResponse";
import type { InactiveKickTier } from "../../../shared/database/types";
import type { AllParseKeys } from "../../../shared/locale/i18n";
import { tInteraction } from "../../../shared/locale/localeManager";
import {
  INACTIVE_KICK_MAX_TIERS,
  INACTIVE_KICK_THRESHOLD_MAX_DAYS,
  INACTIVE_KICK_THRESHOLD_MIN_DAYS,
  INACTIVE_KICK_TIER_TENURE_MIN_DAYS,
} from "../inactiveKickSettingsDefaults";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "./inactiveKickSettingsCommand.constants";
import { ensureInactiveKickManageGuildPermission } from "./inactiveKickSettingsCommand.guard";

/** ephemeral 成功応答を返す共通ヘルパー */
async function replySuccess(
  interaction: ChatInputCommandInteraction,
  descriptionKey: AllParseKeys,
  params?: Record<string, unknown>,
): Promise<void> {
  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, descriptionKey, params),
    { title: tInteraction(interaction.locale, "common:embed.title.success") },
  );
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

/**
 * 階層1件分の見出しを組み立てる（`tenureDeadline` の有無で「30日」が何を指すかが変わるため出し分ける）。
 * 通常モード: 「在籍N日以上 → 非アクティブM日」／締め切りモード: 「在籍N日以上 → 在籍M日で判定」
 * @param locale 表示ロケール
 * @param tier 表示対象の在籍階層
 * @returns 見出しテキスト
 */
function buildTierHeader(locale: Locale, tier: InactiveKickTier): string {
  const t = (key: AllParseKeys, params?: Record<string, unknown>) =>
    tInteraction(locale, key, params);
  const key = tier.tenureDeadline
    ? "inactiveKick:embed.field.value.tier_tier_tenure_deadline"
    : "inactiveKick:embed.field.value.tier_tier";
  return t(key, { tenure: tier.tenureDays, threshold: tier.thresholdDays });
}

/**
 * 階層1件分の見出しと詳細行（活動判定・アクティブ条件・モード。常に3行）を組み立てる。
 * デフォルト値かどうかに関わらず常に全項目を表示する（省略による誤解を避けるため）。
 * @param locale 表示ロケール
 * @param tier 表示対象の在籍階層
 * @returns 見出しと詳細行
 */
function buildTierLines(
  locale: Locale,
  tier: InactiveKickTier,
): { header: string; details: string[] } {
  const t = (key: AllParseKeys, params?: Record<string, unknown>) =>
    tInteraction(locale, key, params);
  const enabledLabel = t("common:enabled");
  const disabledLabel = t("common:disabled");
  const noneLabel = t("common:none");

  const header = buildTierHeader(locale, tier);

  const trackingSummary = [
    `${t("inactiveKick:activity_trigger.message")}: ${tier.trackMessage ? enabledLabel : disabledLabel}`,
    `${t("inactiveKick:activity_trigger.voice")}: ${tier.trackVoice ? enabledLabel : disabledLabel}`,
    `${t("inactiveKick:activity_trigger.reaction")}: ${tier.trackReaction ? enabledLabel : disabledLabel}`,
  ].join(" / ");

  const conditions = [
    tier.minMessageCount != null &&
      t("inactiveKick:embed.field.value.tier_condition_message", {
        count: tier.minMessageCount,
      }),
    tier.minVoiceCount != null &&
      t("inactiveKick:embed.field.value.tier_condition_voice", {
        count: tier.minVoiceCount,
      }),
    tier.minReactionCount != null &&
      t("inactiveKick:embed.field.value.tier_condition_reaction", {
        count: tier.minReactionCount,
      }),
  ].filter((v): v is string => Boolean(v));
  const conditionSummary =
    conditions.length > 0
      ? conditions.join(
          ` ${t("inactiveKick:embed.field.value.tier_condition_or")} `,
        )
      : noneLabel;

  const modeValue = tier.tenureDeadline
    ? t("inactiveKick:embed.field.value.tier_mode_tenure_value")
    : t("inactiveKick:embed.field.value.tier_mode_normal_value");

  const details = [
    t("inactiveKick:embed.field.value.tier_tracking", {
      summary: trackingSummary,
    }),
    t("inactiveKick:embed.field.value.tier_active_condition", {
      summary: conditionSummary,
    }),
    t("inactiveKick:embed.field.value.tier_mode", { value: modeValue }),
  ].map((line) => `• ${line}`);

  return { header, details };
}

/**
 * 階層1件分の詳細サマリーを1つのテキストにまとめる（`view` の単一フィールドで使用）。
 * @param locale 表示ロケール
 * @param tier 表示対象の在籍階層
 * @returns 見出し＋詳細行を結合した複数行テキスト
 */
export function formatTierSummary(
  locale: Locale,
  tier: InactiveKickTier,
): string {
  const { header, details } = buildTierLines(locale, tier);
  return [header, ...details].join("\n");
}

/**
 * 階層1件分を Embed フィールド（見出し＝name・詳細＝value）として組み立てる（`tier list` で使用）。
 * @param locale 表示ロケール
 * @param tier 表示対象の在籍階層
 * @returns Embed フィールド用の name/value
 */
export function buildTierListField(
  locale: Locale,
  tier: InactiveKickTier,
): { name: string; value: string } {
  const { header, details } = buildTierLines(locale, tier);
  return { name: header, value: details.join("\n") };
}

/**
 * 在籍階層を追加・更新する（在籍日数が一致する既存階層は上書き）。
 * 活動種別トグル・アクティブ条件は省略可（省略時は既存階層の値を維持・新規階層なら track* は true）。
 */
export async function handleInactiveKickTierSet(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const { OPTION } = INACTIVE_KICK_SETTINGS_COMMAND;
  const tenureDays = interaction.options.getInteger(OPTION.TENURE_DAYS, true);
  const thresholdDays = interaction.options.getInteger(
    OPTION.THRESHOLD_DAYS,
    true,
  );
  const trackMessage =
    interaction.options.getBoolean(OPTION.TRACK_MESSAGE, false) ?? undefined;
  const trackVoice =
    interaction.options.getBoolean(OPTION.TRACK_VOICE, false) ?? undefined;
  const trackReaction =
    interaction.options.getBoolean(OPTION.TRACK_REACTION, false) ?? undefined;
  const minMessageCount =
    interaction.options.getInteger(OPTION.MIN_MESSAGE_COUNT, false) ??
    undefined;
  const minVoiceCount =
    interaction.options.getInteger(OPTION.MIN_VOICE_COUNT, false) ?? undefined;
  const minReactionCount =
    interaction.options.getInteger(OPTION.MIN_REACTION_COUNT, false) ??
    undefined;
  const tenureDeadline =
    interaction.options.getBoolean(OPTION.TENURE_DEADLINE, false) ?? undefined;

  if (tenureDays < INACTIVE_KICK_TIER_TENURE_MIN_DAYS) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.tier_tenure_out_of_range",
        { min: INACTIVE_KICK_TIER_TENURE_MIN_DAYS },
      ),
    );
  }
  if (
    thresholdDays < INACTIVE_KICK_THRESHOLD_MIN_DAYS ||
    thresholdDays > INACTIVE_KICK_THRESHOLD_MAX_DAYS
  ) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.tier_threshold_out_of_range",
      ),
    );
  }

  const service = getBotInactiveKickSettingsService();
  const current = await service.getSettingsOrDefault(guildId);
  const isNewTier = !current.tiers.some((t) => t.tenureDays === tenureDays);
  if (isNewTier && current.tiers.length >= INACTIVE_KICK_MAX_TIERS) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "inactiveKick:user-response.tier_max_reached",
        { max: INACTIVE_KICK_MAX_TIERS },
      ),
    );
  }

  await service.setTier(guildId, tenureDays, {
    thresholdDays,
    trackMessage,
    trackVoice,
    trackReaction,
    minMessageCount,
    minVoiceCount,
    minReactionCount,
    tenureDeadline,
  });
  await replySuccess(
    interaction,
    "inactiveKick:user-response.tier_set_success",
    { tenure: tenureDays, threshold: thresholdDays },
  );
}

/** Discord のセレクトメニュー最大選択肢数 */
const SELECT_MENU_MAX_OPTIONS = 25;

/**
 * 削除する在籍階層を選ぶセレクトメニューを表示する。
 * 登録済み階層を複数選択でき、選択時に一括削除する（選択応答は select ハンドラ）。
 */
export async function handleInactiveKickTierRemove(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const settings =
    await getBotInactiveKickSettingsService().getSettingsOrDefault(guildId);
  const sorted = [...settings.tiers].sort(
    (a, b) => a.tenureDays - b.tenureDays,
  );

  // 最後の1件しかない場合は削除できるものが無い
  if (sorted.length <= 1) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            interaction.locale,
            "inactiveKick:user-response.tier_remove_empty",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "inactiveKick:embed.title.tier_list",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const options = sorted
    .map((tier) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(buildTierHeader(interaction.locale, tier))
        .setValue(String(tier.tenureDays)),
    )
    .slice(0, SELECT_MENU_MAX_OPTIONS);

  const select = new StringSelectMenuBuilder()
    .setCustomId(INACTIVE_KICK_SETTINGS_COMMAND.TIER_REMOVE_SELECT_ID)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "inactiveKick:ui.select.tier_remove_placeholder",
      ),
    )
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  await interaction.reply({
    components: [
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

/**
 * 現在の在籍階層一覧を表示する（在籍日数昇順）。
 */
export async function handleInactiveKickTierList(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await ensureInactiveKickManageGuildPermission(interaction);

  const settings =
    await getBotInactiveKickSettingsService().getSettingsOrDefault(guildId);
  const sorted = [...settings.tiers].sort(
    (a, b) => a.tenureDays - b.tenureDays,
  );
  const fields = sorted.map((tier) =>
    buildTierListField(interaction.locale, tier),
  );

  const embed = createInfoEmbed("", {
    title: tInteraction(
      interaction.locale,
      "inactiveKick:embed.title.tier_list",
    ),
    fields,
  });
  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
