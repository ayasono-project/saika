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

/**
 * リクエスト本文の上限（バイト）。既定の 1MiB を絞る。
 *
 * Fastify は `preHandler`（認証）より前に本文をパースするため、認証が要るルートでも
 * 未認証のリクエストが本文を読ませられる。正規の本文で最大になるのは
 * リアクションロールのパネル（ボタン25個 ＋ embed）やチャンネル ID の配列で、
 * いずれも数十KB に収まるため 256KiB あれば十分な余裕がある。
 */
export const BODY_LIMIT_BYTES: number = 256 * 1024;

/**
 * `X-Forwarded-For` を信頼してよい直前ホップのアドレス範囲（Fastify の `trustProxy`）。
 *
 * 本番の経路は Cloudflare → Tunnel → cloudflared（host ネットワーク）→ 127.0.0.1:8081
 * → docker-proxy → コンテナで、コンテナから見た接続元は Docker ネットワークのゲートウェイになる
 * （2026-09-20 実測: 10.0.1.1）。cloudflared は `X-Forwarded-For` に触れず、Cloudflare が
 * 末尾に本物のクライアント IP を追記するので、この範囲だけを信頼すれば `request.ip` は
 * 右から辿って最初の信頼できない要素＝本物のクライアント IP になる。
 *
 * - `true` にしない: チェーンを一切切り詰めず、`request.ip` が最左＝攻撃者の送った値になる
 * - 中継数（数値）にしない: 直前ホップのアドレスを確かめないので、経路が縮むと黙って偽装可能になる
 * - 環境変数にしない: 運用画面から `true` に戻せてしまい、回帰テストで守れなくなる
 * - 範囲を1アドレスまで絞らない: ネットワークが作り直されてアドレスが変わると外れ、
 *   全員が同じ枠に入って黙って劣化する。10.0.0.0/8 は Coolify の既定アドレスプール
 * - `loopback` はローカル開発用。本番ではコンテナ内のプロセスからしか使われない
 *
 * 経路を変えたとき（Traefik を挟む・ネットワーク構成を変える等）は必ず見直すこと。
 */
export const TRUSTED_PROXY_RANGES: readonly string[] = [
  "loopback",
  "10.0.0.0/8",
];
