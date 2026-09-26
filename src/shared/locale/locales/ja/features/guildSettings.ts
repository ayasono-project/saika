// ギルド設定機能の翻訳リソース

export const guildSettings = {
  // ── コマンド定義 ─────────────────────────────
  "guild-settings.description": "ギルド設定を管理（サーバー管理権限が必要）",
  "guild-settings.set-locale.description": "Botの応答言語を設定",
  "guild-settings.set-locale.locale.description": "設定する言語を選択",
  "guild-settings.set-error-channel.description": "エラー通知チャンネルを設定",
  "guild-settings.set-error-channel.channel.description":
    "エラー通知先テキストチャンネル",
  "guild-settings.view.description": "現在のギルド設定を表示",
  "guild-settings.reset.description": "ギルド設定をリセット",
  "guild-settings.reset-all.description": "全機能の設定を一括リセット",

  // ── チョイス名 ──────────────────────────────
  "choice.locale.ja": "日本語",
  "choice.locale.en": "English",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.set_locale_success":
    "サーバーの言語を「{{locale}}」に設定しました。",
  "user-response.set_error_channel_success":
    "エラー通知チャンネルを {{channel}} に設定しました。",
  "user-response.invalid_channel_type":
    "テキストチャンネルを指定してください。",
  "user-response.reset_success": "ギルド設定をリセットしました。",
  "user-response.reset_cancelled": "リセットをキャンセルしました。",
  "user-response.reset_all_success": "全機能の設定をリセットしました。",
  "user-response.reset_all_cancelled": "リセットをキャンセルしました。",

  // ── embed: view ───────────────────────────────
  "embed.title.view": "ギルド設定",
  "embed.field.name.locale": "言語",
  "embed.field.name.error_channel": "エラー通知チャンネル",

  // ── embed: reset_confirm ──────────────────────
  "embed.title.reset_confirm": "ギルド設定リセット確認",
  "embed.description.reset_confirm":
    "ギルド設定（言語・エラー通知チャンネル）をリセットしますか？\nこの操作は元に戻せません。",

  // ── embed: reset_all_confirm ──────────────────
  "embed.title.reset_all_confirm": "全設定リセット確認",
  "embed.description.reset_all_confirm":
    "全機能の設定をリセットしますか？\n以下の設定がすべて削除されます。この操作は元に戻せません。",
  "embed.field.name.reset_all_target": "削除対象",
  // 取り消せない操作の確認文言。GuildSettingsAggregateRepository.deleteAllSettings が
  // 実際に消すテーブルと1対1で対応させること（過少申告すると利用者を騙すことになる）
  "embed.field.value.reset_all_target":
    "言語設定 / エラー通知チャンネル / AFK / VC自動作成（VAC）/ VC自動募集 / メッセージ固定 / メンバーログ / Bumpリマインダー（予約を含む）/ チケット（設定とチケット記録）/ リアクションロール / 未承認ユーザー自動キック（警告記録を含む）",

  // ── embed: join_intro（導入時 DM） ──────────────
  "embed.title.join_intro": "彩加を導入いただきありがとうございます",
  "embed.description.join_intro":
    "サーバー管理 Bot「彩加」です。\nまずは `/help` でできることを確認してみてください。設定は各機能の `*-settings` コマンド、または web ダッシュボードから行えます。",
  "embed.field.name.data_retention": "データの保持について",
  "embed.field.value.data_retention":
    "彩加をサーバーから外しても、設定は**{{days}}日間**保持されます。その間に入れ直せば以前の設定のまま使えます。{{days}}日を過ぎると自動的に削除されます。\nすぐに削除したい場合は、**外す前に** `/guild-settings reset-all` を実行してください（即時削除・取り消せません）。外した後はコマンドを実行できないため、{{days}}日後の自動削除を待つことになります。",
  "embed.field.name.manual": "マニュアル",
  "embed.field.name.dashboard": "web ダッシュボード",
  "embed.field.name.privacy_policy": "プライバシーポリシー",
  "embed.field.name.support_server": "サポートサーバー",

  // ── embed: join_return（猶予期間内の再導入 DM） ──
  "embed.title.join_return": "以前のデータを引き継ぎました",
  "embed.description.join_return":
    "おかえりなさい。このサーバーのデータは **{{deleteAt}}** に自動削除される予定でしたが、再導入を検知したため削除を取り消し、以前のデータを引き継ぎました。",

  // ── embed: inaccessible_ticket_channels（導入・再導入 DM に足す欄） ──
  // エラー通知チャンネルへ届けられなかったときだけ載せる（キックで Bot のロールも消え、入れないことがあるため）
  "embed.field.name.inaccessible_ticket_channels":
    "Bot が扱えないチケットのチャンネル",
  "embed.field.value.inaccessible_ticket_channels":
    "Bot を外したときに Discord が Bot の権限を消したため、入れ直す前に作ったチケットのチャンネル **{{count}}件** を Bot が扱えなくなっています（エラー通知チャンネルが未設定か、そこへ送れなかったため、DM でお知らせします）。各チャンネルの「チャンネルの編集」→「権限」で Bot を追加し、「チャンネルを見る」「メッセージを送信」「埋め込みリンク」「メッセージ履歴を読む」を許可してください（カテゴリの権限を変えても反映されません）。エラー通知チャンネルやログなど、Bot 用に権限を付けていた非公開チャンネルも、同じく付け直しが必要です。",

  // ── UIラベル ──────────────────────────────────
  "ui.button.reset_all_confirm": "リセットする",
  "ui.button.reset_all_cancel": "キャンセル",

  // ── エラーチャンネル通知 ─────────────────────────
  "error-notification.title": "エラー通知",
  "error-notification.warn_title": "警告通知",
  "error-notification.feature": "機能",
  "error-notification.action": "処理",
  "error-notification.message": "詳細",

  // ── ログ ──────────────────────────────────────
  "log.locale_set": "言語設定 GuildId: {{guildId}} Locale: {{locale}}",
  "log.error_channel_set":
    "エラー通知チャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.reset": "ギルド設定リセット GuildId: {{guildId}}",
  "log.reset_all": "全設定リセット GuildId: {{guildId}}",
} as const;

export type GuildSettingsTranslations = typeof guildSettings;
