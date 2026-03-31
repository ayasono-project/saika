// src/bot/features/message-delete/constants/messageDeleteConstants.ts
// message-delete 機能の定数・型定義

import type {
  GuildTextBasedChannel,
  MessageComponentInteraction,
} from "discord.js";

/** UI コンポーネントの customId 定数 */
export const MSG_DEL_CUSTOM_ID = {
  // 条件設定フェーズ
  SELECT_USER: "message-delete:user-select",
  SELECT_CHANNEL: "message-delete:channel-select",
  START_SCAN: "message-delete:scan-start",
  WEBHOOK_INPUT: "message-delete:webhook-input",
  COND_CANCEL: "message-delete:condition-cancel",
  // Webhook ID 入力モーダル
  MODAL_WEBHOOK: "message-delete:webhook-modal",
  MODAL_INPUT_WEBHOOK: "message-delete:webhook-modal-input",
  // スキャン中キャンセルボタン
  SCAN_CANCEL: "message-delete:scan-cancel",
  // 確認ダイアログ（プレビュー：Stage 1）
  CONFIRM_YES: "message-delete:preview-confirm",
  CONFIRM_NO: "message-delete:preview-cancel",
  CONFIRM_EXCLUDE: "message-delete:preview-exclude",
  // ページネイション（Stage 1 プレビュー）
  FIRST: "message-delete:page-first",
  PREV: "message-delete:page-prev",
  NEXT: "message-delete:page-next",
  LAST: "message-delete:page-last",
  JUMP: "message-delete:page-jump",
  // 最終確認ダイアログ（Stage 2）ナビゲーションは Stage 1 と同一 customId（FIRST/PREV/JUMP/NEXT/LAST）を使用
  FINAL_YES: "message-delete:deletion-confirm",
  FINAL_BACK: "message-delete:deletion-back",
  FINAL_NO: "message-delete:deletion-cancel",
  // フィルター（Stage 1 共通）
  FILTER_AUTHOR: "message-delete:author-filter",
  FILTER_KEYWORD: "message-delete:keyword-filter",
  FILTER_DAYS: "message-delete:days-filter",
  FILTER_AFTER: "message-delete:after-date-filter",
  FILTER_BEFORE: "message-delete:before-date-filter",
  FILTER_RESET: "message-delete:filter-reset",
  // フィルターモーダル
  MODAL_KEYWORD: "message-delete:keyword-modal",
  MODAL_DAYS: "message-delete:days-modal",
  MODAL_AFTER: "message-delete:after-date-modal",
  MODAL_BEFORE: "message-delete:before-date-modal",
  MODAL_JUMP: "message-delete:page-jump-modal",
  // モーダル入力フィールド
  MODAL_INPUT_KEYWORD: "message-delete:keyword-modal-input",
  MODAL_INPUT_DAYS: "message-delete:days-modal-input",
  MODAL_INPUT_AFTER: "message-delete:after-date-modal-input",
  MODAL_INPUT_BEFORE: "message-delete:before-date-modal-input",
  MODAL_INPUT_JUMP: "message-delete:page-jump-modal-input",
} as const;

/** 進捗レポートのスロットル間隔（ミリ秒） */
export const MSG_DEL_PROGRESS_THROTTLE_MS = 3000;

/** Discord セレクトメニューのオプション上限 */
export const MSG_DEL_SELECT_MAX_OPTIONS = 25;

/** 1ページあたりの表示件数 */
export const MSG_DEL_PAGE_SIZE = 5;

/**
 * 各フェーズ共通のタイムアウト（14分）
 * Discord Interaction token 15分制限に対して1分のバッファ。
 * 各フェーズはボタン操作の deferUpdate() で fresh token を取得するため、
 * フェーズごとに独立して14分使える。
 */
export const MSG_DEL_PHASE_TIMEOUT_MS = 840_000;

/**
 * 確認フェーズ（プレビュー・最終確認）コレクターのアイドルタイムアウト（3分）
 * エフェメラルメッセージをユーザーが非表示にしても MESSAGE_DELETE イベントは発火しないため、
 * 無操作が続いた場合にコレクターを自動終了してロックを解放する
 */
export const MSG_DEL_COLLECTOR_IDLE_MS = 180_000;

/** 条件設定フェーズのタイムアウト（3分） */
export const MSG_DEL_CONDITION_STEP_TIMEOUT_MS = 180_000;

/** モーダル送信タイムアウト（60秒） */
export const MSG_DEL_MODAL_TIMEOUT_MS = 60_000;

/** k-way マージのリフィル間待機時間（ms） */
export const MSG_DEL_REFILL_WAIT_MS = 200;

