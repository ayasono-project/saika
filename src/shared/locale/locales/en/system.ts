// Cross-feature system message translations (English)

export const system = {
  // Log prefixes
  // Feature/event names auto-prepended by logPrefixed() helper
  "log_prefix.bot": "Bot",
  "log_prefix.bump_reminder": "BumpReminder",
  "log_prefix.sticky_message": "StickyMessage",
  "log_prefix.member_log": "MemberLog",
  "log_prefix.unverified_kick": "UnverifiedKick",
  "log_prefix.vac": "VAC",
  "log_prefix.vc_auto_recruit": "VcAutoRecruit",
  "log_prefix.msg_del": "MsgDel",
  "log_prefix.afk": "AFK",
  "log_prefix.database": "DB",
  "log_prefix.cooldown": "Cooldown",
  "log_prefix.scheduler": "Scheduler",
  "log_prefix.web": "Web",
  "log_prefix.interaction_create": "interactionCreate",
  "log_prefix.guild_create": "guildCreate",
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

  // guildCreate (bot joined a guild)
  "guild_create.joined":
    "guild join detected GuildId: {{guildId}} GuildName: {{guildName}}",

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
  "bot.commands.global_cleared":
    "Cleared global commands because this is a development environment",
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

  // Database operation logs (GuildSettings generic only)
  "database.prisma_not_available": "Prisma client is not available",

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
  "web.api_error": "API Error:",
  "web.internal_server_error": "Internal Server Error",
  "web.auth_session_required": "Login is required.",
  "web.guild_id_required": "Guild ID is required.",
  "web.channel_id_required": "Channel ID is required.",
  "web.category_id_required": "Category ID is required.",
  "web.sticky_not_found": "Sticky message not found.",
  "web.reaction_role_not_found": "Reaction role panel not found.",
  "web.ticket_panel_not_found": "Ticket panel not found.",
  "web.ticket_category_exists":
    "A ticket panel already exists for this category.",
  "web.guild_permission_denied":
    "You do not have management permissions for this server.",
  "web.not_found_route": "Endpoint not found.",
  "web.not_ready": "Service is not ready.",
  "web.bot_not_in_guild": "The bot is not a member of this server.",

  // Discord error notification
  "discord.error_notification_title": "🚨 {{appName}} Error Notification",

  // Error utilities
  "error.base_error_log": "[{{errorName}}] {{message}}",
  "error.unhandled_error_log": "[UnhandledError] {{message}}",
} as const;

export type SystemTranslations = typeof system;
