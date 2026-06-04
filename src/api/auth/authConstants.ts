// src/api/auth/authConstants.ts
// 認証（OAuth2 / JWT / Cookie）に関する定数（WEB_AUTH_SPEC 準拠）

/** access JWT の有効期限（秒・15 分） */
export const JWT_EXPIRY_SEC = 900;

/** access JWT を格納する Cookie 名 */
export const JWT_COOKIE_NAME = "ayasono_session";

/** Discord refresh_token を格納する Cookie 名 */
export const REFRESH_COOKIE_NAME = "ayasono_refresh";

/** refresh Cookie の maxAge（秒・30 日） */
export const REFRESH_COOKIE_MAX_AGE_SEC = 2_592_000;

/** OAuth2 state を格納する Cookie 名 */
export const OAUTH_STATE_COOKIE_NAME = "oauth_state";

/** OAuth2 state Cookie の maxAge（秒・5 分） */
export const OAUTH_STATE_COOKIE_MAX_AGE_SEC = 300;

/** ManageGuild 権限ビット（1 << 5） */
export const DISCORD_PERMISSION_MANAGE_GUILD: bigint = 1n << 5n;

/** OAuth2 スコープ */
export const DISCORD_OAUTH_SCOPES: readonly string[] = ["identify", "guilds"];

/** ユーザーのギルド一覧キャッシュ TTL（ミリ秒・60 秒） */
export const GUILD_CACHE_TTL_MS = 60_000;

/** OAuth2 state のバイト長（hex で 64 文字） */
export const OAUTH_STATE_BYTES = 32;

/** Discord API のベース URL */
export const DISCORD_API_BASE = "https://discord.com/api";

/** 開発環境用の JWT 署名鍵フォールバック（本番では JWT_SECRET 必須） */
export const DEV_JWT_SECRET_FALLBACK =
  "dev-insecure-jwt-secret-do-not-use-in-prod";
