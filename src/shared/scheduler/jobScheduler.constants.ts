// ジョブスケジューラーの定数

/**
 * setTimeout 1回で待てる遅延の上限（2^31-1 ms・約24.8日）
 *
 * これを超える値を setTimeout に渡すと、Node は TimeoutOverflowWarning を出して遅延を 1ms に切り詰め、
 * 即座に発火させる。one-time ジョブはこの長さずつ区切って待ち、残りを張り直す。
 */
export const MAX_TIMEOUT_DELAY_MS: number = 2_147_483_647;
