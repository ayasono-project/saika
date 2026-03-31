// src/shared/constants/discord.ts
// Discord API 仕様に基づく共通定数

/**
 * Discord Voice Channel の userLimit 許容範囲
 * 0 は「無制限」を意味する
 * @see https://discord.com/developers/docs/resources/channel#modify-channel
 */
export const VC_USER_LIMIT = {
  MIN: 0,
  MAX: 99,
} as const;
