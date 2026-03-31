// src/shared/locale/locales/ja/features/messageDelete.ts
// メッセージ削除機能の翻訳リソース

export const messageDelete = {
  // ── コマンド定義 ─────────────────────────────
  "message-delete.description":
    "メッセージを一括削除します（デフォルト: サーバー全チャンネル）",
  "message-delete.count.description":
    "削除するメッセージ数（1〜1000、未指定時は最新1000件を上限に削除）",
  "message-delete.user.description":
    "削除対象のユーザーID またはメンション（Webhookの場合はIDを直接入力）",
  "message-delete.keyword.description":
    "本文に指定キーワードを含むメッセージのみ削除（部分一致）",
  "message-delete.days.description":
    "過去N日以内のメッセージのみ削除（1〜366、after/beforeとの同時指定不可）",
  "message-delete.after.description":
    "この日時以降のメッセージのみ削除 (YYYY-MM-DD または YYYY-MM-DDTHH:MM:SS)",
  "message-delete.before.description":
    "この日時以前のメッセージのみ削除 (YYYY-MM-DD または YYYY-MM-DDTHH:MM:SS)",
  "message-delete.channel.description":
    "削除対象を絞り込むチャンネル（未指定でサーバー全体）",

  // ── UIラベル ──────────────────────────────────
  "ui.button.scan_cancel": "収集分を確認",
  "ui.button.delete": "削除する（{{count}}件）",
  "ui.select.exclude_placeholder": "このページから除外するメッセージを選択",
  "ui.select.exclude_no_messages": "(メッセージなし)",
  "ui.button.deletion_confirm": "削除する（{{count}}件）",
  "ui.button.deletion_back": "設定し直す",
  "ui.button.deletion_cancel": "キャンセル",
  "ui.button.days_set": "過去{{days}}日間",
  "ui.button.days_empty": "過去N日間を入力",
  "ui.button.after_date_set": "after: {{date}}",
  "ui.button.after_date_empty": "after（開始日時）を入力",
  "ui.button.before_date_set": "before: {{date}}",
  "ui.button.before_date_empty": "before（終了日時）を入力",
  "ui.button.keyword": "内容で検索",
  "ui.button.keyword_set": "{{keyword}}",
  "ui.button.reset": "リセット",
  "ui.select.author_placeholder": "投稿者でフィルター",
  "ui.select.author_all": "（全投稿者）",
  "ui.modal.keyword_title": "内容でフィルター",
  "ui.modal.keyword_label": "キーワード",
  "ui.modal.keyword_placeholder": "フィルターするキーワードを入力",
  "ui.modal.days_title": "過去N日間でフィルター",
  "ui.modal.days_label": "日数（1以上の整数）",
  "ui.modal.days_placeholder": "例: 7",
  "ui.modal.after_title": "after（開始日時）でフィルター",
  "ui.modal.after_label": "開始日時",
  "ui.modal.after_placeholder": "例: 2026-01-01 または 2026-01-01T00:00:00",
  "ui.modal.before_title": "before（終了日時）でフィルター",
  "ui.modal.before_label": "終了日時",
  "ui.modal.before_placeholder": "例: 2026-02-28 または 2026-02-28T23:59:59",
  "ui.modal.jump_title": "ページ指定",
  "ui.modal.jump_label": "ページ番号",
  "ui.modal.jump_placeholder": "1〜{{total}}の整数",
  "ui.modal.webhook_title": "Webhook ID を入力",
  "ui.modal.webhook_label": "Webhook ID（17〜20桁の数字）",
  "ui.modal.webhook_placeholder": "123456789012345678",
  "ui.select.condition_user_placeholder": "ユーザーを選択",
  "ui.select.condition_channel_placeholder": "チャンネルを選択",
  "ui.button.start_scan": "スキャン開始",
  "ui.button.webhook_input": "Webhook ID を入力",
  "ui.button.condition_cancel": "キャンセル",

  // ── Embed ─────────────────────────────────────
  "embed.title.confirm": "削除対象メッセージ",
  "embed.title.deletion_confirm": "🗑️ 本当に削除しますか？",
  "embed.description.deletion_warning": "⚠️ **この操作は取り消せません**",
  "embed.description.deletion_confirm":
    "以下のメッセージを削除します（合計 {{count}}件）",
  "embed.title.summary": "削除完了",
  "embed.field.name.total_deleted": "合計削除件数",
  "embed.field.value.total_deleted": "{{count}}件",
  "embed.field.name.channel_breakdown": "チャンネル別内訳",
  "embed.field.value.channel_breakdown_item": "<#{{channelId}}>: {{count}}件",
  "embed.field.value.breakdown_empty": "—",
  "embed.title.conditions": "📋 コマンド条件",
  "embed.field.value.count_limited": "{{count}}件",
  "embed.field.value.count_unlimited": "(上限なし: {{count}}件)",
  "embed.field.value.user_all": "(全員対象)",
  "embed.field.value.none": "(なし)",
  "embed.field.value.channel_all": "(サーバー全体)",
  "embed.field.value.days_value": "過去{{days}}日間",
  "embed.field.value.after_value": "{{date}} 以降",
  "embed.field.value.before_value": "{{date}} 以前",
  "embed.title.condition_step":
    "対象ユーザー・チャンネルを選択してください（任意）",
  "embed.field.value.empty_content": "*(本文なし)*",
  "embed.field.value.attachments": "📎 {{count}}件",
  "embed.field.value.embed_no_title": "🔗 埋め込みコンテンツ",
  "embed.field.value.jump_to_message": "↗ メッセージへ",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.user_invalid_format":
    "`user` の形式が不正です。ユーザーIDまたはメンション（例: `<@123456789>`）を入力してください。",
  "user-response.no_filter":
    "フィルタ条件が指定されていないため実行できません。\n`count`・`user`・`keyword`・`days`・`after`・`before` のいずれか1つを指定してください。",
  "user-response.days_and_date_conflict":
    "`days` と `after`/`before` は同時に指定できません。どちらか一方を使用してください。",
  "user-response.after_invalid_format":
    "`after` の日付形式が不正です。`YYYY-MM-DD` または `YYYY-MM-DDTHH:MM:SS` 形式で指定してください。",
  "user-response.before_invalid_format":
    "`before` の日付形式が不正です。`YYYY-MM-DD` または `YYYY-MM-DDTHH:MM:SS` 形式で指定してください。",
  "user-response.date_range_invalid":
    "`after` は `before` より前の日時を指定してください。",
  "user-response.no_permission":
    "この操作を実行する権限がありません。\n必要な権限: メッセージ管理",
  "user-response.bot_no_permission":
    "Botに必要な権限が不足しているため、操作を実行できませんでした。\n必要な権限: メッセージ管理・メッセージ履歴の閲覧・チャンネルの閲覧\nサーバー管理者にBotの権限設定の確認をお願いします。",
  "user-response.text_channel_only": "テキストチャンネルを指定してください。",
  "user-response.no_messages_found":
    "削除可能なメッセージが見つかりませんでした。",
  "user-response.delete_failed": "メッセージの削除中にエラーが発生しました。",
  "user-response.scan_failed": "メッセージの収集中にエラーが発生しました。",
  "user-response.not_authorized": "操作権限がありません。",
  "user-response.jump_invalid_page":
    "ページ番号は 1〜{{total}} の整数で入力してください。",
  "user-response.days_invalid_value": "日数は1以上の整数で入力してください。",
  "user-response.after_future":
    "`after` には現在より前の日時を指定してください。（当日の指定は有効です）",
  "user-response.before_future":
    "`before` には現在より前の日時を指定してください。（当日の指定は有効です）",
  "user-response.locked":
    "現在このサーバーでメッセージ削除コマンドを実行中です。完了後に再度お試しください。",
  "user-response.channel_no_access":
    "指定したチャンネルにアクセスできません。\nBotにReadMessageHistoryおよびManageMessages権限が必要です。\nサーバー管理者にBotの権限設定の確認をお願いします。",
  "user-response.webhook_invalid_format":
    "Webhook ID の形式が不正です。17〜20桁の数字を入力してください。",
  "user-response.channel_partial_skip":
    "以下のチャンネルはBotの権限不足のためスキップしました: {{channels}}\nサーバー管理者にBotの権限設定の確認をお願いします。",
  "user-response.channel_all_no_access":
    "指定したチャンネルにアクセスできません。\nBotにReadMessageHistoryおよびManageMessages権限が必要です。\nサーバー管理者にBotの権限設定の確認をお願いします。",
  "user-response.scan_progress":
    "スキャン中... {{totalScanned}}件\n対象メッセージを検索中... {{collected}} / {{limit}}件",
  "user-response.delete_progress": "削除中... {{totalDeleted}} / {{total}}件",
  "user-response.delete_progress_channel":
    "<#{{channelId}}>: {{deleted}} / {{total}}件",
  "user-response.zero_targets": "削除対象がありません",
  "user-response.cancelled": "削除をキャンセルしました。",
  "user-response.timed_out":
    "タイムアウトしました。再度コマンドを実行してください。",
  "user-response.scan_timed_out":
    "スキャンがタイムアウトしました。収集済みのメッセージでプレビューを表示します。",
  "user-response.scan_timed_out_empty":
    "スキャンがタイムアウトしました。削除可能なメッセージが見つかりませんでした。",
  "user-response.delete_timed_out":
    "削除処理がタイムアウトしました。削除済み: {{count}}件",
  "user-response.condition_step_timeout":
    "条件設定がタイムアウトしました。再度コマンドを実行してください。",
  "user-response.condition_step_no_filter":
    "フィルタ条件が指定されていないため実行できません。\n`count`・`keyword`・`days`・`after`・`before` のいずれかのコマンドオプション、または対象ユーザーを選択してください。",

  // ── ログ ─────────────────────────────────────
  "log.cmd_all_channels_start": "全チャンネル取得開始",
  "log.cmd_channel_count": "取得チャンネル数={{count}}",
  "log.svc_scan_start":
    "スキャン開始 channels={{channelCount}} count={{count}} targetUserIds={{targetUserIds}}",
  "log.svc_initial_fetch": "初期フェッチ ch={{channelId}}",
  "log.svc_refill": "リフィル ch={{channelId}} before={{lastId}}",
  "log.svc_scan_complete": "スキャン完了 total={{count}}",
  "log.svc_channel_no_access":
    "チャンネル {{channelId}} はアクセス権なし、スキップ",
  "log.svc_bulk_delete_chunk": "bulkDelete チャンク size={{size}}",
  "log.svc_message_delete_failed":
    "メッセージ削除失敗 messageId={{messageId}}: {{error}}",
  "log.scan_error": "スキャンエラー: {{error}}",
  "log.delete_error": "削除処理エラー: {{error}}",
  "log.deleted":
    "{{userId}} deleted {{count}} messages{{countPart}}{{targetPart}}{{keywordPart}}{{periodPart}} channels=[{{channels}}]",
  "log.lock_acquired": "ロック取得: guild={{guildId}}",
  "log.lock_released": "ロック解放: guild={{guildId}}",
  "log.cancel_collector_ended": "Scan cancelCollector ended: reason={{reason}}",
  "log.aborting_non_user_end": "Aborting scan due to non-user end",
} as const;

export type MessageDeleteTranslations = typeof messageDelete;
