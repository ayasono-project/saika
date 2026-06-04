// src/features/vc-auto-recruit/constants/vcAutoRecruit.constants.ts
// VC自動募集機能の共通定数

/** 募集 Embed のブランドカラー（blurple #5865F2・VC操作系と統一） */
export const VC_AUTO_RECRUIT_EMBED_COLOR = 0x5865f2;

/** カスタム募集メッセージの最大文字数 */
export const VC_AUTO_RECRUIT_MESSAGE_MAX_LENGTH = 500;

/** 同一 VC への連投抑制クールダウン（ms） */
export const VC_AUTO_RECRUIT_REPOST_COOLDOWN_MS = 60_000;

/** カテゴリに属さないルート直下 VC を表す allowlist の sentinel キー */
export const VC_AUTO_RECRUIT_ROOT_CATEGORY = "TOP";

/**
 * 募集メッセージ内ボタンの customId
 * join はチャンネルジャンプ URL の Link ボタンのため customId を持たず、
 * ended は募集終了後の無効ボタン（押下不可・インタラクション非発生）に使用する
 */
export const VC_AUTO_RECRUIT_BUTTON_ID = {
  /** 募集終了（無効化）ボタンの customId */
  ENDED: "vc-auto-recruit:ended",
} as const;

/**
 * VC へのチャンネルジャンプ URL を生成する
 * @param guildId ギルドID
 * @param voiceChannelId 対象のボイスチャンネルID
 * @returns Discord クライアントで当該 VC を開く URL
 */
export function buildChannelJumpUrl(
  guildId: string,
  voiceChannelId: string,
): string {
  return `https://discord.com/channels/${guildId}/${voiceChannelId}`;
}
