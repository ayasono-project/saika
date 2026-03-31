// src/shared/locale/locales/en/features/vcRecruit.ts
// VC Recruit feature translations (English)

export const vcRecruit = {
  // ── Command definitions ──────────────────────
  "vc-recruit-config.description":
    "VC recruit feature settings (requires Manage Server)",
  "vc-recruit-config.setup.description": "Set up VC recruit channels",
  "vc-recruit-config.setup.category.description":
    "Target category (TOP or category name; defaults to this channel's category)",
  "vc-recruit-config.setup.category.top": "TOP (No category)",
  "vc-recruit-config.setup.thread-archive.description":
    "Auto-archive duration for recruit threads (1h/24h/3d/1w; default: 24h)",
  "vc-recruit-config.teardown.description":
    "Remove VC recruit channels (via selection UI)",
  "vc-recruit-config.add-role.description":
    "Add a role to the mention candidates",
  "vc-recruit-config.remove-role.description":
    "Remove a role from the mention candidates",
  "vc-recruit-config.view.description": "Show current VC recruit settings",

  // ── UI labels ──────────────────────────────────
  "ui.button.create_recruit": "Create VC Recruit",
  "ui.modal.create_title": "Create VC Recruit (2/2)",
  "ui.modal.content_label": "Recruit message",
  "ui.modal.content_placeholder":
    "Enter your recruit message (max 200 characters)",
  "ui.modal.vc_name_label": "New VC name (optional)",
  "ui.modal.vc_name_placeholder":
    'Used only if "Create new VC" is selected (blank: DisplayName\'s Room)',
  "ui.select.mention_placeholder": "Mention (none)",
  "ui.select.vc_placeholder": "Select VC",
  "ui.button.open_modal": "📝 Next: Enter details",
  "ui.select.no_mention": "None (no mention)",
  "ui.select.new_vc": "🆕 Create new VC",
  "ui.button.join_vc": "🎤 Join VC",
  "ui.button.rename_vc": "✏️ Rename VC",
  "ui.button.end_vc": "🔇 End Recruitment",
  "ui.button.delete_post": "🗑️ Delete post",
  "ui.button.vc_ended": "🔇 Recruitment Ended",
  "ui.button.end_confirm": "End",
  "ui.button.delete_confirm": "Delete",
  "ui.modal.rename_title": "Rename VC",
  "ui.modal.rename_vc_name_label": "VC Name",
  "ui.modal.rename_vc_name_placeholder":
    "Enter a new VC name (max 100 characters)",
  "ui.select.teardown_placeholder": "Select categories to teardown",
  "ui.select.teardown_top": "TOP (No category)",
  "ui.select.teardown_unknown_category": "Unknown category (ID: {{id}})",
  "ui.button.teardown_confirm": "🗑️ Remove",
  "ui.button.teardown_cancel": "Cancel",
  "ui.button.teardown_redo": "Reselect",
  "ui.select.add_role_placeholder": "Select roles to add (multiple)",
  "ui.button.add_role_confirm": "Add",
  "ui.button.add_role_cancel": "Cancel",
  "ui.select.remove_role_placeholder": "Select roles to remove (multiple)",
  "ui.button.remove_role_confirm": "Remove",
  "ui.button.remove_role_cancel": "Cancel",

  // ── Embed ─────────────────────────────────────
  "embed.title.config_view": "VC Recruit Settings",
  "embed.field.name.setups": "Configured categories",
  "embed.field.name.roles": "Mention candidate roles",
  "embed.field.value.no_setups": "Not configured",
  "embed.field.value.no_roles": "None",
  "embed.field.value.top": "TOP",
  "embed.field.value.setup_item":
    "• {{category}}\n　Panel: {{panel}}\n　Board: {{post}}",
  "embed.title.add_role_success": "Roles Registered",
  "embed.field.name.add_role_success": "Registered Roles",
  "embed.title.add_role_limit": "Role Limit Exceeded",
  "embed.description.add_role_limit":
    "The mention role limit ({{limit}}) has been reached. The following roles could not be registered.",
  "embed.field.name.add_role_limit": "Roles Not Registered",
  "embed.title.remove_role_success": "Roles Removed",
  "embed.field.name.remove_role_success": "Removed Roles",
  "embed.title.panel": "📝 VC Recruit",
  "embed.description.panel":
    "You can create a VC recruitment post using the button below.\n\n**How to create**\n1. Press the button below to start\n2. Select the roles to mention and the VC to join\n3. Enter the details and submit — your post will appear in the recruitment list channel",
  "embed.title.recruit_post": "📢 VC Recruit",
  "embed.title.recruit_post_ended": "📢 VC Recruit [Ended]",
  "embed.field.name.content": "Recruit message",
  "embed.field.name.vc": "VC",
  "embed.field.name.recruiter": "Recruiter",
  "embed.field.value.thread_name": "{{recruiter}}'s recruit",
  "embed.title.select_step": "📋 Step 1/2",
  "embed.description.select_step": "Select mention and VC",
  "embed.title.teardown_confirm": "Remove VC recruit channels?",
  "embed.field.name.teardown_categories": "Target categories",
  "embed.description.teardown_warning":
    "The recruit panel and recruit list channels for the selected categories will be deleted. This action cannot be undone.",
  "embed.field.value.channel_name_panel": "vc-create",
  "embed.field.value.channel_name_post": "vc-recruit-list",
  "embed.title.add_role_select": "Select the roles to add",
  "embed.title.remove_role_select": "Select the roles to remove",

  // ── User responses ─────────────────────────────
  "user-response.setup_success": "VC recruit channels created",
  "user-response.setup_panel_channel": "Recruit panel: {{channel}}",
  "user-response.setup_post_channel": "Recruit board: {{channel}}",
  "user-response.teardown_success": "VC recruit channels removed",
  "user-response.teardown_category_item": "🗑️ {{category}}",
  "user-response.teardown_partial_error":
    "The following categories had errors:",
  "user-response.teardown_cancelled": "Cancelled.",
  "user-response.add_role_success": "Added {{role}} to mention candidates",
  "user-response.remove_role_success":
    "Removed {{role}} from mention candidates",
  "user-response.post_success": "Recruitment posted successfully",
  "user-response.post_success_link": "View post",
  "user-response.end_vc_created":
    "End recruitment?\nThe VC will be deleted and the recruit post will be marked as ended. The post and thread will remain.",
  "user-response.end_vc_existing":
    "End recruitment?\nThe recruit post will be marked as ended. The VC will not be deleted.",
  "user-response.end_vc_success": "Recruitment has been ended",
  "user-response.cancelled": "Cancelled.",
  "user-response.delete_created":
    "Delete this recruitment?\nThe post, thread, and created VC will all be deleted.",
  "user-response.delete_existing":
    "Delete this recruitment?\nThe post and thread will be deleted. The VC will not be deleted.",
  "user-response.delete_success": "Recruitment has been deleted",
  "user-response.rename_success": "VC name has been changed",
  "user-response.already_setup":
    "A VC recruit setup already exists for this category.",
  "user-response.not_setup":
    "No VC recruit channels are configured for this category.",
  "user-response.role_already_added": "{{role}} is already added.",
  "user-response.role_not_found":
    "{{role}} is not registered as a mention candidate.",
  "user-response.role_limit_exceeded":
    "Mention candidate roles are limited to 25.",
  "user-response.vc_deleted": "The selected VC has already been deleted.",
  "user-response.category_full":
    "The category has reached the channel limit (50), so the VC cannot be created.",
  "user-response.panel_channel_not_found":
    "VC recruit panel channel not found. It may have been deleted.",
  "user-response.voice_state_update_failed":
    "[VcRecruit] Failed to process voiceStateUpdate",
  "user-response.no_permission":
    "Only the recruiter or a user with Manage Server permission can perform this action.",
  "user-response.vc_already_deleted": "The target VC has already been deleted.",
  "user-response.no_roles_registered":
    "No mention candidate roles are registered. Please add roles first with add-role.",
  "user-response.add_role_no_selection": "Please select the roles to add.",
  "user-response.remove_role_no_selection":
    "Please select the roles to remove.",

  // ── Logs ─────────────────────────────────────
  "log.voice_state_update_failed": "Failed to process voiceStateUpdate",
  "log.empty_vc_deleted":
    "Deleted empty VC GuildId: {{guildId}} ChannelId: {{channelId}} ChannelName: {{channelName}}",
  "log.voice_state_update_error": "voiceStateUpdate processing error",
  "log.panel_channel_delete_detected":
    "Panel channel deletion detected, deleting post channel and setup GuildId: {{guildId}} PanelChannelId: {{panelChannelId}}",
  "log.post_channel_delete_failed":
    "Failed to delete post channel GuildId: {{guildId}} PostChannelId: {{postChannelId}}",
  "log.post_channel_delete_detected":
    "Post channel deletion detected, deleting panel channel and setup GuildId: {{guildId}} PostChannelId: {{postChannelId}}",
  "log.panel_channel_cleanup_failed":
    "Failed to delete panel channel GuildId: {{guildId}} PanelChannelId: {{panelChannelId}}",
  "log.created_vc_manual_delete_detected":
    "Created VC manual deletion detected, updating DB and marking post button as ended GuildId: {{guildId}} VcId: {{vcId}}",
  "log.channel_created":
    "new VC created GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.channel_deleted":
    "VC deleted GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.recruit_posted":
    "recruit message posted GuildId: {{guildId}} UserId: {{userId}}",
  "log.setup_created":
    "setup created GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.setup_removed":
    "setup removed GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.panel_delete_detected":
    "panel message deletion detected, resending panel GuildId: {{guildId}} PanelChannelId: {{panelChannelId}} MessageId: {{messageId}}",
  "log.panel_resent":
    "panel message resent GuildId: {{guildId}} PanelChannelId: {{panelChannelId}} NewMessageId: {{newMessageId}}",
  "log.database_setup_add_failed": "Failed to add setup",
  "log.database_panel_message_update_failed":
    "Failed to update panel message ID",
  "log.database_setup_remove_failed": "Failed to remove setup",
  "log.database_vc_add_failed": "Failed to add created voice channel",
  "log.database_vc_remove_failed": "Failed to remove created voice channel",
  "log.database_role_add_failed": "Failed to add mention role",
  "log.database_role_remove_failed": "Failed to remove mention role",
} as const;

export type VcRecruitTranslations = typeof vcRecruit;
