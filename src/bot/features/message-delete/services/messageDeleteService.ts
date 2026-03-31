// src/bot/features/message-delete/services/messageDeleteService.ts
// メッセージ削除コアロジック

import type {
  Collection,
  GuildTextBasedChannel,
  Message,
  PartialMessage,
} from "discord.js";
import { PermissionFlagsBits } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import {
  DISCORD_EPOCH,
  MSG_DEL_BULK_BATCH_SIZE,
  MSG_DEL_BULK_MAX_AGE_MS,
  MSG_DEL_BULK_WAIT_MS,
  MSG_DEL_CONTENT_MAX_LENGTH,
  MSG_DEL_FETCH_BATCH_SIZE,
  MSG_DEL_INDIVIDUAL_WAIT_MS,
  MSG_DEL_PROGRESS_THROTTLE_MS,
  MSG_DEL_REFILL_WAIT_MS,
  type ScannedMessageWithChannel,
} from "../constants/messageDeleteConstants";

/** メッセージスキャンオプション（収集のみ、削除なし） */
export interface MessageScanOptions {
  /** interaction.locale（ユーザー向けメッセージの翻訳に使用） */
  locale: string;
  /** 収集するメッセージの上限件数（未指定で無限） */
  count: number;
  /** 対象ユーザーID一覧（空配列で全ユーザー） */
  targetUserIds: string[];
  /** キーワード部分一致（case-insensitive、未指定でフィルタなし） */
  keyword?: string;
  /** afterTs の Unix ミリ秒（0 = 制限なし） */
  afterTs: number;
  /** beforeTs の Unix ミリ秒（Infinity = 制限なし） */
  beforeTs: number;
  /** 進捗コールバック（スキャン中の表示更新に使用） */
  onProgress?: (data: ScanProgressData) => Promise<void>;
  /** キャンセルシグナル（abort() 呼び出しでスキャンを中断） */
  signal?: AbortSignal;
}

/** scanMessages 進捗データ */
export interface ScanProgressData {
  /** API からフェッチした総件数 */
  totalScanned: number;
  /** フィルタ後に収集した件数 */
  collected: number;
  /** 収集上限 */
  limit: number;
}

/** チャンネル単位の削除状態（進捗表示用） */
export interface ChannelDeleteStatus {
  channelId: string;
  name: string;
  deleted: number;
  total: number;
}

/** deleteScannedMessages 進捗データ */
export interface DeleteProgressData {
  /** 合計削除済み件数 */
  totalDeleted: number;
  /** 削除対象の総件数 */
  total: number;
  /** チャンネル別削除状態リスト */
  channelStatuses: ChannelDeleteStatus[];
}

/** 削除結果 */
export interface MessageDeleteResult {
  /** 合計削除件数 */
  totalDeleted: number;
  /** チャンネル別削除件数（キー: チャンネルID） */
  channelBreakdown: Record<string, { name: string; count: number }>;
}

/**
 * スロットリング付き進捗レポーターを生成する
 * @param callback 進捗コールバック（未指定時は何もしない）
 * @param intervalMs 最小呼び出し間隔（デフォルト 3000ms）
 * @returns 前回呼び出しから intervalMs 経過していない場合はスキップするレポーター関数
 */
function createThrottledReporter<T>(
  callback: ((data: T) => Promise<void>) | undefined,
  intervalMs = MSG_DEL_PROGRESS_THROTTLE_MS,
) {
  let lastTs = 0;
  return async (data: T, force = false) => {
    if (!callback) return;
    const now = Date.now();
    if (force || now - lastTs >= intervalMs) {
      lastTs = now;
      await callback(data);
    }
  };
}

/**
 * Discord メッセージの表示用本文を組み立てる。
 * テキスト本文・添付ファイル・Embed の概要を結合し、全体を MSG_DEL_CONTENT_MAX_LENGTH 文字以内に収める。
 * @param msg 対象の Discord Message オブジェクト
 * @returns 組み立てた表示用本文（MSG_DEL_CONTENT_MAX_LENGTH 超過時は末尾に `…` を付与）
 */
function buildDisplayContent(locale: string, msg: Message): string {
  const parts: string[] = [];

  if (msg.content) {
    parts.push(msg.content);
  }

  if (msg.attachments.size > 0) {
    parts.push(
      tInteraction(locale, "messageDelete:embed.field.value.attachments", {
        count: msg.attachments.size,
      }),
    );
  }

  for (const embed of msg.embeds) {
    parts.push(
      embed.title
        ? `🔗 ${embed.title}`
        : tInteraction(
            locale,
            "messageDelete:embed.field.value.embed_no_title",
          ),
    );
  }

  const result = parts.join("\n");
  return (
    result.slice(0, MSG_DEL_CONTENT_MAX_LENGTH) +
    (result.length > MSG_DEL_CONTENT_MAX_LENGTH ? "…" : "")
  );
}

