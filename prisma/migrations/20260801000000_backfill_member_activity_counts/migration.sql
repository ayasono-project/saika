-- 非アクティブ自動キック: 累積活動カウントのバックフィル（20260704070000_inactive_kick_tiers の修正）
--
-- 20260704070000 で message_count / voice_count / reaction_count を DEFAULT 0 で追加したが、
-- 既存行へのバックフィルが無かった。マイグレーション適用前から活動履歴のあるメンバーは
-- last_activity_at に値が入っているのにカウントが全て 0 のまま取り残されている。
--
-- meetsActiveCondition() は累積カウントのみを見るため、カウント 0 は
-- 「アクティブ条件を満たさない」と判定され恒久除外されない。さらに階層が tenureDeadline: true の
-- 場合は判定軸が在籍日数へ切り替わり lastActivityAt を一切見なくなるため、
-- 適用前の活動が判定に反映される経路が完全に消える（＝誤キックが発生しうる）。
--
-- 絞り込み条件の根拠:
--   setWarnStage() は行が無いとき lastActivityAt: new Date(0)（エポック）で create する。したがって
--   ・last_activity_at = エポック かつ 全カウント 0 → 警告だけで作られた行。実活動なし。触らない
--   ・last_activity_at > エポック かつ 全カウント 0 → 適用前の行
--     （recordActivity() は必ずカウントを increment するため、適用後には発生しえない）
--   この自己申告性により、自己ホスト instance でも適用日時に依らず正しく動く。
--   last_activity_at は TIMESTAMP(3)（timezone なし）のためエポック比較にズレは生じない。
--
-- 3カラムとも 1 にする理由:
--   当時の trigger 種別は DB に残っていない。メッセージのみ 1 にすると、実際は VC 参加・
--   リアクションのみだったメンバーが誤ってメッセージ扱いになる。3つとも立てるのが
--   「不明だが活動はあった」に最も近い。
--
-- warn_stage と対象ロールは意図的に触らない:
--   inactiveKickRunner の applyGraceClear() が setWarnStage(NONE) を呼び、
--   applyMarkerRoleConsistency() が警告バケットに居ないメンバーからロールを剥奪するため、
--   バックフィル後の次回日次実行で両方とも自動で正常化する。
--
-- 注意: この操作は不可逆。実行後は「バックフィルされた行」と「本物の活動記録」を区別できない。

UPDATE "member_activities"
SET "message_count" = 1, "voice_count" = 1, "reaction_count" = 1
WHERE "message_count" = 0 AND "voice_count" = 0 AND "reaction_count" = 0
  AND "last_activity_at" > '1970-01-01 00:00:00';
