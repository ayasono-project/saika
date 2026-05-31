// src/features/unverified-kick/handlers/unverifiedKickVerifyHandler.ts
// guildMemberUpdate 契機の対象ロール解除（認証ロール取得時に対象ロールを剥奪する）

import type { GuildMember, PartialGuildMember } from "discord.js";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

const LOG_PREFIX = "system:log_prefix.unverified_kick";

/**
 * メンバーが認証ロールを新たに取得した際に、付与済みの対象ロールを剥奪する。
 * 対象ロール解除の主経路（認証完了 = 対象外確定で即時にメンション対象から外す）。
 * @param oldMember 更新前のメンバー（Partial の可能性あり）
 * @param newMember 更新後のメンバー
 * @returns 実行完了を示す Promise
 */
export async function handleUnverifiedKickVerify(
  oldMember: GuildMember | PartialGuildMember,
  newMember: GuildMember,
): Promise<void> {
  const guild = newMember.guild;
  const settings = await getBotUnverifiedKickSettingsService().getSettings(
    guild.id,
  );
  // 無効 / 対象ロール未設定 / 認証ロール未設定なら何もしない
  if (
    !settings?.enabled ||
    !settings.markerRoleId ||
    !settings.verifiedRoleId
  ) {
    return;
  }

  // 認証ロールを保持していない、または対象ロールを保持していなければ対象外
  if (
    !newMember.roles.cache.has(settings.verifiedRoleId) ||
    !newMember.roles.cache.has(settings.markerRoleId)
  ) {
    return;
  }
  // 更新前に既に認証済みだった場合は今回の取得ではないためスキップ（partial 時は判定不能なので続行）
  if (
    !oldMember.partial &&
    oldMember.roles.cache.has(settings.verifiedRoleId)
  ) {
    return;
  }

  try {
    const t = await getGuildTranslator(guild.id);
    await newMember.roles.remove(
      settings.markerRoleId,
      t("unverifiedKick:audit_reason.marker_removed_verified"),
    );
    logger.debug(
      logPrefixed(
        LOG_PREFIX,
        "unverifiedKick:log.marker_role_removed_verified",
        {
          guildId: guild.id,
          userId: newMember.id,
        },
      ),
    );
  } catch (err) {
    logger.warn(
      logPrefixed(LOG_PREFIX, "unverifiedKick:log.marker_role_remove_failed", {
        guildId: guild.id,
        userId: newMember.id,
      }),
      err,
    );
  }
}
