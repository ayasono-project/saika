-- {markerRole} / {daysLeft} 廃止: 既存テンプレートから廃止プレースホルダーを除去する
-- inactive-kick: week_warn_message / final_warn_message / kick_message
UPDATE "guild_inactive_kick_settings"
  SET "week_warn_message" = REPLACE("week_warn_message", '{markerRole}', '')
  WHERE "week_warn_message" LIKE '%{markerRole}%';

UPDATE "guild_inactive_kick_settings"
  SET "week_warn_message" = REPLACE("week_warn_message", '{daysLeft}', '')
  WHERE "week_warn_message" LIKE '%{daysLeft}%';

UPDATE "guild_inactive_kick_settings"
  SET "final_warn_message" = REPLACE("final_warn_message", '{markerRole}', '')
  WHERE "final_warn_message" LIKE '%{markerRole}%';

UPDATE "guild_inactive_kick_settings"
  SET "final_warn_message" = REPLACE("final_warn_message", '{daysLeft}', '')
  WHERE "final_warn_message" LIKE '%{daysLeft}%';

UPDATE "guild_inactive_kick_settings"
  SET "kick_message" = REPLACE("kick_message", '{markerRole}', '')
  WHERE "kick_message" LIKE '%{markerRole}%';

-- unverified-kick: dm_template / notify_template
UPDATE "guild_unverified_kick_settings"
  SET "dm_template" = REPLACE("dm_template", '{markerRole}', '')
  WHERE "dm_template" LIKE '%{markerRole}%';

UPDATE "guild_unverified_kick_settings"
  SET "notify_template" = REPLACE("notify_template", '{markerRole}', '')
  WHERE "notify_template" LIKE '%{markerRole}%';