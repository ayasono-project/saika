-- カテゴリ allowlist はチャンネル単位化（2026-06-30）で役目を終えており、
-- 設定する手段（カテゴリ系サブコマンド・web UI）も既に存在しない。
ALTER TABLE "guild_vc_invite_settings" DROP COLUMN IF EXISTS "enabled_category_ids";

-- テーブル名が旧称 vc-invite のままだったため実体に合わせて改称する。
ALTER TABLE "guild_vc_invite_settings" RENAME TO "guild_vc_auto_recruit_settings";
