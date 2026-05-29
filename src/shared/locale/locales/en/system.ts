// src/shared/locale/locales/en/system.ts
// Cross-feature system message translations (English)

export const system = {
  // Log prefixes
  // Feature/event names auto-prepended by logPrefixed() helper
  "log_prefix.bot": "Bot",
  "log_prefix.bump_reminder": "BumpReminder",
  "log_prefix.sticky_message": "StickyMessage",
  "log_prefix.member_log": "MemberLog",
  "log_prefix.vac": "VAC",
  "log_prefix.vc_recruit": "VcRecruit",
  "log_prefix.msg_del": "MsgDel",
  "log_prefix.afk": "AFK",
  "log_prefix.database": "DB",
  "log_prefix.cooldown": "Cooldown",
  "log_prefix.scheduler": "Scheduler",
  "log_prefix.web": "Web",
  "log_prefix.json": "JSON",
  "log_prefix.interaction_create": "interactionCreate",
  "log_prefix.guild_member_add": "guildMemberAdd",
  "log_prefix.guild_member_remove": "guildMemberRemove",
  "log_prefix.message_create": "messageCreate",
  "log_prefix.message_delete": "messageDelete",
  "log_prefix.voice_state_update": "voiceStateUpdate",
  "log_prefix.channel_delete": "channelDelete",
  "log_prefix.guild_delete": "guildDelete",
  "log_prefix.ready": "ready",
  "log_prefix.ticket": "Ticket",
  "log_prefix.reaction_role": "ReactionRole",
  "log_prefix.guild_config": "GuildSettings",
  "log_prefix.error_channel": "ErrorChannelNotifier",

  // Error channel notification internal logs
  "error_channel.send_error_failed":
    "Failed to send error notification GuildId: {{guildId}}",
  "error_channel.send_warn_failed":
    "Failed to send warn notification GuildId: {{guildId}}",

  // guildDelete (cleanup on bot removal)
  "guild_delete.start":
    "guild removal detected, deleting config data GuildId: {{guildId}} GuildName: {{guildName}}",
  "guild_delete.complete": "guild config data deleted GuildId: {{guildId}}",
  "guild_delete.failed":
    "failed to delete guild config data GuildId: {{guildId}}",

  // Bot startup & shutdown
  "bot.starting": "Starting Discord Bot...",
  "bot.commands.registering": "Registering {{count}} commands...",
  "bot.commands.registered": "Commands registered",
  "bot.commands.command_registered": "  ✓ /{{name}}",
  "bot.events.registering": "Registering {{count}} events...",
  "bot.events.registered": "Events registered",
  "bot.startup.error": "Error during bot startup:",
  "bot.startup.failed": "Bot startup failed:",
  "bot.client.initialized": "Discord Bot client initialized",
  "bot.client.shutting_down": "Shutting down bot client...",
  "bot.client.shutdown_complete": "Bot client shut down successfully",
  "bot.presence_activity": "growin' up~ | {{count}} servers",

  // Error handling
  "error.reply_failed": "Failed to send error message",
  "error.missing_permissions":
    "Bot missing permissions URL: {{url}} Method: {{method}}",
  "error.unhandled_rejection": "Unhandled Promise rejection:",
  "error.uncaught_exception": "Uncaught exception:",
  "error.unhandled_rejection_log": "Unhandled Promise Rejection:",
  "error.uncaught_exception_log": "Uncaught Exception:",
  "error.node_warning": "Node Warning:",
  "error.global_handlers_already_registered":
    "Global error handlers already registered, skipping.",
  "error.shutdown_handlers_already_registered":
    "Graceful shutdown handlers already registered, skipping.",

  // Locale
  "locale.manager_initialized": "LocaleManager initialized with i18next",
  "locale.translation_failed": "Translation failed for key: {{key}}",

  // Cooldown manager
  "cooldown.cleared_all": "All cooldowns cleared",
  "cooldown.destroyed": "CooldownManager destroyed",
  "cooldown.reset": "Reset CommandName: {{commandName}} UserId: {{userId}}",
  "cooldown.cleared_for_command":
    "Cleared all for command CommandName: {{commandName}}",
  "cooldown.cleanup": "Removed {{count}} expired cooldowns",

  // Scheduler (generic job lifecycle)
  "scheduler.stopping": "Stopping all scheduled jobs...",
  "scheduler.job_exists":
    "Job already exists, removing old job JobId: {{jobId}}",
  "scheduler.executing_job": "Executing job JobId: {{jobId}}",
  "scheduler.job_completed": "Job completed JobId: {{jobId}}",
  "scheduler.job_error": "Job error JobId: {{jobId}}",
  "scheduler.schedule_failed": "Failed to schedule job JobId: {{jobId}}",
  "scheduler.job_removed": "Job removed JobId: {{jobId}}",
  "scheduler.job_stopped": "Job stopped JobId: {{jobId}}",
  "scheduler.job_scheduled": "Job scheduled JobId: {{jobId}}",

  // Shutdown
  "shutdown.signal_received":
    "{{signal}} received, shutting down gracefully...",
  "shutdown.already_in_progress":
    "{{signal}} received, but shutdown is already in progress.",
  "shutdown.cleanup_complete": "Cleanup completed",
  "shutdown.cleanup_failed": "Error during cleanup:",
  "shutdown.gracefully": "Shutting down gracefully...",
  "shutdown.sigterm": "Received SIGTERM, shutting down...",

  // Database operation logs (GuildSettings generic only)
  "database.prisma_not_available": "Prisma client is not available",
  "database.get_config_log": "Failed to get config GuildId: {{guildId}}",
  "database.save_config_log": "Failed to save config GuildId: {{guildId}}",
  "database.saved_config": "Config saved GuildId: {{guildId}}",
  "database.update_config_log": "Failed to update config GuildId: {{guildId}}",
  "database.updated_config": "Config updated GuildId: {{guildId}}",
  "database.delete_config_log": "Failed to delete config GuildId: {{guildId}}",
  "database.deleted_config": "Config deleted GuildId: {{guildId}}",
  "database.check_existence_log":
    "Failed to check existence GuildId: {{guildId}}",

  // Bot startup event logs
  "ready.bot_ready": "✅ Bot is ready! Logged in as {{tag}}",
  "ready.servers": "📊 Servers: {{count}}",
  "ready.users": "👥 Users: {{count}}",
  "ready.commands": "💬 Commands: {{count}}",
  "ready.event_registered": "  ✓ {{name}}",
  "ready.startup_init_failed": "Error during startup initialization",

  // Interaction event logs
  "interaction.unknown_command": "Unknown command CommandName: {{commandName}}",
  "interaction.command_executed":
    "Command executed CommandName: {{commandName}} UserId: {{userId}}",
  "interaction.command_error": "Command error CommandName: {{commandName}}",
  "interaction.autocomplete_error":
    "Autocomplete error CommandName: {{commandName}}",
  "interaction.unknown_modal": "Unknown modal CustomId: {{customId}}",
  "interaction.modal_submitted":
    "Modal submitted CustomId: {{customId}} UserId: {{userId}}",
  "interaction.modal_error": "Modal error CustomId: {{customId}}",
  "interaction.button_error": "Button error CustomId: {{customId}}",
  "interaction.select_menu_error": "Select menu error CustomId: {{customId}}",

  // Web server
  "web.server_started": "Started URL: {{url}}",
  "web.startup_error": "Startup error:",
  "web.unhandled_rejection": "Unhandled Promise rejection:",
  "web.uncaught_exception": "Uncaught exception:",
  "web.startup_failed": "Startup failed:",
  "web.api_error": "API Error:",
  "web.internal_server_error": "Internal Server Error",
  "web.auth_unauthorized":
    "[Auth] Unauthorized request Method: {{method}} URL: {{url}}",
  "web.auth_invalid_token":
    "[Auth] Invalid token Method: {{method}} URL: {{url}}",
  "web.auth_unauthorized_error": "Unauthorized",
  "web.auth_forbidden_error": "Forbidden",
  "web.auth_header_required":
    "Authorization: Bearer <api-key> header is required",
  "web.auth_invalid_token_message": "Invalid token",
  "web.auth_session_required": "Login is required.",
  "web.auth_session_expired": "Session expired. Please log in again.",
  "web.auth_no_session_cookie":
    "[Auth] No session cookie Method: {{method}} URL: {{url}}",
  "web.oauth_denied": "[OAuth] Authorization denied Error: {{error}}",
  "web.oauth_state_mismatch": "[OAuth] State parameter mismatch",
  "web.oauth_login_success":
    "[OAuth] Login success UserId: {{userId}} Username: {{username}}",
  "web.oauth_callback_error": "[OAuth] Callback processing error:",
  "web.discord_user_fetch_error": "[OAuth] Discord user fetch error:",
  "web.discord_api_error": "Failed to communicate with Discord.",
  "web.session_refresh_failed":
    "[Session] Token refresh failed SessionId: {{sessionId}} UserId: {{userId}}",
  "web.session_cleanup":
    "[Session] Cleaned up expired sessions Count: {{count}}",
  "web.session_cleanup_error": "[Session] Cleanup error:",
  "web.guild_id_required": "Guild ID is required.",
  "web.guild_not_member": "You are not a member of this server.",
  "web.guild_permission_denied":
    "You do not have management permissions for this server.",

  // Discord error notification
  "discord.error_notification_title": "🚨 {{appName}} Error Notification",

  // Error utilities
  "error.base_error_log": "[{{errorName}}] {{message}}",
  "error.unhandled_error_log": "[UnhandledError] {{message}}",
} as const;

export type SystemTranslations = typeof system;
