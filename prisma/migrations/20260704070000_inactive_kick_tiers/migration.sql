-- 非アクティブ自動キック: 単一 threshold_days + ギルド共通活動判定トグルから、
-- 在籍階層（tier）単位の tiers[] へ移行（活動判定・アクティブ条件を階層ごとに個別設定可能にする）
-- InactiveKickTier[]: { tenureDays, thresholdDays, trackMessage, trackVoice, trackReaction,
--                       minMessageCount?, minVoiceCount?, minReactionCount?, tenureDeadline? }

-- 1. tiers 列を追加（デフォルトは在籍0日から現行既定値 30 日・活動判定は全種別 true）
ALTER TABLE "guild_inactive_kick_settings"
  ADD COLUMN "tiers" JSONB NOT NULL DEFAULT '[{"tenureDays":0,"thresholdDays":30,"trackMessage":true,"trackVoice":true,"trackReaction":true}]';

-- 2. 既存の threshold_days + ギルド共通トグルを先頭ティア（在籍0日）へ移送
UPDATE "guild_inactive_kick_settings"
  SET "tiers" = jsonb_build_array(
    jsonb_build_object(
      'tenureDays', 0,
      'thresholdDays', "threshold_days",
      'trackMessage', "track_message",
      'trackVoice', "track_voice",
      'trackReaction', "track_reaction"
    )
  );

-- 3. 旧列を削除
ALTER TABLE "guild_inactive_kick_settings" DROP COLUMN "threshold_days";
ALTER TABLE "guild_inactive_kick_settings" DROP COLUMN "track_message";
ALTER TABLE "guild_inactive_kick_settings" DROP COLUMN "track_voice";
ALTER TABLE "guild_inactive_kick_settings" DROP COLUMN "track_reaction";

-- 4. メンバー活動履歴に累積回数カウントを追加（アクティブ条件の判定に使用）
ALTER TABLE "member_activities" ADD COLUMN "message_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "member_activities" ADD COLUMN "voice_count" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "member_activities" ADD COLUMN "reaction_count" INTEGER NOT NULL DEFAULT 0;
