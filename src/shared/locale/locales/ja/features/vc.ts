// src/shared/locale/locales/ja/features/vc.ts
// VC操作コマンド（/vc rename, /vc limit, /vc disconnect, /vc move）の翻訳リソース
// action-log.* / bulk-confirm.* は /afk と共有する共通アクションログ・確認ダイアログのリソース

export const vc = {
  // ── コマンド定義 ─────────────────────────────
  "vc.description": "VCの設定を変更",
  "vc.rename.description": "参加中のVC名を変更",
  "vc.rename.name.description": "新しいVC名",
  "vc.limit.description": "参加中VCの人数制限を変更",
  "vc.limit.limit.description": "人数制限（0=無制限、0~99）",
  "vc.disconnect.description": "メンバー、またはVC全員をVCから切断",
  "vc.disconnect.target-member.description": "切断する対象メンバー",
  "vc.disconnect.target-channel.description": "全員を切断する対象VC",
  "vc.disconnect.reason.description": "監査ログに記録する理由",
  "vc.move.description": "メンバー、またはVC全員を別のVCに移動",
  "vc.move.target-member.description": "移動する対象メンバー",
  "vc.move.target-channel.description": "全員を移動する対象VC",
  "vc.move.to.description": "移動先のVC",
  "vc.move.reason.description": "監査ログに記録する理由",

  // ── ユーザーレスポンス ────────────────────────
  "user-response.renamed": "VC名を {{name}} に変更しました。",
  "user-response.limit_changed": "人数制限を {{limit}} に設定しました。",
  "user-response.unlimited": "無制限",
  "user-response.not_in_any_vc": "このコマンドはVC参加中にのみ使用できます。",
  "user-response.not_managed_channel":
    "このVCはBot管理のチャンネルではありません。",
  "user-response.limit_out_of_range":
    "人数制限は0〜99の範囲で指定してください。",
  "user-response.target_required":
    "対象のメンバー、またはVCを指定してください。",
  "user-response.target_conflict": "メンバーとVCは同時に指定できません。",
  "user-response.target_not_voice": "ボイスチャンネルを指定してください。",
  "user-response.member_not_found": "対象のメンバーが見つかりませんでした。",
  "user-response.target_not_in_voice":
    "指定されたメンバーはボイスチャンネルにいません。",
  "user-response.channel_empty": "対象VCには誰もいません。",
  "user-response.channel_empty_now": "実行時点で対象VCには誰もいませんでした。",
  "user-response.same_channel": "移動元と移動先が同じです。",

  // ── action-log: 共通アクションログ Embed（/vc disconnect・/vc move・/afk） ──
  "action-log.title.disconnect": "切断",
  "action-log.title.move": "移動",
  "action-log.title.afk": "AFK移動",
  "action-log.field.invoker": "実行者",
  "action-log.field.target": "対象",
  "action-log.field.destination": "移動先",
  "action-log.field.reason": "理由",
  "action-log.field.failures": "失敗",
  "action-log.reason_none": "指定なし",
  "action-log.failures_more": "ほか {{count}} 件",
  "action-log.desc.disconnect_individual":
    "<@{{targetId}}> をVCから切断しました。",
  "action-log.desc.disconnect_bulk":
    "<#{{channelId}}> の参加者全員をVCから切断しました。",
  "action-log.desc.move_individual":
    "<@{{targetId}}> を <#{{destinationId}}> に移動しました。",
  "action-log.desc.move_bulk":
    "<#{{channelId}}> の参加者全員を <#{{destinationId}}> に移動しました。",
  "action-log.desc.afk_individual":
    "<@{{targetId}}> を <#{{destinationId}}> に移動しました。",
  "action-log.desc.afk_bulk":
    "<#{{channelId}}> の参加者全員を <#{{destinationId}}> に移動しました。",
  "action-log.audit.disconnect": "Botコマンド /vc disconnect による切断",
  "action-log.audit.move": "Botコマンド /vc move による移動",
  "action-log.audit.afk": "Botコマンド /afk による移動",

  // ── bulk-confirm: 一括操作の確認ダイアログ ──
  "bulk-confirm.title": "確認",
  "bulk-confirm.description":
    "<#{{channelId}}> の参加者全員に対して{{action}}を実行します。よろしいですか？",
  "bulk-confirm.action.disconnect": "切断",
  "bulk-confirm.action.move": "移動",
  "bulk-confirm.action.afk": "AFKチャンネルへの移動",
  "bulk-confirm.field.target": "対象",
  "bulk-confirm.field.destination": "移動先",

  // ── UIラベル ─────────────────────────────────
  "ui.button.bulk_execute": "実行",

  // ── ログ ─────────────────────────────────────
  "log.disconnected":
    "メンバーをVCから切断 GuildId: {{guildId}} TargetId: {{targetId}}",
  "log.move_executed":
    "メンバーをVCに移動 GuildId: {{guildId}} TargetId: {{targetId}} ChannelId: {{channelId}}",
  "log.bulk_executed":
    "VC一括操作を実行 GuildId: {{guildId}} Action: {{action}} ChannelId: {{channelId}} Count: {{count}} Failures: {{failures}}",
} as const;

export type VcTranslations = typeof vc;
