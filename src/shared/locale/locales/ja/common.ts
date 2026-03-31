// src/shared/locale/locales/ja/common.ts
// 共通の翻訳リソース

export const common = {
  // 状態ラベル
  // メッセージEmbedのタイトル・フィールドで共通利用
  success: "成功",
  info: "情報",
  warning: "警告",
  error: "エラー",
  // 機能設定の ON/OFF 表示
  enabled: "有効",
  disabled: "無効",
  // 未設定/空状態のプレースホルダ
  none: "なし",

  // Embed タイトル（体言止め）
  // ステータス通知 Embed の options.title で使用する標準タイトル
  title_permission_denied: "権限不足",
  title_bot_permission_denied: "Bot権限不足",
  title_invalid_input: "入力不備",
  title_option_conflict: "オプション競合",
  title_filter_required: "フィルタ不足",
  title_channel_invalid: "チャンネル不正",
  title_channel_not_found: "チャンネル不在",
  title_not_in_vc: "VC未参加",
  title_config_required: "設定不足",
  title_resource_not_found: "リソース不在",
  title_limit_exceeded: "上限超過",
  title_role_limit_exceeded: "ロール上限超過",
  title_timeout: "タイムアウト",
  title_already_running: "実行中",
  title_already_registered: "登録済み",
  title_not_configured: "未設定",
  title_server_only: "サーバー専用",
  title_operation_error: "操作エラー",
  title_scan_error: "収集エラー",
  title_delete_error: "削除エラー",
  title_move_failed: "移動失敗",
  title_rate_limited: "レート制限",
  title_config_error: "設定エラー",

  // 機能横断エラー（旧 errors.ts から吸収）
  // データベースエラー
  "database.get_config_failed": "設定の取得に失敗しました。",
  "database.save_config_failed": "設定の保存に失敗しました。",
  "database.update_config_failed": "設定の更新に失敗しました。",
  "database.delete_config_failed": "設定の削除に失敗しました。",
  "database.check_existence_failed": "存在確認に失敗しました。",
  "database.unknown_error": "不明なエラー",

  // バリデーションエラー
  "validation.error_title": "入力エラー",
  "validation.guild_only": "このコマンドはサーバー内でのみ使用できます。",
  "validation.invalid_subcommand": "無効なサブコマンドです。",

  // 権限エラー
  "permission.manage_guild_required":
    "このコマンドを実行するにはサーバー管理（MANAGE_GUILD）権限が必要です。",

  // インタラクションエラー
  "interaction.timeout": "操作がタイムアウトしました。",

  // 一般的なエラー
  "general.error_title": "エラー",
  "general.unexpected_production":
    "予期しないエラーが発生しました。後ほど再度お試しください。",
  "general.unexpected_with_message": "エラー: {{message}}",

  // クールダウン（旧 commands.ts から吸収）
  "cooldown.wait": "⏱️ このコマンドは **{{seconds}}秒後** に使用できます。",

  // ページネーション（機能横断UIコンポーネント）
  "ui.button.page_first": "先頭",
  "ui.button.page_prev": "前へ",
  "ui.button.page_next": "次へ",
  "ui.button.page_last": "末尾",
  "ui.button.page_jump": "{{page}}/{{total}}ページ",
  "ui.modal.page_jump_title": "ページ指定",
  "ui.modal.page_jump_label": "ページ番号",
  "ui.modal.page_jump_placeholder": "1〜{{total}}の整数",

  // Bot権限不足エラー
  "bot_permission.missing":
    "Botに必要な権限が不足しているため、操作を実行できませんでした。\nサーバー管理者に以下の確認をお願いします:\n・Botに管理者権限が付与されていること\n・対象チャンネルでBotの権限が制限されていないこと",
  "bot_permission.hint_manage_channels":
    "この操作にはBotに **チャンネルの管理（Manage Channels）** 権限が必要です。",
  "bot_permission.hint_move_members":
    "この操作にはBotに **メンバーを移動（Move Members）** 権限が必要です。",
  "bot_permission.hint_send_messages":
    "この操作にはBotに **メッセージを送信（Send Messages）** 権限が必要です。",
  "bot_permission.hint_manage_messages":
    "この操作にはBotに **メッセージの管理（Manage Messages）** 権限が必要です。",
  "bot_permission.hint_manage_roles":
    "この操作にはBotに **ロールの管理（Manage Roles）** 権限が必要です。",

  // 共通キャンセル
  cancelled: "キャンセルしました。",

  // 機能横断 Embed タイトル・フィールド
  "embed.title.success": "設定完了",
  "embed.field.name.status": "状態",
  "embed.field.value.not_configured": "未設定",

  // 機能横断 UI ボタンラベル
  "ui.button.cancel": "キャンセル",
  "ui.button.reset_confirm": "リセットする",
  "ui.button.reset_cancel": "キャンセル",
} as const;

export type CommonTranslations = typeof common;
