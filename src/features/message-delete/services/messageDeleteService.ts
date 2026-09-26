// メッセージ削除コアロジック

import {
  type Collection,
  DiscordAPIError,
  type GuildTextBasedChannel,
  type Message,
  type PartialMessage,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import {
  type AuthorType,
  DISCORD_EPOCH,
  MSG_DEL_BULK_BATCH_SIZE,
  MSG_DEL_BULK_MAX_AGE_MS,
  MSG_DEL_BULK_WAIT_MS,
  MSG_DEL_CHANNEL_REQUIRED_PERMISSIONS,
  MSG_DEL_CHANNEL_UNAVAILABLE_ERROR_CODES,
  MSG_DEL_CONTENT_MAX_LENGTH,
  MSG_DEL_FETCH_BATCH_SIZE,
  MSG_DEL_INDIVIDUAL_WAIT_MS,
  MSG_DEL_PROGRESS_THROTTLE_MS,
  MSG_DEL_REFILL_WAIT_MS,
  MSG_DEL_UNDELETABLE_MESSAGE_TYPES,
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
  /** 投稿者タイプフィルター（未指定で全投稿者） */
  authorType?: AuthorType;
  /**
   * 現在のサーバーメンバーのユーザーID集合。
   * 各メッセージの authorIsMember 判定と authorType="left" フィルターに使用する。
   * 未指定の場合は全投稿者を在籍扱い（authorIsMember=true）とする。
   */
  memberIds?: ReadonlySet<string>;
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
 * 投稿者タイプフィルターに一致するかを判定する。
 * スキャン時（収集対象の絞り込み）とプレビュー時（表示の絞り込み）の双方で共用する。
 * @param authorType フィルター種別（undefined で全投稿者 = 常に一致）
 * @param isBot 投稿者が bot かどうか
 * @param isMember 投稿者が現在のサーバーメンバーかどうか
 * @returns フィルターに一致する場合は true
 */
export function matchesAuthorType(
  authorType: AuthorType | undefined,
  isBot: boolean,
  isMember: boolean,
): boolean {
  switch (authorType) {
    case "bot":
      return isBot;
    case "human":
      return !isBot;
    case "left":
      return !isMember;
    default:
      return true;
  }
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
 * Discord API のエラーが、チャンネル自体が使えなくなったこと（削除・閲覧権限の喪失・権限不足）を示すかを判定する。
 * スキャンと削除の双方で、そのチャンネルだけを打ち切るかどうかの判断に使う
 * @param error 捕捉したエラー
 * @returns そのチャンネルの残りのスキャン・削除を打ち切るべきエラーなら true
 */
function isChannelUnavailableError(error: unknown): boolean {
  return (
    error instanceof DiscordAPIError &&
    MSG_DEL_CHANNEL_UNAVAILABLE_ERROR_CODES.has(error.code)
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
    authorType,
    memberIds,
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
      !channel.permissionsFor(me)?.has(MSG_DEL_CHANNEL_REQUIRED_PERMISSIONS)
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

  /**
   * チャンネルから1バッチ取得してカーソルに反映する。
   * チャンネル自体が使えなくなった（途中で削除された・閲覧権限を失った等）ときは、そのチャンネルだけ打ち切り、他のチャンネルのスキャンは続ける
   * @param cursor 取得対象のカーソル
   * @param before このメッセージIDより前を取得する（未指定で最新から）
   * @returns 処理完了を示す Promise（チャンネルが使えない以外の失敗（5xx・ネットワーク障害等）では reject する）
   */
  const fetchIntoCursor = async (
    cursor: ChannelCursor,
    before: string | undefined,
  ): Promise<void> => {
    try {
      const batch: Collection<string, Message> =
        await cursor.channel.messages.fetch({
          limit: MSG_DEL_FETCH_BATCH_SIZE,
          before,
        });
      applyBatch(cursor, batch);
    } catch (error) {
      // 一時的な障害まで打ち切りにすると「メッセージが見つからなかった」と誤って伝えるため、スキャンの失敗として投げ直す
      if (!isChannelUnavailableError(error)) throw error;
      logger.warn(
        logPrefixed(
          "system:log_prefix.msg_del",
          "messageDelete:log.svc_channel_fetch_failed",
          { channelId: cursor.channel.id, error: String(error) },
        ),
      );
      cursor.buffer = [];
      cursor.exhausted = true;
    }
  };

  // ━━ 初期フェッチ: 全チャンネルを並列取得 ━━
  const initialFetch = Promise.all(
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
      await fetchIntoCursor(cursor, beforeSnowflake);
      return cursor;
    }),
  );
  // 初期フェッチはチャンネル数に比例して長引くため、中断（「収集分を確認」・タイムアウト）されたら待たずに抜ける
  const cursors = await waitUnlessAborted(initialFetch, signal);
  if (!cursors) {
    logger.debug(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.svc_initial_fetch_aborted",
      ),
    );
    return scanned;
  }

  await report({ totalScanned, collected: scanned.length, limit: count });

  // ━━ k-way マージ: 常に全チャンネル中で最も新しいメッセージを選択 ━━
  while (scanned.length < count) {
    // キャンセル確認
    if (signal?.aborted) break;

    // バッファが空かつ未消耗のチャンネルをリフィル（直列・レートリミット配慮）
    for (const cursor of cursors) {
      // リフィルが続くあいだも中断を待たせない
      if (signal?.aborted) break;
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
        await fetchIntoCursor(cursor, cursor.lastId);
        await sleep(MSG_DEL_REFILL_WAIT_MS);
        await report({ totalScanned, collected: scanned.length, limit: count });
      }
    }
    // リフィルを途中で打ち切った場合、補充していないチャンネルがあり新しい順を保てないので選ばずに抜ける
    if (signal?.aborted) break;

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

    // 削除できないシステムメッセージ（スレッドの開始メッセージ・名前変更など）は、プレビューにも出さないよう収集しない
    if (MSG_DEL_UNDELETABLE_MESSAGE_TYPES.has(msg.type)) continue;

    // フィルタ適用
    if (
      targetUserIds.length > 0 &&
      !targetUserIds.includes(msg.author.id) &&
      (!msg.webhookId || !targetUserIds.includes(msg.webhookId))
    )
      continue;
    if (keyword && !msg.content.toLowerCase().includes(keyword.toLowerCase()))
      continue;

    // 投稿者タイプ判定（memberIds 未指定時は全員を在籍扱い）
    const authorIsBot = msg.author.bot;
    const authorIsMember = memberIds ? memberIds.has(msg.author.id) : true;
    if (!matchesAuthorType(authorType, authorIsBot, authorIsMember)) continue;

    scanned.push({
      messageId: msg.id,
      guildId: bestCursor.channel.guildId,
      authorId: msg.author.id,
      // サーバーニックネーム → グローバル表示名 → ユーザー名 の優先順で取得
      authorDisplayName: msg.member?.displayName ?? msg.author.displayName,
      authorIsBot,
      authorIsMember,
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

/** bulkDelete を持つチャンネル（hasBulkDelete で絞り込む） */
type BulkDeletable = {
  bulkDelete: (
    messages: readonly string[],
    filterOld?: boolean,
  ) => Promise<Collection<string, Message | PartialMessage>>;
};

/**
 * bulkDelete をサポートするチャンネルかどうかを判定する型ガード
 * VoiceChannel など bulkDelete を持たないチャンネルを安全に除外する
 * @param channel チェック対象のオブジェクト
 * @returns bulkDelete メソッドを持つ場合は true
 */
function hasBulkDelete(channel: object): channel is BulkDeletable {
  return "bulkDelete" in channel;
}

/**
 * スキャン済みメッセージ（除外済み除く）を実際に削除する。
 * 1チャンネル（1チャンク）の失敗で全体を止めず、失敗した分は warn を出して飛ばし、残りのチャンネルの削除を続ける
 * @param messages 削除対象のスキャン済みメッセージ配列
 * @param onProgress 削除進捗コールバック
 * @param signal キャンセルシグナル（abort() 呼び出しで削除を中断）
 * @returns 削除結果（実際に削除できた合計件数・チャンネル別内訳）を示す Promise
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

  /**
   * 現在の削除件数で進捗を通知する（スロットリング付き）
   * @returns 処理完了を示す Promise
   */
  const reportProgress = (): Promise<void> =>
    report({ totalDeleted, total: messages.length, channelStatuses });

  /**
   * メッセージを1件ずつ削除する。
   * 削除できなかったメッセージは warn を出して飛ばし、チャンネル自体が使えなくなったらそこで打ち切る
   * @param channel 削除対象のチャンネル
   * @param targets 削除するメッセージ
   * @param status 進捗表示用のチャンネル別状態（削除できた件数を加算する）
   * @returns チャンネルが使えなくなって打ち切った場合は true
   */
  const deleteOneByOne = async (
    channel: GuildTextBasedChannel,
    targets: ScannedMessageWithChannel[],
    status: ChannelDeleteStatus,
  ): Promise<boolean> => {
    for (let idx = 0; idx < targets.length; idx++) {
      if (signal?.aborted) break;
      const target = targets[idx];
      try {
        await channel.messages.delete(target.messageId);
        totalDeleted++;
        status.deleted++;
      } catch (err) {
        logger.warn(
          logPrefixed(
            "system:log_prefix.msg_del",
            "messageDelete:log.svc_message_delete_failed",
            {
              messageId: target.messageId,
              error: String(err),
            },
          ),
        );
        if (isChannelUnavailableError(err)) return true;
      }
      await reportProgress();
      if (idx < targets.length - 1) {
        await sleep(MSG_DEL_INDIVIDUAL_WAIT_MS);
      }
    }
    return false;
  };

  /**
   * 14日以内のメッセージを bulkDelete でまとめて削除する。
   * チャンクの一括削除が失敗したら、そのチャンクだけ1件ずつの削除に切り替え、削除できないものだけを飛ばす。
   * チャンネル自体が使えなくなったらそこで打ち切る
   * @param channel 削除対象のチャンネル（bulkDelete を持つもの）
   * @param targets 削除するメッセージ（14日以内のもの）
   * @param status 進捗表示用のチャンネル別状態（削除できた件数を加算する）
   * @returns チャンネルが使えなくなって打ち切った場合は true
   */
  const deleteInBulk = async (
    channel: GuildTextBasedChannel & BulkDeletable,
    targets: ScannedMessageWithChannel[],
    status: ChannelDeleteStatus,
  ): Promise<boolean> => {
    for (let i = 0; i < targets.length; i += MSG_DEL_BULK_BATCH_SIZE) {
      if (signal?.aborted) break;
      const chunk = targets.slice(i, i + MSG_DEL_BULK_BATCH_SIZE);
      logger.debug(
        logPrefixed(
          "system:log_prefix.msg_del",
          "messageDelete:log.svc_bulk_delete_chunk",
          {
            size: chunk.length,
          },
        ),
      );
      try {
        const deleted = await channel.bulkDelete(
          chunk.map((m) => m.messageId),
          true,
        );
        totalDeleted += deleted.size;
        status.deleted += deleted.size;
      } catch (err) {
        logger.warn(
          logPrefixed(
            "system:log_prefix.msg_del",
            "messageDelete:log.svc_bulk_delete_failed",
            {
              channelId: channel.id,
              size: chunk.length,
              error: String(err),
            },
          ),
        );
        if (isChannelUnavailableError(err)) return true;
        // 削除できないメッセージが混じっていてもほかは消せるよう、このチャンクだけ1件ずつ削除し直す
        if (await deleteOneByOne(channel, chunk, status)) return true;
      }
      await reportProgress();
      if (i + MSG_DEL_BULK_BATCH_SIZE < targets.length) {
        await sleep(MSG_DEL_BULK_WAIT_MS);
      }
    }
    return false;
  };

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

    await reportProgress();

    // チャンネル開始時点の削除合計を記録（チャンネル別集計用）
    const channelStartDeleted = totalDeleted;

    // 14日以内は bulkDelete、14日超と bulkDelete を持たないチャンネルは1件ずつ削除する。
    // チャンネルが使えなくなったら、そのチャンネルの残りは飛ばして次のチャンネルへ進む
    const channelUnavailable = hasBulkDelete(rawChannel)
      ? (newMsgs.length > 0 &&
          (await deleteInBulk(rawChannel, newMsgs, channelStatus))) ||
        (await deleteOneByOne(rawChannel, oldMsgs, channelStatus))
      : await deleteOneByOne(rawChannel, channelMessages, channelStatus);
    if (channelUnavailable) {
      logger.warn(
        logPrefixed(
          "system:log_prefix.msg_del",
          "messageDelete:log.svc_channel_delete_aborted",
          {
            channelId,
            deleted: channelStatus.deleted,
            total: channelStatus.total,
          },
        ),
      );
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

/**
 * Promise の完了を待つが、signal が中断されたらその時点で待つのをやめる。
 * 中断より先に promise が reject した場合はそのエラーを投げる。
 * 待つのをやめた promise は裏で走り続けるため、その後に reject しても未処理の rejection にならないよう握りつぶす
 * @param promise 待つ対象の Promise
 * @param signal 中断シグナル（未指定なら常に最後まで待つ）
 * @returns promise の結果（中断された場合は null）
 */
async function waitUnlessAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T | null> {
  if (!signal) return promise;
  // 中断で待つのをやめた後の reject を握りつぶす（待っているあいだの reject は下の race が元の promise から受け取って投げる）
  promise.catch(() => {});
  if (signal.aborted) return null;

  let onAbort: (() => void) | undefined;
  const aborted = new Promise<null>((resolve) => {
    onAbort = () => resolve(null);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await Promise.race([promise, aborted]);
  } finally {
    if (onAbort) signal.removeEventListener("abort", onAbort);
  }
}
