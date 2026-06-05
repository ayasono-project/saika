// src/api/auth/authConstants.ts
// セッション JWT / Cookie に関する定数（検証専用）。
// 発行・OAuth フロー・refresh は web BFF が担当するため、saika 側は読み取りに必要な分のみ持つ。

/** セッション JWT を格納する Cookie 名（web BFF が発行し、saika は読み取り・検証のみ） */
export const JWT_COOKIE_NAME = "ayasono_session";

/** 開発環境用の JWT 署名鍵フォールバック（本番では JWT_SECRET 必須・web BFF と共有） */
export const DEV_JWT_SECRET_FALLBACK =
  "dev-insecure-jwt-secret-do-not-use-in-prod";