/**
 * 指定チャンネルリストから条件に一致するメッセージをスキャンして収集する（削除は行わない）
 * @param channels スキャン対象のテキストチャンネル一覧
 * @param options スキャンオプション（件数上限・フィルタ・進捗コールバックなど）
 * @returns 収集したスキャン済みメッセージ配列を示す Promise
 */
export async function scanMessages(
  channels: GuildTextBasedChannel[],
  options: MessageScanOptions,
): Promise<ScannedMessageWithChannel[]> {
  const {
    locale,
    count,
    targetUserIds,
    keyword,
    afterTs,
    beforeTs,
    onProgress,
    signal,
  } = options;

  const scanned: ScannedMessageWithChannel[] = [];

  // beforeTs を Discord Snowflake に変換（最初のフェッチを beforeTs 直前から開始するため）
  const beforeSnowflake =
    beforeTs !== Infinity
      ? ((BigInt(Math.floor(beforeTs)) - DISCORD_EPOCH) << 22n).toString()
      : undefined;

  let totalScanned = 0;
  const report = createThrottledReporter(onProgress);

  logger.debug(
    logPrefixed(
      "system:log_prefix.msg_del",
      "messageDelete:log.svc_scan_start",
      {
        channelCount: channels.length,
        count,
        targetUserIds:
          targetUserIds.length > 0 ? targetUserIds.join(",") : "none",
      },
    ),
  );

  // コマンド層でフィルタ済みのチャンネルが渡されるが、
  // scanMessages を直接呼び出すケースに備えて再チェックする
  const accessibleChannels = channels.filter((channel) => {
    const me = channel.guild.members.me;
    if (
      me &&
      !channel
        .permissionsFor(me)
        ?.has([
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
        ])
    ) {
      logger.debug(
        logPrefixed(
          "system:log_prefix.msg_del",
          "messageDelete:log.svc_channel_no_access",
          {
            channelId: channel.id,
          },
        ),
      );
      return false;
    }
    return true;
  });

  if (accessibleChannels.length === 0) return scanned;

  // チャンネルごとのカーソル
  type ChannelCursor = {
    channel: GuildTextBasedChannel;
    buffer: Message[];
    lastId: string | undefined;
    exhausted: boolean;
  };

  /**
   * フェッチ結果をカーソルに反映する。
   * - exhausted: バッチが空 or 100件未満 or afterTs より古い最古メッセージ
   * - buffer: afterTs より新しいメッセージのみ残す
   */
  const applyBatch = (
    cursor: ChannelCursor,
    batch: Collection<string, Message>,
  ): void => {
    const msgs = [...batch.values()];
    totalScanned += batch.size;
    cursor.lastId = batch.last()?.id;

    const isSparse = batch.size === 0 || batch.size < MSG_DEL_FETCH_BATCH_SIZE;
    const oldestExceedsAfter =
      afterTs > 0 &&
      msgs.length > 0 &&
      msgs[msgs.length - 1].createdTimestamp < afterTs;

    cursor.exhausted = isSparse || oldestExceedsAfter;

    if (oldestExceedsAfter) {
      cursor.buffer = msgs.filter((m) => m.createdTimestamp >= afterTs);
      return;
    }
    cursor.buffer = msgs;
  };

  // ━━ 初期フェッチ: 全チャンネルを並列取得 ━━
  const cursors: ChannelCursor[] = await Promise.all(
    accessibleChannels.map(async (channel) => {
      logger.debug(
        logPrefixed(
          "system:log_prefix.msg_del",
          "messageDelete:log.svc_initial_fetch",
          {
            channelId: channel.id,
          },
        ),
      );
      const cursor: ChannelCursor = {
        channel,
        buffer: [],
        lastId: undefined,
        exhausted: false,
      };
      const batch: Collection<string, Message> = await channel.messages.fetch({
        limit: MSG_DEL_FETCH_BATCH_SIZE,
        before: beforeSnowflake,
      });
      applyBatch(cursor, batch);
      return cursor;
    }),
  );

  await report({ totalScanned, collected: scanned.length, limit: count });

  // ━━ k-way マージ: 常に全チャンネル中で最も新しいメッセージを選択 ━━
  while (scanned.length < count) {
    // キャンセル確認
    if (signal?.aborted) break;

    // バッファが空かつ未消耗のチャンネルをリフィル（直列・レートリミット配慮）
    for (const cursor of cursors) {
      if (cursor.buffer.length === 0 && !cursor.exhausted) {
        logger.debug(
          logPrefixed(
            "system:log_prefix.msg_del",
            "messageDelete:log.svc_refill",
            {
              channelId: cursor.channel.id,
              lastId: cursor.lastId ?? "none",
            },
          ),
        );
        const batch: Collection<string, Message> =
          await cursor.channel.messages.fetch({
            limit: MSG_DEL_FETCH_BATCH_SIZE,
            before: cursor.lastId,
          });
        applyBatch(cursor, batch);
        await sleep(MSG_DEL_REFILL_WAIT_MS);
        await report({ totalScanned, collected: scanned.length, limit: count });
      }
    }

    // 全チャンネルのバッファ先頭で最新メッセージを持つカーソルを選択
    let bestCursor: ChannelCursor | null = null;
    for (const cursor of cursors) {
      if (cursor.buffer.length > 0) {
        if (
          !bestCursor ||
          cursor.buffer[0].createdTimestamp >
            bestCursor.buffer[0].createdTimestamp
        ) {
          bestCursor = cursor;
        }
      }
    }

    if (!bestCursor) break;

    const msg = bestCursor.buffer.shift();
    if (!msg) break;

    // フィルタ適用
    if (
      targetUserIds.length > 0 &&
      !targetUserIds.includes(msg.author.id) &&
      (!msg.webhookId || !targetUserIds.includes(msg.webhookId))
    )
      continue;
    if (keyword && !msg.content.toLowerCase().includes(keyword.toLowerCase()))
      continue;

    scanned.push({
      messageId: msg.id,
      guildId: bestCursor.channel.guildId,
      authorId: msg.author.id,
      // サーバーニックネーム → グローバル表示名 → ユーザー名 の優先順で取得
      authorDisplayName: msg.member?.displayName ?? msg.author.displayName,
      channelId: bestCursor.channel.id,
      channelName: bestCursor.channel.name,
      createdAt: msg.createdAt,
      content: buildDisplayContent(locale, msg),
      _channel: bestCursor.channel,
    });
  }

  logger.debug(
    logPrefixed(
      "system:log_prefix.msg_del",
      "messageDelete:log.svc_scan_complete",
      {
        count: scanned.length,
      },
    ),
  );
  return scanned;
}

