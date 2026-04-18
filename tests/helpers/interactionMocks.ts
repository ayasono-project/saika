// tests/helpers/interactionMocks.ts
// Discord.js Interaction モック生成ヘルパー
// ハンドラテストで使用する各種 Interaction モックのファクトリを一元管理する

import type { Mock } from "vitest";

/** 共通の非同期メソッドセット（テスト側で `toHaveBeenCalled` 等で検証する） */
export interface MockInteractionMethods {
  reply: Mock;
  update: Mock;
  deferReply: Mock;
  deferUpdate: Mock;
  editReply: Mock;
  deleteReply: Mock;
  followUp: Mock;
  showModal: Mock;
}

/** Interaction モック共通の shape（基本プロパティ＋任意の拡張キー） */
export type MockInteraction = MockInteractionMethods & {
  customId: string;
  locale: string;
  guildId: string;
  client: unknown;
} & Record<string, unknown>;

/** Interaction 共通の非同期メソッド（vi.fn() を全て mock 済み） */
function createCommonMethods(): MockInteractionMethods {
  return {
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * ButtonInteraction のモックを生成する。
 * `reply` / `update` / `deferUpdate` / `editReply` / `deleteReply` / `followUp` / `showModal` を
 * すべて `vi.fn()` として提供。呼ばれるメソッドはテストごとに `toHaveBeenCalled` 等で検証する。
 *
 * @param customId ボタンの customId
 * @param overrides 個別プロパティの上書き（`guild` / `member` / `message` など任意のキー）
 */
export function createMockButtonInteraction(
  customId: string,
  overrides: Record<string, unknown> = {},
): MockInteraction {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    client: {},
    ...createCommonMethods(),
    ...overrides,
  };
}

/**
 * StringSelectMenuInteraction のモックを生成する。
 * @param customId セレクトメニューの customId
 * @param values 選択された values 配列
 * @param overrides 個別プロパティの上書き
 */
export function createMockStringSelectInteraction(
  customId: string,
  values: string[] = [],
  overrides: Record<string, unknown> = {},
): MockInteraction {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    client: {},
    values,
    ...createCommonMethods(),
    ...overrides,
  };
}

/**
 * RoleSelectMenuInteraction のモックを生成する。
 * @param customId セレクトメニューの customId
 * @param roleIds 選択された role ID 配列（内部で `Map<id, { id, name }>` を構築）
 * @param overrides 個別プロパティの上書き
 */
export function createMockRoleSelectInteraction(
  customId: string,
  roleIds: string[] = [],
  overrides: Record<string, unknown> = {},
): MockInteraction {
  const roles = new Map(roleIds.map((id) => [id, { id, name: id }]));
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    client: {},
    roles,
    ...createCommonMethods(),
    ...overrides,
  };
}

/**
 * ModalSubmitInteraction のモックを生成する。
 * @param customId モーダルの customId
 * @param fields モーダル内テキストフィールドの key→value マッピング
 * @param overrides 個別プロパティの上書き
 */
export function createMockModalInteraction(
  customId: string,
  fields: Record<string, string> = {},
  overrides: Record<string, unknown> = {},
): MockInteraction {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    client: {},
    fields: {
      getTextInputValue: vi.fn((key: string) => fields[key] ?? ""),
    },
    ...createCommonMethods(),
    ...overrides,
  };
}
