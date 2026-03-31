// src/shared/locale/locales/ja/features/reactionRole.ts
// リアクションロール機能の日本語翻訳

export const reactionRole = {
  // ── コマンド定義
  "reaction-role-config.description":
    "リアクションロール機能の設定（サーバー管理権限が必要）",
  "reaction-role-config.setup.description": "リアクションロールパネルを設置",
  "reaction-role-config.teardown.description": "リアクションロールパネルを撤去",
  "reaction-role-config.view.description": "現在の設定を表示",
  "reaction-role-config.edit-panel.description":
    "パネルのタイトル・説明文・カラーを編集",
  "reaction-role-config.add-button.description": "パネルにボタンを追加",
  "reaction-role-config.remove-button.description": "パネルからボタンを削除",
  "reaction-role-config.edit-button.description": "ボタンを編集",

  // ── ユーザーレスポンス
  "user-response.setup_success": "リアクションロールパネルを設置しました。",
  "user-response.teardown_success":
    "{{count}}件のリアクションロールパネルを撤去しました。",
  "user-response.teardown_cancelled": "キャンセルしました。",
  "user-response.edit_panel_success": "パネルを更新しました。",
  "user-response.add_button_success": "ボタンを{{count}}個追加しました。",
  "user-response.remove_button_success": "ボタンを{{count}}個削除しました。",
  "user-response.remove_button_cancelled": "キャンセルしました。",
  "user-response.edit_button_success": "ボタンを更新しました。",
  "user-response.role_added": "{{roles}} を付与しました。",
  "user-response.role_removed": "{{roles}} を解除しました。",
  "user-response.role_switched": "{{roles}} に切り替えました。",
  "user-response.role_already_granted": "既にロールが付与されています。",
  "user-response.role_already_selected": "既にこのロールが選択されています。",
  "user-response.role_too_high":
    "Botの権限ではこのロールを操作できません。サーバー管理者に連絡してください。",
  "user-response.no_panels": "リアクションロール設定がありません。",
  "user-response.button_limit_reached": "ボタンの上限（25個）に達しています。",
  "user-response.cannot_remove_all_buttons":
    "ボタンを0個にすることはできません。",
  "user-response.invalid_color":
    "カラーの形式が正しくありません。#RRGGBB形式で入力してください。",
  "user-response.invalid_emoji":
    "絵文字の形式が正しくありません。Unicode絵文字またはDiscordカスタム絵文字（<:name:id>）を入力してください。",
  "user-response.invalid_style":
    "スタイルの形式が正しくありません。primary / secondary / success / danger のいずれかを入力してください。",
  "user-response.session_expired":
    "セッションの有効期限が切れました。もう一度コマンドを実行してください。",
  "user-response.panels_cleaned_up":
    "{{count}}件のパネルが削除済みのためクリーンアップしました。",
  "user-response.and_more": "他 {{count}}件",
  "user-response.panel_message_not_found":
    "パネルメッセージが見つかりませんでした。パネルが削除された可能性があります。",

  // ── Embed
  "embed.title.panel_default": "ロール選択",
  "embed.description.panel_default":
    "ボタンを押してロールを取得・解除できます。",
  "embed.title.teardown_confirm": "パネル撤去確認",
  "embed.description.teardown_confirm":
    "選択した{{count}}件のパネルを撤去します。この操作は取り消せません。",
  "embed.field.name.teardown_targets": "撤去対象（{{count}}件）",
  "embed.title.remove_button_confirm": "ボタン削除確認",
  "embed.description.remove_button_confirm":
    "選択した{{count}}個のボタンを削除します。この操作は取り消せません。",
  "embed.field.name.remove_targets": "削除対象",
  "embed.title.config_view": "リアクションロール設定",
  "embed.field.name.panel_title": "パネルタイトル",
  "embed.field.name.channel": "チャンネル",
  "embed.field.name.mode": "モード",
  "embed.field.name.color": "カラー",
  "embed.field.name.button_count": "ボタン数",
  "embed.field.name.button_list": "ボタン一覧",
  "embed.field.value.mode_toggle": "トグル",
  "embed.field.value.mode_one_action": "ワンアクション",
  "embed.field.value.mode_exclusive": "排他",

  // ── UIラベル
  "ui.button.setup_add": "もう1つ追加",
  "ui.button.setup_done": "完了",
  "ui.button.teardown_confirm": "撤去する",
  "ui.button.teardown_cancel": "キャンセル",
  "ui.select.teardown_placeholder": "撤去するパネルを選択してください",
  "ui.button.remove_button_confirm": "削除する",
  "ui.button.remove_button_cancel": "キャンセル",
  "ui.select.panel_placeholder": "パネルを選択してください",
  "ui.select.button_placeholder": "ボタンを選択してください",
  "ui.select.mode_placeholder": "モードを選択してください",
  "ui.select.mode_toggle": "トグル",
  "ui.select.mode_toggle_description": "ボタンを押すたびにロールを付与/解除",
  "ui.select.mode_one_action": "ワンアクション",
  "ui.select.mode_one_action_description": "ロールを付与（取り消し不可）",
  "ui.select.mode_exclusive": "排他",
  "ui.select.mode_exclusive_description": "グループ内で1つだけ選択可能",
  "ui.select.roles_placeholder": "ロールを選択してください",
  "ui.modal.setup_title": "パネル設定",
  "ui.modal.setup_field_title": "パネルタイトル",
  "ui.modal.setup_field_description": "パネル説明文",
  "ui.modal.setup_field_color": "カラー（例: #00A8F3）",
  "ui.modal.button_settings_title": "ボタン設定",
  "ui.modal.button_field_label": "ボタンラベル",
  "ui.modal.button_field_emoji": "絵文字",
  "ui.modal.button_field_style":
    "スタイル（primary / secondary / success / danger）",
  "ui.modal.edit_panel_title": "パネル編集",

  // ── ログ
  "log.setup_started":
    "リアクションロールセットアップ開始 GuildId: {{guildId}}",
  "log.setup":
    "リアクションロールパネルを設置 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.teardown":
    "リアクションロールパネルを撤去 GuildId: {{guildId}} PanelIds: {{panelIds}}",
  "log.role_granted":
    "ロール付与 GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}}",
  "log.role_removed":
    "ロール解除 GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}}",
  "log.button_added":
    "ボタン追加 GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}}",
  "log.button_removed":
    "ボタン削除 GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}}",
  "log.button_edited":
    "ボタン編集 GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}}",
  "log.database_panel_saved":
    "パネル設定を保存 GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.database_panel_save_failed":
    "パネル設定保存に失敗 GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.database_panel_find_failed":
    "パネル設定取得に失敗 GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.database_panel_delete_failed":
    "パネル設定削除に失敗 GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.panel_message_deleted":
    "パネルメッセージ削除検知 GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.panel_channel_deleted":
    "パネルチャンネル削除検知 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.panel_cleanup_failed": "パネルクリーンアップに失敗 GuildId: {{guildId}}",
} as const;
