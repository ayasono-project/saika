-- 非アクティブ自動キック機能の削除にともなうテーブル撤去。
-- 本番の有効ギルドは 2026-09-05 の実測で 0 件。機能ごと廃止するため設定・活動履歴とも残さない。
DROP TABLE IF EXISTS "member_activities";
DROP TABLE IF EXISTS "guild_inactive_kick_settings";
