// VAC自動作成ユースケース

import {
  ChannelType,
  DiscordAPIError,
  type GuildMember,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  type VoiceState,
} from "discord.js";
import {
  notifyErrorChannel,
  notifyWarnChannel,
} from "../../../../bot/shared/errorChannelNotifier";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { VAC_SETTINGS_COMMAND } from "../../commands/vacSettingsCommand.constants";
import type { VacSettingsService } from "../../vacSettingsService";

const VAC_EVENT = {
  /** VC作成時のデフォルトユーザー制限（0 は無制限だが 99 で実質無制限を表現） */
  DEFAULT_LIMIT: 99,
  /** カテゴリ内チャンネル上限 */
  CATEGORY_CHANNEL_LIMIT: VAC_SETTINGS_COMMAND.CATEGORY_CHANNEL_LIMIT,
} as const;

type GuildChannelsCache = GuildMember["guild"]["channels"]["cache"];

/**
 * トリガーVC参加時に管理対象VACを作成し、参加者を移動する
 * @param vacRepository VAC設定リポジトリ
 * @param newState 最新ボイス状態
 * @returns 実行完了
 */
export async function handleVacCreateUseCase(
  vacRepository: VacSettingsService,
  newState: VoiceState,
): Promise<void> {
  const member = newState.member;
  const newChannel = newState.channel;
  if (!member || !newChannel || newChannel.type !== ChannelType.GuildVoice) {
    return;
  }

  const config = await vacRepository.getVacSettingsOrDefault(member.guild.id);
  if (!config.enabled || !config.triggerChannelIds.includes(newChannel.id)) {
    return;
  }

  const existingOwnedChannel = config.createdChannels.find(
    (channel) => channel.ownerId === member.id,
  );
  if (existingOwnedChannel) {
    const ownedChannel = await member.guild.channels
      .fetch(existingOwnedChannel.voiceChannelId)
      .catch(() => null);
    if (ownedChannel?.type === ChannelType.GuildVoice) {
      try {
        await member.voice.setChannel(ownedChannel);
      } catch (error) {
        if (
          error instanceof DiscordAPIError &&
          error.code === RESTJSONErrorCodes.MissingPermissions
        ) {
          await notifyErrorChannel(member.guild, error, {
            featureKey: "vac:embed.field.value.error_notification_feature",
            actionKey: "vac:embed.field.value.member_move_failed_action",
          });
        }
        // ユーザーが切断済みの場合も含め、移動失敗は無視して続行しない
      }
      return;
    }
    await vacRepository.removeCreatedVacChannel(
      member.guild.id,
      existingOwnedChannel.voiceChannelId,
    );
  }

  const parentCategory =
    newChannel.parent?.type === ChannelType.GuildCategory
      ? newChannel.parent
      : null;

  if (
    parentCategory &&
    parentCategory.children.cache.size >= VAC_EVENT.CATEGORY_CHANNEL_LIMIT
  ) {
    logger.warn(
      logPrefixed("system:log_prefix.vac", "vac:log.category_full", {
        guildId: member.guild.id,
        categoryId: parentCategory.id,
      }),
    );
    await notifyWarnChannel(
      member.guild,
      (t) =>
        t("vac:embed.field.value.category_full_notice", {
          guildId: member.guild.id,
          categoryId: parentCategory.id,
        }),
      {
        featureKey: "vac:embed.field.value.error_notification_feature",
        actionKey: "vac:embed.field.value.category_full_action",
      },
    );
    return;
  }

  const channelName = buildUniqueChannelName(
    member,
    member.guild.channels.cache,
  );

  let voiceChannel;
  try {
    voiceChannel = await member.guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      parent: parentCategory?.id ?? null,
      userLimit: VAC_EVENT.DEFAULT_LIMIT,
      permissionOverwrites: [
        {
          id: member.id,
          allow: [PermissionFlagsBits.ManageChannels],
        },
      ],
    });
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.MissingPermissions
    ) {
      logger.warn(
        logPrefixed("system:log_prefix.vac", "vac:log.channel_create_failed", {
          guildId: member.guild.id,
        }),
      );
      await notifyErrorChannel(member.guild, error, {
        featureKey: "vac:embed.field.value.error_notification_feature",
        actionKey: "vac:embed.field.value.channel_create_failed_action",
      });
      return;
    }
    throw error;
  }

  if (voiceChannel.type !== ChannelType.GuildVoice) {
    return;
  }

  try {
    await member.voice.setChannel(voiceChannel);
  } catch (error) {
    if (
      error instanceof DiscordAPIError &&
      error.code === RESTJSONErrorCodes.MissingPermissions
    ) {
      await notifyErrorChannel(member.guild, error, {
        featureKey: "vac:embed.field.value.error_notification_feature",
        actionKey: "vac:embed.field.value.created_vc_member_move_failed_action",
      });
    }
    // ユーザーがチャンネル参加直後に切断した場合、移動不可能なため作成チャンネルを削除して終了
    await voiceChannel.delete().catch(() => null);
    return;
  }

  await vacRepository.addCreatedVacChannel(member.guild.id, {
    voiceChannelId: voiceChannel.id,
    ownerId: member.id,
    createdAt: Date.now(),
  });

  logger.info(
    logPrefixed("system:log_prefix.vac", "vac:log.channel_created", {
      guildId: member.guild.id,
      channelId: voiceChannel.id,
      ownerId: member.id,
    }),
  );
}

/**
 * 既存チャンネル名と衝突しないVACチャンネル名を生成する
 * @param member VAC所有者となるメンバー
 * @param channels ギルド内チャンネルキャッシュ
 * @returns 一意化されたチャンネル名
 */
function buildUniqueChannelName(
  member: GuildMember,
  channels: GuildChannelsCache,
): string {
  const baseName = `${member.displayName}'s Room`;
  let channelName = baseName;
  let counter = 2;

  while (channels.find((channel) => channel.name === channelName)) {
    channelName = `${baseName} (${counter})`;
    counter += 1;
  }

  return channelName;
}
