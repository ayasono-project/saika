// src/shared/locale/locales/ja/features/ticket.ts
// チケットチャンネル機能の日本語翻訳

export const ticket = {
  // ── コマンド定義
  "ticket.description": "チケットの操作",
  "ticket.close.description": "チケットをクローズ",
  "ticket.open.description": "チケットを再オープン",
  "ticket.delete.description": "チケットを削除",
  "ticket-config.description": "チケット機能の設定（サーバー管理権限が必要）",
  "ticket-config.setup.description": "チケットパネルを設置",
  "ticket-config.setup.category.description": "チケット作成先カテゴリ",
  "ticket-config.teardown.description": "チケットパネルを撤去",
  "ticket-config.reset.description": "全設定をリセット",
  "ticket-config.view.description": "現在の設定を表示",
  "ticket-config.edit-panel.description": "パネルのタイトル・説明文を編集",
  "ticket-config.edit-panel.category.description": "編集対象のカテゴリ",
  "ticket-config.set-roles.description": "スタッフロールを上書き設定",
  "ticket-config.set-roles.category.description": "対象カテゴリ",
  "ticket-config.add-roles.description": "スタッフロールを追加",
  "ticket-config.add-roles.category.description": "対象カテゴリ",
  "ticket-config.remove-roles.description": "スタッフロールを削除",
  "ticket-config.remove-roles.category.description": "対象カテゴリ",
  "ticket-config.set-auto-delete.description": "自動削除期間を設定",
  "ticket-config.set-auto-delete.category.description": "対象カテゴリ",
  "ticket-config.set-auto-delete.days.description": "自動削除までの日数",
  "ticket-config.set-max-tickets.description": "同時チケット上限を設定",
  "ticket-config.set-max-tickets.category.description": "対象カテゴリ",
  "ticket-config.set-max-tickets.count.description": "ユーザーあたりの上限数",

  // ── ユーザーレスポンス
  "user-response.setup_success": "チケットパネルを設置しました。",
  "user-response.teardown_success": "チケットパネルを撤去しました。",
  "user-response.teardown_cancelled": "キャンセルしました。",
  "user-response.reset_success": "全てのチケット設定をリセットしました。",
  "user-response.reset_cancelled": "キャンセルしました。",
  "user-response.ticket_created": "チケットを作成しました: {{channel}}",
  "user-response.ticket_closed": "チケットをクローズしました。",
  "user-response.ticket_opened": "チケットを再オープンしました。",
  "user-response.ticket_deleted": "チケットを削除しました。",
  "user-response.delete_cancelled": "キャンセルしました。",
  "user-response.edit_panel_success": "パネルを更新しました。",
  "user-response.set_roles_success": "スタッフロールを設定しました。",
  "user-response.add_roles_success": "スタッフロールを追加しました。",
  "user-response.remove_roles_success": "スタッフロールを削除しました。",
  "user-response.set_auto_delete_success":
    "自動削除期間を{{days}}日に設定しました。",
  "user-response.set_max_tickets_success":
    "同時チケット上限を{{count}}件に設定しました。",
  "user-response.category_already_setup":
    "このカテゴリには既にチケットパネルが設定されています。",
  "user-response.config_not_found":
    "このカテゴリのチケット設定が見つかりません。",
  "user-response.no_configs": "チケット設定がありません。",
  "user-response.not_ticket_channel":
    "このコマンドはチケットチャンネル内でのみ実行できます。",
  "user-response.not_authorized": "この操作を実行する権限がありません。",
  "user-response.ticket_already_closed":
    "このチケットは既にクローズされています。",
  "user-response.ticket_already_open":
    "このチケットは既にオープンされています。",
  "user-response.max_tickets_reached":
    "チケットの同時作成上限（{{max}}件）に達しています。",
  "user-response.cannot_remove_last_role":
    "スタッフロールを0件にすることはできません。",
  "user-response.panel_not_found":
    "パネルメッセージが見つかりませんでした。パネルが削除された可能性があります。",
  "user-response.panels_cleaned_up":
    "{{count}}件のパネルが削除済みのためクリーンアップしました。",
  "user-response.session_expired":
    "セッションが期限切れです。もう一度お試しください。",
  "user-response.and_more": "他 {{count}}件",

  // ── Embed
  "embed.title.panel_default": "サポート",
  "embed.description.panel_default":
    "サポートが必要な場合は下のボタンからチケットを作成してください。",
  "embed.title.ticket": "チケット: {{subject}}",
  "embed.field.name.created_by": "作成者",
  "embed.field.name.created_at": "作成日時",
  "embed.title.closed": "チケットクローズ",
  "embed.description.closed": "チケットをクローズしました。",
  "embed.description.auto_delete": "<t:{{timestamp}}:R>に自動削除されます",
  "embed.title.reopened": "チケットオープン",
  "embed.description.reopened": "チケットをオープンしました。",
  "embed.title.delete_confirm": "チケット削除確認",
  "embed.description.delete_warning":
    "このチケットチャンネルを削除します。この操作は取り消せません。",
  "embed.title.teardown_confirm": "チケット撤去確認",
  "embed.description.teardown_confirm":
    "選択したカテゴリのパネル・設定を削除します。この操作は取り消せません。",
  "embed.description.teardown_warning":
    "オープン中のチケットが{{count}}件あります。続行するとチケットチャンネルも全て削除されます。この操作は取り消せません。",
  "embed.field.name.target_categories": "削除対象カテゴリ",
  "embed.field.name.open_tickets": "オープン中のチケット（{{count}}件）",
  "embed.title.reset_confirm": "チケット設定リセット確認",
  "embed.description.reset_warning":
    "全てのチケット設定をリセットします。全カテゴリのパネル・チケットチャンネル・設定が削除されます。この操作は取り消せません。",
  "embed.title.config_view": "チケット設定",
  "embed.field.name.category": "カテゴリ",
  "embed.field.name.staff_roles": "スタッフロール",
  "embed.field.name.auto_delete": "自動削除期間",
  "embed.field.name.max_tickets": "同時チケット上限",
  "embed.field.name.panel_channel": "パネル設置チャンネル",
  "embed.field.name.open_ticket_count": "オープン中のチケット数",
  "embed.field.value.auto_delete_days": "{{days}}日",
  "embed.field.value.max_tickets_count": "{{count}}件",
  "embed.field.value.open_ticket_count": "{{count}}件",

  // ── UIラベル
  "ui.button.create_ticket": "チケットを作成",
  "ui.button.close": "クローズ",
  "ui.button.reopen": "再オープン",
  "ui.button.delete": "削除",
  "ui.button.delete_confirm": "削除する",
  "ui.button.teardown_confirm": "撤去する",
  "ui.button.teardown_cancel": "キャンセル",
  "ui.select.roles_placeholder": "スタッフロールを選択してください",
  "ui.select.teardown_placeholder": "撤去するカテゴリを選択してください",
  "ui.select.view_placeholder": "カテゴリを選択してください",
  "ui.modal.setup_title": "パネル設定",
  "ui.modal.setup_field_title": "パネルタイトル",
  "ui.modal.setup_field_description": "パネル説明文",
  "ui.modal.edit_panel_title": "パネル編集",
  "ui.modal.setup_field_color": "カラー（例: #00A8F3）",
  "ui.modal.edit_panel_field_color": "カラー（例: #00A8F3）",
  "user-response.invalid_color":
    "無効なカラーコードです。#RRGGBB 形式で入力してください。",
  "embed.field.name.panel_color": "パネルカラー",
  "ui.modal.create_ticket_title": "チケットを作成",
  "ui.modal.create_ticket_subject": "件名",
  "ui.modal.create_ticket_detail": "詳細",

  // ── ログ
  "log.setup":
    "チケットパネルを設置 GuildId: {{guildId}} CategoryId: {{categoryId}} ChannelId: {{channelId}}",
  "log.teardown":
    "チケットパネルを撤去 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.reset": "全チケット設定をリセット GuildId: {{guildId}}",
  "log.ticket_created":
    "チケット作成 GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}} TicketNumber: {{ticketNumber}}",
  "log.ticket_closed":
    "チケットクローズ GuildId: {{guildId}} ChannelId: {{channelId}} ClosedBy: {{closedBy}}",
  "log.ticket_opened":
    "チケット再オープン GuildId: {{guildId}} ChannelId: {{channelId}} OpenedBy: {{openedBy}}",
  "log.ticket_deleted":
    "チケット削除 GuildId: {{guildId}} ChannelId: {{channelId}} DeletedBy: {{deletedBy}}",
  "log.ticket_auto_deleted":
    "チケット自動削除 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_config_saved":
    "チケット設定を保存 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_config_save_failed":
    "チケット設定保存に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_saved":
    "チケットを保存 GuildId: {{guildId}} TicketId: {{ticketId}}",
  "log.database_ticket_save_failed":
    "チケット保存に失敗 GuildId: {{guildId}} TicketId: {{ticketId}}",
  "log.database_config_find_failed":
    "チケット設定取得に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_config_find_all_failed":
    "チケット設定一覧取得に失敗 GuildId: {{guildId}}",
  "log.database_config_delete_failed":
    "チケット設定削除に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_config_delete_all_failed":
    "チケット設定全削除に失敗 GuildId: {{guildId}}",
  "log.database_config_increment_counter_failed":
    "チケットカウンターインクリメントに失敗 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_find_failed": "チケット取得に失敗 Id: {{id}}",
  "log.database_ticket_find_by_channel_failed":
    "チケット取得に失敗 ChannelId: {{channelId}}",
  "log.database_ticket_find_open_failed":
    "オープンチケット取得に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}} UserId: {{userId}}",
  "log.database_ticket_find_all_by_category_failed":
    "チケット一覧取得に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_find_closed_failed":
    "クローズ済みチケット取得に失敗 GuildId: {{guildId}}",
  "log.database_ticket_create_failed":
    "チケット作成に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_update_failed": "チケット更新に失敗 Id: {{id}}",
  "log.database_ticket_delete_failed": "チケット削除に失敗 Id: {{id}}",
  "log.database_ticket_delete_by_category_failed":
    "カテゴリのチケット全削除に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_delete_all_failed":
    "チケット全削除に失敗 GuildId: {{guildId}}",
  "log.auto_delete_scheduled":
    "自動削除タイマー開始 GuildId: {{guildId}} ChannelId: {{channelId}} DelayMs: {{delayMs}}",
  "log.auto_delete_cancelled":
    "自動削除タイマーキャンセル GuildId: {{guildId}} TicketId: {{ticketId}}",
  "log.auto_delete_restore": "Bot起動時 自動削除タイマー復元 件数: {{count}}",
  "log.panel_deleted":
    "パネル削除を検知 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.panel_channel_deleted":
    "パネル設置チャンネル削除を検知 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.panel_cleanup_failed":
    "パネル削除時のクリーンアップに失敗 GuildId: {{guildId}}",
} as const;

export type TicketTranslations = typeof ticket;
