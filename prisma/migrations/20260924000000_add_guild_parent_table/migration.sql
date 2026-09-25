-- ギルドの親テーブルを新設し、全機能テーブルから FK（ON DELETE CASCADE）を張る。
--
-- 挙動は変えない（アプリから見た読み書きは同じ）。狙いは2つ。
--   ① Bot が把握しているギルドを guilds の1テーブルで列挙でき、ギルド単位の状態
--      （導入日時・削除予約）を置ける場所を作る。これまでは guild_settings が
--      その代わりに使われがちだったが、この行は set-locale / set-error-channel を
--      実行したときだけ作られ、実測（2026-09-23）でデータを持つ6ギルドのうち
--      4ギルドに行が無かった。
--      ※ guild_settings 行そのものは今後も作られない。欠落が無くなるのは親行だけ。
--        また親行は設定の有無と関係なく作るので、「設定があるか」は親行でも分からない
--   ② 退出時データの削除を「親行1つの削除」に集約する（削除ロジック自体は後続で実装）。
--
-- あわせて、@map を持たずキャメルケースのまま残っていた11列をスネークケースへ統一する。
-- PostgreSQL は引用符なしの識別子を小文字へ畳むため、キャメルケース列は生 SQL で常に
-- "guildId" と囲む必要があり、実際に運用中の調査 SQL で躓いた。Prisma のフィールド名は
-- 変えないのでアプリコードは1行も変わらない。
--
-- **全体を1つのトランザクションで囲む。** prisma migrate deploy はファイルを1文ずつ
-- 自動コミットで流すため、囲まないと途中の文で失敗したとき先行の文だけが適用された
-- 半端な状態が残る（2026-09-25 に使い捨て DB で確認）。PostgreSQL は DDL も
-- トランザクションで巻き戻せるので、失敗時は適用前の状態へ完全に戻る。
--
-- 失敗したときは、**本当の原因が Prisma の出力に出ない。** 失敗後に Prisma が同じ
-- トランザクション内で _prisma_migrations を更新しようとして「current transaction is
-- aborted」になり、そちらが表示されるため。原因は PostgreSQL のサーバーログで見る。
-- 復旧は、原因を取り除いてから
-- `prisma migrate resolve --rolled-back 20260924000000_add_guild_parent_table` → 再デプロイ
-- （いずれも 2026-09-25 に使い捨て DB で確認）。

BEGIN;

-- 1. 親テーブルを作る
CREATE TABLE "guilds" (
    "guild_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduled_deletion_at" TIMESTAMP(3),

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("guild_id")
);

-- 2. 既存データのギルドIDをすべて拾って親行をバックフィルする。
-- Bot が既に退出しているギルド（孤児）も対象に含める。ここで取りこぼすと
-- 次の FK 追加が失敗するため、13テーブル全部を UNION する。
-- guild_settings / bump_reminders はこの時点ではまだ列名がキャメルケースなので
-- "guildId" で参照する（リネームは手順3）。
INSERT INTO "guilds" ("guild_id")
SELECT DISTINCT "guildId" FROM "guild_settings"
UNION
SELECT DISTINCT "guildId" FROM "bump_reminders"
UNION
SELECT DISTINCT "guild_id" FROM "guild_afk_settings"
UNION
SELECT DISTINCT "guild_id" FROM "guild_bump_reminder_settings"
UNION
SELECT DISTINCT "guild_id" FROM "guild_vac_settings"
UNION
SELECT DISTINCT "guild_id" FROM "guild_member_log_settings"
UNION
SELECT DISTINCT "guild_id" FROM "guild_vc_auto_recruit_settings"
UNION
SELECT DISTINCT "guild_id" FROM "guild_unverified_kick_settings"
UNION
SELECT DISTINCT "guild_id" FROM "guild_unverified_kick_warns"
UNION
SELECT DISTINCT "guild_id" FROM "sticky_messages"
UNION
SELECT DISTINCT "guild_id" FROM "guild_ticket_settings"
UNION
SELECT DISTINCT "guild_id" FROM "tickets"
UNION
SELECT DISTINCT "guild_id" FROM "guild_reaction_role_panels";

-- 3. キャメルケースの11列をスネークケースへ統一する
ALTER TABLE "guild_settings" RENAME COLUMN "guildId" TO "guild_id";
ALTER TABLE "guild_settings" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "guild_settings" RENAME COLUMN "updatedAt" TO "updated_at";

ALTER TABLE "bump_reminders" RENAME COLUMN "guildId" TO "guild_id";
ALTER TABLE "bump_reminders" RENAME COLUMN "channelId" TO "channel_id";
ALTER TABLE "bump_reminders" RENAME COLUMN "messageId" TO "message_id";
ALTER TABLE "bump_reminders" RENAME COLUMN "panelMessageId" TO "panel_message_id";
ALTER TABLE "bump_reminders" RENAME COLUMN "serviceName" TO "service_name";
ALTER TABLE "bump_reminders" RENAME COLUMN "scheduledAt" TO "scheduled_at";
ALTER TABLE "bump_reminders" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "bump_reminders" RENAME COLUMN "updatedAt" TO "updated_at";

-- 4. インデックス名も列名に追従させる。Prisma の制約名はフィールド名ではなく
-- DB 列名から生成されるため、ここを直さないと以後の migrate diff が
-- 「名前が違う」だけの差分を検出し続ける。
ALTER INDEX "guild_settings_guildId_key" RENAME TO "guild_settings_guild_id_key";
ALTER INDEX "bump_reminders_guildId_idx" RENAME TO "bump_reminders_guild_id_idx";
ALTER INDEX "bump_reminders_status_scheduledAt_idx" RENAME TO "bump_reminders_status_scheduled_at_idx";

-- 同じ理由で、2026-09-20 のテーブル改称（guild_vc_invite_settings →
-- guild_vc_auto_recruit_settings）のときに取り残された主キー制約名も揃える。
ALTER TABLE "guild_vc_auto_recruit_settings" RENAME CONSTRAINT "guild_vc_invite_settings_pkey" TO "guild_vc_auto_recruit_settings_pkey";

-- 5. FK を張る。親行を1つ消せば全機能のデータが落ちる状態にする
ALTER TABLE "guild_settings" ADD CONSTRAINT "guild_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "bump_reminders" ADD CONSTRAINT "bump_reminders_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_afk_settings" ADD CONSTRAINT "guild_afk_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_bump_reminder_settings" ADD CONSTRAINT "guild_bump_reminder_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_vac_settings" ADD CONSTRAINT "guild_vac_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_member_log_settings" ADD CONSTRAINT "guild_member_log_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_vc_auto_recruit_settings" ADD CONSTRAINT "guild_vc_auto_recruit_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_unverified_kick_settings" ADD CONSTRAINT "guild_unverified_kick_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_unverified_kick_warns" ADD CONSTRAINT "guild_unverified_kick_warns_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "sticky_messages" ADD CONSTRAINT "sticky_messages_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_ticket_settings" ADD CONSTRAINT "guild_ticket_settings_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_reaction_role_panels" ADD CONSTRAINT "guild_reaction_role_panels_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("guild_id") ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT;