/**
 * bulkDelete をサポートするチャンネルかどうかを判定する型ガード
 * VoiceChannel など bulkDelete を持たないチャンネルを安全に除外する
 * @param channel チェック対象のオブジェクト
 * @returns bulkDelete メソッドを持つ場合は true
 */
function hasBulkDelete(channel: object): channel is {
  bulkDelete: (
    messages: readonly string[],
    filterOld?: boolean,
  ) => Promise<Collection<string, Message | PartialMessage>>;
} {
  return "bulkDelete" in channel;
}

/**
 * スキャン済みメッセージ（除外済み除く）を実際に削除する
 * @param messages 削除対象のスキャン済みメッセージ配列
 * @param onProgress 削除進捗コールバック
 * @param signal キャンセルシグナル（abort() 呼び出しで削除を中断）
 * @returns 削除結果（合計件数・チャンネル別内訳）を示す Promise
 */
export async function deleteScannedMessages(
  messages: ScannedMessageWithChannel[],
  onProgress?: (data: DeleteProgressData) => Promise<void>,
  signal?: AbortSignal,
): Promise<MessageDeleteResult> {
  const twoWeeksAgo = Date.now() - MSG_DEL_BULK_MAX_AGE_MS;
  const channelBreakdown: Record<string, { name: string; count: number }> = {};
  let totalDeleted = 0;

  const report = createThrottledReporter(onProgress);

  // チャンネル別にグループ化
  const byChannel = new Map<string, ScannedMessageWithChannel[]>();
  for (const msg of messages) {
    const arr = byChannel.get(msg.channelId) ?? [];
    arr.push(msg);
    byChannel.set(msg.channelId, arr);
  }

  const channelStatusMap = new Map<string, ChannelDeleteStatus>(
    [...byChannel.entries()].map(([channelId, msgs]) => [
      channelId,
      { channelId, name: msgs[0].channelName, deleted: 0, total: msgs.length },
    ]),
  );
  const channelStatuses = [...channelStatusMap.values()];

  for (const channelMessages of byChannel.values()) {
    // キャンセルシグナル確認（削除タイムアウト時に中断）
    if (signal?.aborted) break;

    const channelId = channelMessages[0].channelId;
    const channelName = channelMessages[0].channelName;
    const rawChannel = channelMessages[0]._channel;
    // byChannel と channelStatusMap は同じキーセットで構築されるため必ず存在する
    // biome-ignore lint/style/noNonNullAssertion: byChannel と channelStatusMap は同じキーセットで構築されるため必ず存在する
    const channelStatus = channelStatusMap.get(channelId)!;

    const newMsgs = channelMessages.filter(
      (m) => m.createdAt.getTime() > twoWeeksAgo,
    );
    const oldMsgs = channelMessages.filter(
      (m) => m.createdAt.getTime() <= twoWeeksAgo,
    );

    await report({ totalDeleted, total: messages.length, channelStatuses });

    // チャンネル開始時点の削除合計を記録（チャンネル別集計用）
    const channelStartDeleted = totalDeleted;

    // bulkDelete（14日以内・bulkDelete サポートチャンネルのみ）
    if (hasBulkDelete(rawChannel) && newMsgs.length > 0) {
      for (let i = 0; i < newMsgs.length; i += MSG_DEL_BULK_BATCH_SIZE) {
        if (signal?.aborted) break;
        const chunk = newMsgs.slice(i, i + MSG_DEL_BULK_BATCH_SIZE);
        logger.debug(
          logPrefixed(
            "system:log_prefix.msg_del",
            "messageDelete:log.svc_bulk_delete_chunk",
            {
              size: chunk.length,
            },
          ),
        );
        const deleted = await rawChannel.bulkDelete(
          chunk.map((m) => m.messageId),
          true,
        );
        totalDeleted += deleted.size;
        channelStatus.deleted += deleted.size;
        await report({ totalDeleted, total: messages.length, channelStatuses });
        if (i + MSG_DEL_BULK_BATCH_SIZE < newMsgs.length) {
          await sleep(MSG_DEL_BULK_WAIT_MS);
        }
      }
    }

    // 個別削除（14日超 + bulkDelete 非サポートチャンネルの新メッセージも対象）
    const individualMsgs = hasBulkDelete(rawChannel)
      ? oldMsgs
      : channelMessages;
    for (let idx = 0; idx < individualMsgs.length; idx++) {
      if (signal?.aborted) break;
      const scanned = individualMsgs[idx];
      try {
        await rawChannel.messages.delete(scanned.messageId);
        totalDeleted++;
        channelStatus.deleted++;
      } catch (err) {
        logger.warn(
          logPrefixed(
            "system:log_prefix.msg_del",
            "messageDelete:log.svc_message_delete_failed",
            {
              messageId: scanned.messageId,
              error: String(err),
            },
          ),
        );
      }
      await report({ totalDeleted, total: messages.length, channelStatuses });
      if (idx < individualMsgs.length - 1) {
        await sleep(MSG_DEL_INDIVIDUAL_WAIT_MS);
      }
    }

    channelBreakdown[channelId] = {
      name: channelName,
      count: totalDeleted - channelStartDeleted,
    };
  }

  return { totalDeleted, channelBreakdown };
}

