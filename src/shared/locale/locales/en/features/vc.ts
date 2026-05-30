// src/shared/locale/locales/en/features/vc.ts
// VC command (/vc rename, /vc limit, /vc disconnect, /vc move) translations (English)
// action-log.* / bulk-confirm.* are shared action-log / confirmation-dialog resources used by /afk too

export const vc = {
  // ── Command definitions ──────────────────────
  "vc.description": "Change VC settings",
  "vc.rename.description": "Rename your current VC",
  "vc.rename.name.description": "New VC name",
  "vc.limit.description": "Change user limit of your current VC",
  "vc.limit.limit.description": "User limit (0=unlimited, max 99)",
  "vc.disconnect.description": "Disconnect a member, or everyone in a VC",
  "vc.disconnect.target-member.description": "Member to disconnect",
  "vc.disconnect.target-channel.description":
    "VC whose members will all be disconnected",
  "vc.disconnect.reason.description": "Reason recorded in the audit log",
  "vc.move.description": "Move a member, or everyone in a VC, to another VC",
  "vc.move.target-member.description": "Member to move",
  "vc.move.target-channel.description": "VC whose members will all be moved",
  "vc.move.to.description": "Destination VC",
  "vc.move.reason.description": "Reason recorded in the audit log",

  // ── User responses ───────────────────────────
  "user-response.renamed": "VC name has been changed to {{name}}",
  "user-response.limit_changed": "User limit has been set to {{limit}}",
  "user-response.unlimited": "unlimited",
  "user-response.not_in_any_vc":
    "You must be in a voice channel to use this command.",
  "user-response.not_managed_channel":
    "This voice channel is not managed by the Bot.",
  "user-response.limit_out_of_range": "User limit must be between 0 and 99.",
  "user-response.target_required":
    "Please specify a target member or voice channel.",
  "user-response.target_conflict":
    "You cannot specify both a member and a voice channel.",
  "user-response.target_not_voice": "Please specify a voice channel.",
  "user-response.member_not_found": "The target member was not found.",
  "user-response.target_not_in_voice":
    "The specified member is not in a voice channel.",
  "user-response.channel_empty": "There is no one in the target VC.",
  "user-response.channel_empty_now":
    "The target VC was empty at execution time.",
  "user-response.same_channel": "The source and destination are the same.",

  // ── action-log: shared action-log Embed (/vc disconnect, /vc move, /afk) ──
  "action-log.title.disconnect": "Disconnect",
  "action-log.title.move": "Move",
  "action-log.title.afk": "AFK Move",
  "action-log.field.invoker": "Invoker",
  "action-log.field.target": "Target",
  "action-log.field.destination": "Destination",
  "action-log.field.reason": "Reason",
  "action-log.field.failures": "Failures",
  "action-log.reason_none": "None",
  "action-log.failures_more": "and {{count}} more",
  "action-log.desc.disconnect_individual":
    "Disconnected <@{{targetId}}> from the VC.",
  "action-log.desc.disconnect_bulk":
    "Disconnected all members of <#{{channelId}}> from the VC.",
  "action-log.desc.move_individual":
    "Moved <@{{targetId}}> to <#{{destinationId}}>.",
  "action-log.desc.move_bulk":
    "Moved all members of <#{{channelId}}> to <#{{destinationId}}>.",
  "action-log.desc.afk_individual":
    "Moved <@{{targetId}}> to <#{{destinationId}}>.",
  "action-log.desc.afk_bulk":
    "Moved all members of <#{{channelId}}> to <#{{destinationId}}>.",
  "action-log.audit.disconnect": "Disconnected via /vc disconnect command",
  "action-log.audit.move": "Moved via /vc move command",
  "action-log.audit.afk": "Moved via /afk command",

  // ── bulk-confirm: confirmation dialog for bulk actions ──
  "bulk-confirm.title": "Confirmation",
  "bulk-confirm.description":
    "Execute {{action}} on all members of <#{{channelId}}>. Are you sure?",
  "bulk-confirm.action.disconnect": "disconnect",
  "bulk-confirm.action.move": "move",
  "bulk-confirm.action.afk": "move to the AFK channel",
  "bulk-confirm.field.target": "Target",
  "bulk-confirm.field.destination": "Destination",

  // ── UI labels ────────────────────────────────
  "ui.button.bulk_execute": "Execute",

  // ── Logs ─────────────────────────────────────
  "log.disconnected":
    "disconnected member from VC GuildId: {{guildId}} TargetId: {{targetId}}",
  "log.move_executed":
    "moved member to VC GuildId: {{guildId}} TargetId: {{targetId}} ChannelId: {{channelId}}",
  "log.bulk_executed":
    "executed bulk VC action GuildId: {{guildId}} Action: {{action}} ChannelId: {{channelId}} Count: {{count}} Failures: {{failures}}",
} as const;

export type VcTranslations = typeof vc;
