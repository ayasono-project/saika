// src/shared/constants/embedColors.ts
// 各機能で使用する Embed カラーコードの共通定数

/**
 * 機能別 Embed カラーコード定数
 * 各機能固有の Embed 色はここに集約し、ファイルローカル定数を廃止する
 */
export const EMBED_COLORS = {
  /** ヘルプコマンド（緑） */
  HELP: 0x77b255,
  /** メンバーログ: 参加（ビリジアン） */
  MEMBER_LOG_JOIN: 0x008969,
  /** メンバーログ: 退出（紅色） */
  MEMBER_LOG_LEAVE: 0xb7282d,
  /** スティッキーメッセージ デフォルト（ビリジアン��� */
  STICKY_MESSAGE_DEFAULT: 0x008969,
  /** VC募集パネル・投稿（ターコイズ #24B9B8） */
  VC_RECRUIT_PANEL: 0x24b9b8,
} as const;