/**
 * 日付文字列をパースして Date オブジェクトを返す。
 * `YYYY-MM-DD` のみの場合は時刻を補完し、timezoneOffset を付与する。
 * `YYYY-MM-DDTHH:MM:SS` のみ（オフセットなし）の場合も timezoneOffset を付与する。
 * オフセット付き形式（`YYYY-MM-DDTHH:MM:SS±HH:MM`）はそのまま解釈する。
 * @param str パース対象の日付文字列（`YYYY-MM-DD` または ISO 8601 形式）
 * @param endOfDay true の場合は時刻を `23:59:59` で補完する（`before` に使用）
 * @param timezoneOffset `YYYY-MM-DD` または `YYYY-MM-DDTHH:MM:SS` 形式のときに付与するタイムゾーンオフセット（例: "+09:00"）
 * @returns パースに成功した場合は Date、不正な文字列の場合は null
 */
export function parseDateStr(
  str: string,
  endOfDay: boolean,
  timezoneOffset: string,
): Date | null {
  let normalized: string;
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    // 日付のみ → 時刻を補完（before は 23:59:59、after は 00:00:00）してオフセットを付与
    normalized = `${str}T${endOfDay ? "23:59:59" : "00:00:00"}${timezoneOffset}`;
  } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(str)) {
    // 日時のみ（オフセットなし）→ ロケールから推定したタイムゾーンオフセットを付与（UX 向上のため）
    normalized = `${str}${timezoneOffset}`;
  } else if (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}([+-]\d{2}:\d{2}|Z)$/.test(str)
  ) {
    // 日時＋オフセット付き（YYYY-MM-DDTHH:MM:SS±HH:MM または Z）→ そのまま使用
    normalized = str;
  } else {
    return null;
  }
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * スリープユーティリティ
 * @param ms スリープする時間（ミリ秒）
 * @returns 指定時間後に解決する Promise
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