/** bulkDelete 1バッチあたりの最大件数 */
export const MSG_DEL_BULK_BATCH_SIZE = 100;

/** メッセージ取得 1バッチあたりの最大件数 */
export const MSG_DEL_FETCH_BATCH_SIZE = 100;

/** bulkDelete バッチ間の待機時間（ms） */
export const MSG_DEL_BULK_WAIT_MS = 1000;

/** 個別削除 1件あたりの待機時間（ms） */
export const MSG_DEL_INDIVIDUAL_WAIT_MS = 500;

/** Discord の bulkDelete 対象となる最大メッセージ年齢（14日） */
export const MSG_DEL_BULK_MAX_AGE_MS: number = 14 * 24 * 60 * 60 * 1000;

/** 削除結果メッセージの本文最大文字数 */
export const MSG_DEL_CONTENT_MAX_LENGTH = 200;

/** count オプション未指定時のデフォルト収集件数 */
export const MSG_DEL_DEFAULT_COUNT = 1000;

/** Discord Epoch（Snowflake 計算用） */
export const DISCORD_EPOCH = 1420070400000n;

/** 1日あたりのミリ秒数 */
export const MS_PER_DAY: number = 24 * 60 * 60 * 1000;

/** コマンド名定数 */
export const MSG_DEL_COMMAND = {
  NAME: "message-delete",
  OPTION: {
    COUNT: "count",
    KEYWORD: "keyword",
    DAYS: "days",
    AFTER: "after",
    BEFORE: "before",
  },
} as const;

/**
 * スキャン済みメッセージ型
 * プレスキャンで収集したメッセージの情報と Discord Message オブジェクトを保持する
 */
export interface ScannedMessage {
  /** Discord のメッセージID */
  messageId: string;
  /** 所属するギルドID */
  guildId: string;
  /** 投稿者のユーザーID */
  authorId: string;
  /** 表示名（サーバーニックネーム → グローバル表示名 → ユーザー名 の優先順） */
  authorDisplayName: string;
  /** 投稿されたチャンネルID */
  channelId: string;
  /** 投稿されたチャンネル名 */
  channelName: string;
  /** メッセージの投稿日時 */
  createdAt: Date;
  /** 表示用本文（添付ファイル・Embed 概要を含む、最大 MSG_DEL_CONTENT_MAX_LENGTH 文字） */
  content: string;
}

/** 削除実行時に使用するチャンネル参照付きメッセージ型（内部専用） */
export interface ScannedMessageWithChannel extends ScannedMessage {
  _channel: GuildTextBasedChannel;
}

/**
 * コマンド条件 Embed の表示用データ型
 * buildCommandConditionsEmbed に渡す情報をまとめた表示専用インターフェース
 */
export interface CommandConditionsDisplay {
  /** count オプション値（未指定時は MSG_DEL_DEFAULT_COUNT） */
  count: number;
  /** 対象ユーザーID一覧（空配列で全員対象） */
  targetUserIds: string[];
  /** キーワード（未指定でフィルタなし） */
  keyword?: string;
  /** days オプション値（未指定で undefined） */
  daysOption?: number;
  /** after オプションの入力文字列 */
  afterStr?: string;
  /** before オプションの入力文字列 */
  beforeStr?: string;
  /** 対象チャンネルID一覧（空配列でサーバー全体） */
  channelIds: string[];
}

/** 条件設定フェーズの結果型 */
export interface ConditionSetupResult {
  /** 選択されたユーザーID一覧 */
  targetUserIds: string[];
  /** 選択されたチャンネルID一覧 */
  channelIds: string[];
  /** スキャン開始ボタン押下時の interaction（後続フェーズで fresh token として使用） */
  scanInteraction: MessageComponentInteraction;
}

/**
 * フィルター状態型（プレビューダイアログで使用）
 *
 * days と after/before は排他関係を型レベルで保証する Discriminated Union。
 * - days ブランチ: 過去N日間フィルター（after・before は undefined のみ許容）
 * - absolute ブランチ: 日付範囲フィルター（days は undefined のみ許容）
 */
export type MessageDeleteFilter =
  | {
      authorId?: string;
      keyword?: string;
      days: number;
      after?: undefined;
      before?: undefined;
    }
  | {
      authorId?: string;
      keyword?: string;
      days?: undefined;
      after?: Date;
      /** after に対応するユーザー入力文字列（フィルターボタンのラベル表示用） */
      afterRaw?: string;
      before?: Date;
      /** before に対応するユーザー入力文字列（フィルターボタンのラベル表示用） */
      beforeRaw?: string;
    };
