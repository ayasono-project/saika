// src/shared/locale/locales/en/common.ts
// Common translations (English)

export const common = {
  // State labels
  // Shared in embed titles and field values
  success: "Success",
  info: "Information",
  warning: "Warning",
  error: "Error",
  // Feature configuration state (ON/OFF)
  enabled: "Enabled",
  disabled: "Disabled",
  // Placeholder for unset / empty values
  none: "None",

  // Embed titles (noun phrases)
  // Standard titles used in status notification Embed options.title
  title_permission_denied: "Insufficient Permissions",
  title_bot_permission_denied: "Bot Permissions Required",
  title_invalid_input: "Invalid Input",
  title_option_conflict: "Option Conflict",
  title_filter_required: "Filter Required",
  title_channel_invalid: "Channel Error",
  title_channel_not_found: "Channel Not Found",
  title_not_in_vc: "Not in Voice Channel",
  title_config_required: "Configuration Required",
  title_resource_not_found: "Resource Not Found",
  title_limit_exceeded: "Limit Exceeded",
  title_role_limit_exceeded: "Role Limit Exceeded",
  title_timeout: "Timeout",
  title_already_running: "Already Running",
  title_already_registered: "Already Registered",
  title_not_configured: "Not Configured",
  title_server_only: "Server Only",
  title_operation_error: "Operation Failed",
  title_scan_error: "Scan Error",
  title_delete_error: "Delete Error",
  title_move_failed: "Move Failed",
  title_rate_limited: "Rate Limited",
  title_config_error: "Configuration Error",

  // Cross-feature errors (absorbed from errors.ts)
  // Database errors
  "database.get_config_failed": "Failed to get config",
  "database.save_config_failed": "Failed to save config",
  "database.update_config_failed": "Failed to update config",
  "database.delete_config_failed": "Failed to delete config",
  "database.check_existence_failed": "Failed to check existence",
  "database.unknown_error": "unknown error",

  // Validation errors
  "validation.error_title": "Invalid Input",
  "validation.guild_only": "This command can only be used within a server",
  "validation.invalid_subcommand": "Invalid subcommand",

  // Permission errors
  "permission.manage_guild_required":
    "Manage Server (MANAGE_GUILD) permission is required to execute this command.",

  // Interaction errors
  "interaction.timeout": "Operation timed out.",

  // General errors
  "general.error_title": "Error",
  "general.unexpected_production":
    "An unexpected error occurred. Please try again later.",
  "general.unexpected_with_message": "Error: {{message}}",

  // Cooldown (absorbed from commands.ts)
  "cooldown.wait": "⏱️ You can use this command in **{{seconds}} seconds**",

  // Pagination (cross-feature UI components)
  "ui.button.page_first": "First",
  "ui.button.page_prev": "Prev",
  "ui.button.page_next": "Next",
  "ui.button.page_last": "Last",
  "ui.button.page_jump": "Page {{page}}/{{total}}",
  "ui.modal.page_jump_title": "Jump to Page",
  "ui.modal.page_jump_label": "Page number",
  "ui.modal.page_jump_placeholder": "Integer from 1 to {{total}}",

  // Bot permission error
  "bot_permission.missing":
    "The bot lacks the required permissions to perform this action.\nPlease ask a server administrator to check the following:\n・The bot has Administrator permission\n・The bot's permissions are not restricted in the target channel",
  "bot_permission.hint_manage_channels":
    "This action requires the bot to have **Manage Channels** permission.",
  "bot_permission.hint_move_members":
    "This action requires the bot to have **Move Members** permission.",
  "bot_permission.hint_send_messages":
    "This action requires the bot to have **Send Messages** permission.",
  "bot_permission.hint_manage_messages":
    "This action requires the bot to have **Manage Messages** permission.",
  "bot_permission.hint_manage_roles":
    "This action requires the bot to have **Manage Roles** permission.",

  // Common cancel
  cancelled: "Cancelled.",

  // Cross-feature embed titles and fields
  "embed.title.success": "Settings Updated",
  "embed.field.name.status": "Status",
  "embed.field.value.not_configured": "Not configured",

  // Cross-feature UI button labels
  "ui.button.cancel": "Cancel",
  "ui.button.reset_confirm": "Reset",
  "ui.button.reset_cancel": "Cancel",
} as const;

export type CommonTranslations = typeof common;
