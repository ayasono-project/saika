// src/shared/locale/locales/en/features/reactionRole.ts
// Reaction role feature English translations

export const reactionRole = {
  // ── Command definitions
  "reaction-role-config.description":
    "Configure reaction role feature (requires Manage Server)",
  "reaction-role-config.setup.description": "Set up reaction role panel",
  "reaction-role-config.teardown.description": "Remove reaction role panel",
  "reaction-role-config.view.description": "Show current settings",
  "reaction-role-config.edit-panel.description":
    "Edit panel title, description, and color",
  "reaction-role-config.add-button.description": "Add a button to panel",
  "reaction-role-config.remove-button.description":
    "Remove a button from panel",
  "reaction-role-config.edit-button.description": "Edit a button",

  // ── User responses
  "user-response.setup_success": "Reaction role panel has been set up.",
  "user-response.teardown_success": "{{count}} reaction role panel(s) removed.",
  "user-response.teardown_cancelled": "Cancelled.",
  "user-response.edit_panel_success": "Panel has been updated.",
  "user-response.add_button_success": "{{count}} button(s) added.",
  "user-response.remove_button_success": "{{count}} button(s) removed.",
  "user-response.remove_button_cancelled": "Cancelled.",
  "user-response.edit_button_success": "Button has been updated.",
  "user-response.role_added": "{{roles}} has been granted.",
  "user-response.role_removed": "{{roles}} has been removed.",
  "user-response.role_switched": "Switched to {{roles}}.",
  "user-response.role_already_granted": "You already have this role.",
  "user-response.role_already_selected": "This role is already selected.",
  "user-response.role_too_high":
    "The bot cannot manage this role. Please contact a server administrator.",
  "user-response.no_panels": "No reaction role configurations found.",
  "user-response.button_limit_reached": "Button limit (25) has been reached.",
  "user-response.cannot_remove_all_buttons": "Cannot remove all buttons.",
  "user-response.invalid_color":
    "Invalid color format. Please use #RRGGBB format.",
  "user-response.invalid_emoji":
    "Invalid emoji format. Please use a Unicode emoji or Discord custom emoji (<:name:id>).",
  "user-response.invalid_style":
    "Invalid style. Please use primary, secondary, success, or danger.",
  "user-response.session_expired":
    "Session has expired. Please run the command again.",
  "user-response.panels_cleaned_up":
    "{{count}} panel(s) cleaned up because the message was deleted.",
  "user-response.and_more": "and {{count}} more",
  "user-response.panel_message_not_found":
    "Panel message not found. The panel may have been deleted.",

  // ── Embed
  "embed.title.panel_default": "Role Selection",
  "embed.description.panel_default": "Press a button to get or remove a role.",
  "embed.title.teardown_confirm": "Panel Removal",
  "embed.description.teardown_confirm":
    "{{count}} panel(s) will be removed. This action cannot be undone.",
  "embed.field.name.teardown_targets": "Targets ({{count}})",
  "embed.title.remove_button_confirm": "Button Removal",
  "embed.description.remove_button_confirm":
    "{{count}} button(s) will be removed. This action cannot be undone.",
  "embed.field.name.remove_targets": "Targets",
  "embed.title.config_view": "Reaction Role Settings",
  "embed.field.name.panel_title": "Panel Title",
  "embed.field.name.channel": "Channel",
  "embed.field.name.mode": "Mode",
  "embed.field.name.color": "Color",
  "embed.field.name.button_count": "Buttons",
  "embed.field.name.button_list": "Button List",
  "embed.field.value.mode_toggle": "Toggle",
  "embed.field.value.mode_one_action": "One Action",
  "embed.field.value.mode_exclusive": "Exclusive",

  // ── UI labels
  "ui.button.setup_add": "Add Another",
  "ui.button.setup_done": "Done",
  "ui.button.teardown_confirm": "Remove",
  "ui.button.teardown_cancel": "Cancel",
  "ui.select.teardown_placeholder": "Select panels to remove",
  "ui.button.remove_button_confirm": "Delete",
  "ui.button.remove_button_cancel": "Cancel",
  "ui.select.panel_placeholder": "Select a panel",
  "ui.select.button_placeholder": "Select a button",
  "ui.select.mode_placeholder": "Select a mode",
  "ui.select.mode_toggle": "Toggle",
  "ui.select.mode_toggle_description": "Toggle role on/off with each press",
  "ui.select.mode_one_action": "One Action",
  "ui.select.mode_one_action_description": "Grant role (cannot be revoked)",
  "ui.select.mode_exclusive": "Exclusive",
  "ui.select.mode_exclusive_description": "Only one selection allowed in group",
  "ui.select.roles_placeholder": "Select roles",
  "ui.modal.setup_title": "Panel Settings",
  "ui.modal.setup_field_title": "Panel Title",
  "ui.modal.setup_field_description": "Panel Description",
  "ui.modal.setup_field_color": "Color (e.g., #00A8F3)",
  "ui.modal.button_settings_title": "Button Settings",
  "ui.modal.button_field_label": "Button Label",
  "ui.modal.button_field_emoji": "Emoji",
  "ui.modal.button_field_style":
    "Style (primary / secondary / success / danger)",
  "ui.modal.edit_panel_title": "Edit Panel",

  // ── Logs
  "log.setup_started": "reaction role setup started GuildId: {{guildId}}",
  "log.setup":
    "reaction role panel set up GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.teardown":
    "reaction role panel(s) removed GuildId: {{guildId}} PanelIds: {{panelIds}}",
  "log.role_granted":
    "role granted GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}}",
  "log.role_removed":
    "role removed GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}}",
  "log.button_added":
    "button added GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}}",
  "log.button_removed":
    "button removed GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}}",
  "log.button_edited":
    "button edited GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}}",
  "log.database_panel_saved":
    "panel config saved GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.database_panel_save_failed":
    "failed to save panel config GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.database_panel_find_failed":
    "failed to find panel config GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.database_panel_delete_failed":
    "failed to delete panel config GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.panel_message_deleted":
    "panel message deleted GuildId: {{guildId}} PanelId: {{panelId}}",
  "log.panel_channel_deleted":
    "panel channel deleted GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.panel_cleanup_failed": "panel cleanup failed GuildId: {{guildId}}",
} as const;
