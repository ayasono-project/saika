-- パネルの既定文が日本語で DB に書かれており、言語ごとの既定文（i18n）と二重になっていた。
-- 既定文はアプリ側でギルドの言語から入れるので、DB の既定値を外す。既存の行の値は変わらない。

-- AlterTable
ALTER TABLE "guild_ticket_settings" ALTER COLUMN "panel_title" DROP DEFAULT,
ALTER COLUMN "panel_description" DROP DEFAULT;

-- AlterTable
ALTER TABLE "guild_reaction_role_panels" ALTER COLUMN "title" DROP DEFAULT,
ALTER COLUMN "description" DROP DEFAULT;
