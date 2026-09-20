// VC自動募集機能の共通定数

/** 募集 Embed のブランドカラー（blurple #5865F2・VC操作系と統一） */
export const VC_AUTO_RECRUIT_EMBED_COLOR = 0x5865f2;

/** カスタム募集メッセージの最大文字数 */
export const VC_AUTO_RECRUIT_MESSAGE_MAX_LENGTH = 500;

/**
 * 0人→1人 になってから投稿するまでの待ち時間（ms）。
 * 間違えて入って即抜けた場合や、人がいると思って入った場合の誤爆を抑える。
 * 投稿が遅れても困らないが、募集終了は遅らせない（空 VC を指すボタンが残るため）。
 */
export const VC_AUTO_RECRUIT_JOIN_DEBOUNCE_MS = 20_000;

/** 入室デバウンスのジョブ ID 接頭辞（VC チャンネル ID を連結して一意にする） */
export const VC_AUTO_RECRUIT_DEBOUNCE_JOB_PREFIX = "vc-auto-recruit:join:";

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
