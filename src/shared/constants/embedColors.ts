// 各機能で使用する Embed カラーコードの共通定数

/**
 * 機能別 Embed カラーコード定数
 * 各機能固有の Embed 色はここに集約し、ファイルローカル定数を廃止する
 */
export const EMBED_COLORS = {
  /** ヘルプコマンド（緑） */
  HELP: 0x77b255,
  /** About コマンド（ブランドグリーン・help と同系） */
  ABOUT: 0x77b255,
  /** メンバーログ: 参加（ビリジアン） */
  MEMBER_LOG_JOIN: 0x008969,
  /** メンバーログ: 退出（紅色） */
  MEMBER_LOG_LEAVE: 0xb7282d,
  /** 未承認ユーザー自動キック: キック予告（黄・警告） */
  UNVERIFIED_KICK_WARN: 0xf1c40f,
  /** 未承認ユーザー自動キック: キック通知（茜色 #b7282d） */
  UNVERIFIED_KICK_KICK: 0xb7282d,
  /** スティッキーメッセージ デフォルト（ビリジアン） */
  STICKY_MESSAGE_DEFAULT: 0x008969,
} as const;
