// src/bot/features/vc-panel/vcPanelOwnershipRegistry.ts
// VC操作パネルの対象チャンネル所有権チェッカーのレジストリ
//
// 各機能（VAC, VC募集など）は initializeBotCompositionRoot 内で
// registerVcPanelOwnershipChecker を呼び出して自身のチェッカーを登録する。
// パネルハンドラーは isVcPanelManagedChannel を通じて全チェッカーに問い合わせる。

/**
 * VC操作パネルの管理対象チャンネルかを判定するチェッカーインターフェース
 */
export interface VcPanelOwnershipChecker {
  /**
   * 指定チャンネルがこの機能の管理対象かを返す
   * @param guildId 対象サーバーID
   * @param channelId 対象チャンネルID
   * @returns 管理対象なら true
   */
  isManagedVcPanelChannel(guildId: string, channelId: string): Promise<boolean>;
}

const checkers: VcPanelOwnershipChecker[] = [];

/**
 * VC操作パネル所有権チェッカーを登録する関数
 * @param checker 登録するチェッカー
 */
export function registerVcPanelOwnershipChecker(
  checker: VcPanelOwnershipChecker,
): void {
  checkers.push(checker);
}

/**
 * 登録済みチェッカーを順番に問い合わせ、いずれかが true を返したら管理対象と判定する
 * @param guildId 対象サーバーID
 * @param channelId 対象チャンネルID
 * @returns いずれかの機能で管理対象なら true
 */
export async function isVcPanelManagedChannel(
  guildId: string,
  channelId: string,
): Promise<boolean> {
  for (const checker of checkers) {
    if (await checker.isManagedVcPanelChannel(guildId, channelId)) {
      return true;
    }
  }
  return false;
}
