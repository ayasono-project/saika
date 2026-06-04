// src/api/constants.ts
// API 層の定数

/** API のメタ情報（GET /api の応答に使用） */
export const API_INFO: { name: string; version: number } = {
  name: "saika API",
  // ダッシュボード契約のスキーマバージョン（@ayasono/shared/api と整合）
  version: 1,
};

/** グローバルレート制限の既定値 */
export const RATE_LIMIT: { max: number; timeWindow: string } = {
  max: 300,
  timeWindow: "1 minute",
};
