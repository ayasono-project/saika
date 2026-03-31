// src/shared/locale/locales/ja/features/vcRecruit.ts
// VC募集機能の翻訳リソース

export const vcRecruit = {
  // ── コマンド定義 ─────────────────────────────
  "vc-recruit-config.description": "VC募集機能の設定（サーバー管理権限が必要）",
  "vc-recruit-config.setup.description": "VC募集チャンネルをセットアップ",
  "vc-recruit-config.setup.category.description":
    "作成先カテゴリー（TOP またはカテゴリー名。未指定時は実行チャンネルのカテゴリー）",
  "vc-recruit-config.setup.category.top": "TOP（カテゴリーなし）",
  "vc-recruit-config.setup.thread-archive.description":
    "招募スレッドの自動アーカイブ時間（1h/24h/3d/1w、未指定: 24h）",
  "vc-recruit-config.teardown.description":
    "VC募集チャンネルを削除（選択UI経由）",
  "vc-recruit-config.add-role.description": "メンション候補ロールを追加",
  "vc-recruit-config.remove-role.description": "メンション候補ロールを削除",
  "vc-recruit-config.view.description": "現在のVC募集設定を表示",

  // ── UIラベル ──────────────────────────────────
  "ui.button.create_recruit": "VC募集を作成",
  "ui.modal.create_title": "VC募集を作成（2/2）",
  "ui.modal.content_label": "募集内容",
  "ui.modal.content_placeholder":
    "招待メッセージを入力してください（最大200文字）",
  "ui.modal.vc_name_label": "新規VC名（任意）",
  "ui.modal.vc_name_placeholder":
    "「新規VC作成」選択時のみ使用（未入力: 表示名's Room）",
  "ui.select.mention_placeholder": "メンション（なし）",
  "ui.select.vc_placeholder": "VCを選択",
  "ui.button.open_modal": "📝 内容を入力する",
  "ui.select.no_mention": "なし（メンションしない）",
  "ui.select.new_vc": "🆕 新規VC作成",
  "ui.button.join_vc": "🎤 VCに参加",
  "ui.button.rename_vc": "✏️ VC名を変更",
  "ui.button.end_vc": "🔇 募集終了",
  "ui.button.delete_post": "🗑️ 募集を削除",
  "ui.button.vc_ended": "🔇 募集終了済み",
  "ui.button.end_confirm": "終了する",
  "ui.button.delete_confirm": "削除する",
  "ui.modal.rename_title": "VC名を変更",
  "ui.modal.rename_vc_name_label": "VC名",
  "ui.modal.rename_vc_name_placeholder":
    "新しいVC名を入力してください（最大100文字）",
  "ui.select.teardown_placeholder": "撤去するカテゴリーを選択してください",
  "ui.select.teardown_top": "TOP（カテゴリーなし）",
  "ui.select.teardown_unknown_category": "不明なカテゴリー（ID: {{id}}）",
  "ui.button.teardown_confirm": "🗑️ 撤去する",
  "ui.button.teardown_cancel": "キャンセル",
  "ui.button.teardown_redo": "選び直す",
  "ui.select.add_role_placeholder": "追加するロールを選択（複数選択可）",
  "ui.button.add_role_confirm": "追加する",
  "ui.button.add_role_cancel": "キャンセル",
  "ui.select.remove_role_placeholder": "削除するロールを選択（複数選択可）",
  "ui.button.remove_role_confirm": "削除する",
  "ui.button.remove_role_cancel": "キャンセル",

  // ── Embed ─────────────────────────────────────
  "embed.title.config_view": "VC募集設定",
  "embed.field.name.setups": "セットアップ済みカテゴリー",
  "embed.field.name.roles": "メンション候補ロール",
  "embed.field.value.no_setups": "未設定",
  "embed.field.value.no_roles": "なし",
  "embed.field.value.top": "TOP",
  "embed.field.value.setup_item":
    "• {{category}}\n　募集作成: {{panel}}\n　募集投稿: {{post}}",
  "embed.title.add_role_success": "ロールの登録に成功",
  "embed.field.name.add_role_success": "登録したロール",
  "embed.title.add_role_limit": "上限超過でロールの登録に失敗",
  "embed.description.add_role_limit":
    "メンション候補ロールの登録上限({{limit}}件)に達したため、以下のロールは登録できませんでした。",
  "embed.field.name.add_role_limit": "登録できなかったロール",
  "embed.title.remove_role_success": "ロールの削除に成功",
  "embed.field.name.remove_role_success": "削除したロール",
  "embed.title.panel": "📝 VC募集",
  "embed.description.panel":
    "ボタンからVC参加者の募集を作成できます。\n\n**作成手順**\n1. 下のボタンを押して募集作成を開始します\n2. メンションするロールと参加するVCを選択します\n3. 募集内容を入力して送信すると、募集一覧チャンネルに投稿されます",
  "embed.title.recruit_post": "📢 VC募集",
  "embed.title.recruit_post_ended": "📢 VC募集【募集終了】",
  "embed.field.name.content": "募集内容",
  "embed.field.name.vc": "VC",
  "embed.field.name.recruiter": "募集者",
  "embed.field.value.thread_name": "{{recruiter}}の募集",
  "embed.title.select_step": "📋 ステップ 1/2",
  "embed.description.select_step": "メンション・VCを選択してください",
  "embed.title.teardown_confirm": "VC募集チャンネルを撤去しますか？",
  "embed.field.name.teardown_categories": "対象カテゴリー",
  "embed.description.teardown_warning":
    "選択したカテゴリーの募集作成チャンネル・募集一覧チャンネルが削除されます。この操作は取り消せません。",
  "embed.field.value.channel_name_panel": "募集作成",
  "embed.field.value.channel_name_post": "募集一覧",
  "embed.title.add_role_select": "追加するロールを選択してください",
  "embed.title.remove_role_select": "削除するロールを選択してください",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.setup_success": "VC募集チャンネルを作成しました。",
  "user-response.setup_panel_channel": "募集作成: {{channel}}",
  "user-response.setup_post_channel": "募集投稿: {{channel}}",
  "user-response.teardown_success": "VC募集チャンネルを撤去しました。",
  "user-response.teardown_category_item": "🗑️ {{category}}",
  "user-response.teardown_partial_error":
    "以下のカテゴリーで一部エラーが発生しました：",
  "user-response.teardown_cancelled": "キャンセルしました。",
  "user-response.add_role_success": "{{role}} をメンション候補に追加しました。",
  "user-response.remove_role_success":
    "{{role}} をメンション候補から削除しました。",
  "user-response.post_success": "募集を投稿しました。",
  "user-response.post_success_link": "投稿を確認する",
  "user-response.end_vc_created":
    "募集を終了しますか？\nVCが削除され、募集投稿が終了済みに更新されます。投稿とスレッドは残ります。",
  "user-response.end_vc_existing":
    "募集を終了しますか？\n募集投稿が終了済みに更新されます。VCは削除されません。",
  "user-response.end_vc_success": "募集を終了しました。",
  "user-response.cancelled": "キャンセルしました。",
  "user-response.delete_created":
    "この募集を削除しますか？\n投稿・スレッド・新規作成VCがすべて削除されます。",
  "user-response.delete_existing":
    "この募集を削除しますか？\n投稿・スレッドが削除されます。VCは削除されません。",
  "user-response.delete_success": "募集を削除しました。",
  "user-response.rename_success": "VC名を変更しました。",
  "user-response.already_setup":
    "このカテゴリーには既にVC募集チャンネルが設置されています。",
  "user-response.not_setup":
    "このカテゴリーにはVC募集チャンネルが設置されていません。",
  "user-response.role_already_added": "{{role}} は既に追加されています。",
  "user-response.role_not_found":
    "{{role}} はメンション候補に登録されていません。",
  "user-response.role_limit_exceeded":
    "メンション候補ロールは最大25件までです。",
  "user-response.vc_deleted": "選択したVCは既に削除されています。",
  "user-response.category_full":
    "カテゴリーのチャンネル数が上限（50）に達しているため作成できません。",
  "user-response.panel_channel_not_found":
    "VC募集パネルチャンネルが見つかりません。セットアップが削除された可能性があります。",
  "user-response.voice_state_update_failed":
    "[VC募集機能] voiceStateUpdate処理失敗",
  "user-response.no_permission":
    "この操作は投稿者またはサーバー管理権限保持者のみ実行できます。",
  "user-response.vc_already_deleted": "対象のVCは既に削除されています。",
  "user-response.no_roles_registered":
    "メンション候補ロールが登録されていません。先に add-role で追加してください。",
  "user-response.add_role_no_selection": "追加するロールを選択してください。",
  "user-response.remove_role_no_selection":
    "削除するロールを選択してください。",

  // ── ログ ─────────────────────────────────────
  "log.voice_state_update_failed": "voiceStateUpdate処理失敗",
  "log.empty_vc_deleted":
    "空VCを削除 GuildId: {{guildId}} ChannelId: {{channelId}} ChannelName: {{channelName}}",
  "log.voice_state_update_error": "voiceStateUpdate処理エラー",
  "log.panel_channel_delete_detected":
    "パネルチャンネル削除を検知、投稿チャンネルとセットアップを削除 GuildId: {{guildId}} PanelChannelId: {{panelChannelId}}",
  "log.post_channel_delete_failed":
    "投稿チャンネル削除失敗 GuildId: {{guildId}} PostChannelId: {{postChannelId}}",
  "log.post_channel_delete_detected":
    "投稿チャンネル削除を検知、パネルチャンネルとセットアップを削除 GuildId: {{guildId}} PostChannelId: {{postChannelId}}",
  "log.panel_channel_cleanup_failed":
    "パネルチャンネル削除失敗 GuildId: {{guildId}} PanelChannelId: {{panelChannelId}}",
  "log.created_vc_manual_delete_detected":
    "作成VC手動削除を検知、DBを更新し投稿ボタンをVC終了済みに変更 GuildId: {{guildId}} VcId: {{vcId}}",
  "log.channel_created":
    "新規VC作成 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_deleted": "VC削除 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.recruit_posted":
    "募集メッセージ投稿 GuildId: {{guildId}} UserId: {{userId}}",
  "log.setup_created":
    "セットアップ作成 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.setup_removed":
    "セットアップ削除 GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.panel_delete_detected":
    "パネルメッセージ削除を検知、パネルを再送信します GuildId: {{guildId}} PanelChannelId: {{panelChannelId}} MessageId: {{messageId}}",
  "log.panel_resent":
    "パネルメッセージを再送信しました GuildId: {{guildId}} PanelChannelId: {{panelChannelId}} NewMessageId: {{newMessageId}}",
  "log.database_setup_add_failed": "セットアップ追加に失敗",
  "log.database_panel_message_update_failed": "パネルメッセージID更新に失敗",
  "log.database_setup_remove_failed": "セットアップ削除に失敗",
  "log.database_vc_add_failed": "作成VC追加に失敗",
  "log.database_vc_remove_failed": "作成VC削除に失敗",
  "log.database_role_add_failed": "メンションロール追加に失敗",
  "log.database_role_remove_failed": "メンションロール削除に失敗",
} as const;

export type VcRecruitTranslations = typeof vcRecruit;
