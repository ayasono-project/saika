// Ticket channel feature English translations

export const ticket = {
  // ── Command definitions
  "ticket.description": "Manage tickets",
  "ticket.close.description": "Close the ticket",
  "ticket.open.description": "Reopen the ticket",
  "ticket.delete.description": "Delete the ticket",
  "ticket-settings.description":
    "Configure ticket feature (requires Manage Server)",
  "ticket-settings.setup.description": "Set up ticket panel",
  "ticket-settings.setup.category.description": "Category for ticket channels",
  "ticket-settings.teardown.description": "Remove ticket panel",
  "ticket-settings.view.description": "Show current settings",
  "ticket-settings.edit-panel.description": "Edit panel title and description",
  "ticket-settings.edit-panel.category.description": "Target category",
  "ticket-settings.set-roles.description": "Set staff roles (overwrite)",
  "ticket-settings.set-roles.category.description": "Target category",
  "ticket-settings.add-roles.description": "Add staff roles",
  "ticket-settings.add-roles.category.description": "Target category",
  "ticket-settings.remove-roles.description": "Remove staff roles",
  "ticket-settings.remove-roles.category.description": "Target category",
  "ticket-settings.set-auto-delete.description": "Set auto-delete period",
  "ticket-settings.set-auto-delete.category.description": "Target category",
  "ticket-settings.set-auto-delete.days.description": "Days until auto-delete",
  "ticket-settings.set-max-tickets.description": "Set max tickets per user",
  "ticket-settings.set-max-tickets.category.description": "Target category",
  "ticket-settings.set-max-tickets.count.description": "Max tickets per user",

  // ── User responses
  "user-response.setup_success": "Ticket panel has been set up.",
  "user-response.teardown_success": "Ticket panel has been removed.",
  "user-response.teardown_cancelled": "Cancelled.",
  "user-response.ticket_created": "Ticket created: {{channel}}",
  "user-response.ticket_closed": "Ticket has been closed.",
  "user-response.ticket_opened": "Ticket has been reopened.",
  "user-response.ticket_deleted": "Ticket has been deleted.",
  "user-response.delete_cancelled": "Cancelled.",
  "user-response.edit_panel_success": "Panel has been updated.",
  "user-response.set_roles_success": "Staff roles have been set.",
  "user-response.add_roles_success": "Staff roles have been added.",
  "user-response.remove_roles_success": "Staff roles have been removed.",
  "user-response.set_auto_delete_success":
    "Auto-delete period set to {{days}} days.",
  "user-response.set_max_tickets_success":
    "Max tickets per user set to {{count}}.",
  "user-response.category_already_setup":
    "A ticket panel is already set up for this category.",
  "user-response.config_not_found":
    "Ticket configuration not found for this category.",
  "user-response.no_configs": "No ticket configurations found.",
  "user-response.not_ticket_channel":
    "This command can only be used in a ticket channel.",
  "user-response.not_authorized_close_open":
    "Tickets can only be closed or reopened by the member who created the ticket, members with a staff role ({{staffRoles}}), or members with the Administrator permission.",
  "user-response.not_authorized_delete":
    "Tickets can only be deleted by members with a staff role ({{staffRoles}}) or members with the Administrator permission.",
  // Separator between staff roles and the text shown when there are none, used for {{staffRoles}} in the two keys above
  "user-response.staff_roles_separator": ", ",
  "user-response.staff_roles_not_set": "none set",
  "user-response.ticket_config_missing":
    "The panel for this ticket's category has been deleted, so this ticket can no longer be managed. Setting up a panel for the same category again makes it manageable again, but closed tickets that have passed the auto-delete period since they were closed are deleted as soon as the panel is set up again. If you no longer need this ticket, delete the channel directly.",
  "user-response.bot_channel_access_missing":
    "The bot doesn't have the permissions it needs in this channel, so this ticket can't be managed (nothing was changed). This happens to tickets created before the bot was removed from the server and added back, because the bot's permissions on those channels are removed. A server administrator can fix this by adding the bot under Edit Channel → Permissions for this channel and allowing View Channel, Send Messages, Embed Links, and Read Message History.",
  "user-response.bot_manage_channels_missing":
    "The bot doesn't have the Manage Channels permission, so this ticket can't be deleted (nothing was changed). Give the bot's role Manage Channels, or check that this channel's permission settings don't deny Manage Channels to the bot.",
  "user-response.ticket_already_closed": "This ticket is already closed.",
  "user-response.ticket_already_open": "This ticket is already open.",
  "user-response.max_tickets_reached":
    "You have reached the maximum number of simultaneous tickets ({{max}}).",
  "user-response.ticket_creation_in_progress":
    "Your ticket in this category is already being created. Please wait for it to finish.",
  "user-response.cannot_remove_last_role": "Cannot remove all staff roles.",
  "user-response.panel_not_found":
    "Panel message not found. The panel may have been deleted.",
  "user-response.panels_cleaned_up":
    "{{count}} panel(s) cleaned up because the message was deleted.",
  "user-response.session_expired": "Session expired. Please try again.",
  "user-response.and_more": "and {{count}} more",

  // ── Embed
  "embed.title.panel_default": "Support",
  "embed.description.panel_default":
    "If you need support, please create a ticket using the button below.",
  "embed.title.ticket": "Ticket: {{subject}}",
  "embed.field.name.created_by": "Created by",
  "embed.field.name.created_at": "Created at",
  "embed.title.closed": "Ticket Closed",
  "embed.description.closed": "Ticket has been closed.",
  "embed.description.auto_delete":
    "Will be automatically deleted <t:{{timestamp}}:R>",
  "embed.title.reopened": "Ticket Opened",
  "embed.description.reopened": "Ticket has been opened.",
  "embed.title.delete_confirm": "Ticket Deletion",
  "embed.description.delete_warning":
    "This ticket channel will be deleted. This action cannot be undone.",
  "embed.title.teardown_confirm": "Ticket Removal",
  "embed.description.teardown_confirm":
    "The panel and settings for the selected category will be deleted. This action cannot be undone.",
  "embed.description.teardown_warning":
    "There are {{count}} open tickets. Continuing will also delete all ticket channels. This action cannot be undone.",
  "embed.field.name.target_categories": "Target Categories",
  "embed.field.name.open_tickets": "Open tickets ({{count}})",
  "embed.title.config_view": "Ticket Settings",
  "embed.field.name.category": "Category",
  "embed.field.name.staff_roles": "Staff Roles",
  "embed.field.name.auto_delete": "Auto-delete Period",
  "embed.field.name.max_tickets": "Max Tickets per User",
  "embed.field.name.panel_channel": "Panel Channel",
  "embed.field.name.open_ticket_count": "Open Tickets",
  "embed.field.value.auto_delete_days": "{{days}} days",
  "embed.field.value.max_tickets_count": "{{count}}",
  "embed.field.value.open_ticket_count": "{{count}}",
  "embed.field.value.error_notification_feature": "Ticket",
  "embed.field.value.channel_access_missing_action":
    "Found ticket channels the bot cannot access",
  "embed.field.value.channel_access_missing_notice":
    "When the bot is removed from the server, Discord removes the bot's permissions on ticket channels. Because of this, the bot can't close, reopen, delete, or auto-delete the following {{count}} ticket channel(s) created before it was added back.\n{{channels}}\nIn each channel, open Edit Channel → Permissions, add the bot, and allow View Channel, Send Messages, Embed Links, and Read Message History (changing the category's permissions does not apply to ticket channels). If you no longer need a ticket, deleting its channel directly also cleans up its record. Other private channels where you had given the bot permissions, such as log channels, need them added back in the same way.",

  // ── UI labels
  "ui.button.create_ticket": "Create Ticket",
  "ui.button.close": "Close",
  "ui.button.reopen": "Reopen",
  "ui.button.delete": "Delete",
  "ui.button.delete_confirm": "Delete",
  "ui.button.teardown_confirm": "Remove",
  "ui.select.roles_placeholder": "Select staff roles",
  "ui.select.teardown_placeholder": "Select a category to remove",
  "ui.select.view_placeholder": "Select a category",
  "ui.modal.setup_title": "Panel Settings",
  "ui.modal.setup_field_title": "Panel Title",
  "ui.modal.setup_field_description": "Panel Description",
  "ui.modal.edit_panel_title": "Edit Panel",
  "ui.modal.setup_field_color": "Color (e.g. #00A8F3)",
  "ui.modal.edit_panel_field_color": "Color (e.g. #00A8F3)",
  "user-response.invalid_color":
    "Invalid color code. Please use #RRGGBB format.",
  "embed.field.name.panel_color": "Panel Color",
  "ui.modal.create_ticket_title": "Create Ticket",
  "ui.modal.create_ticket_subject": "Subject",
  "ui.modal.create_ticket_detail": "Details",

  // ── Logs
  "log.setup":
    "ticket panel set up GuildId: {{guildId}} CategoryId: {{categoryId}} ChannelId: {{channelId}}",
  "log.setup_started":
    "ticket panel setup started GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.teardown":
    "ticket panel removed GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.ticket_created":
    "ticket created GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}} TicketNumber: {{ticketNumber}}",
  "log.ticket_closed":
    "ticket closed GuildId: {{guildId}} ChannelId: {{channelId}} ClosedBy: {{closedBy}}",
  "log.ticket_opened":
    "ticket reopened GuildId: {{guildId}} ChannelId: {{channelId}} OpenedBy: {{openedBy}}",
  "log.ticket_deleted":
    "ticket deleted GuildId: {{guildId}} ChannelId: {{channelId}} DeletedBy: {{deletedBy}}",
  "log.ticket_auto_deleted":
    "ticket auto-deleted GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.ticket_auto_delete_failed":
    "ticket auto-delete failed GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.auto_delete_skipped_not_closed":
    "auto-delete skipped (ticket reopened or already deleted) GuildId: {{guildId}} TicketId: {{ticketId}}",
  "log.auto_delete_held_config_missing":
    "auto-delete held (category settings not found) GuildId: {{guildId}} CategoryId: {{categoryId}} TicketId: {{ticketId}}",
  "log.auto_delete_resumed":
    "auto-delete timers resumed after panel setup GuildId: {{guildId}} CategoryId: {{categoryId}} Count: {{count}}",
  "log.auto_delete_resume_failed":
    "failed to resume auto-delete timers after panel setup GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.unrecorded_channel_delete_failed":
    "failed to delete the channel of a ticket whose record could not be created GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.database_config_save_failed":
    "failed to save ticket config GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_config_find_failed":
    "failed to find ticket config GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_config_find_all_failed":
    "failed to find ticket configs GuildId: {{guildId}}",
  "log.database_config_delete_failed":
    "failed to delete ticket config GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_config_delete_all_failed":
    "failed to delete all ticket configs GuildId: {{guildId}}",
  "log.database_config_increment_counter_failed":
    "failed to increment ticket counter GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_find_failed": "failed to find ticket Id: {{id}}",
  "log.database_ticket_find_by_channel_failed":
    "failed to find ticket ChannelId: {{channelId}}",
  "log.database_ticket_find_open_failed":
    "failed to find open tickets GuildId: {{guildId}} CategoryId: {{categoryId}} UserId: {{userId}}",
  "log.database_ticket_find_all_by_category_failed":
    "failed to find tickets GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_find_closed_failed":
    "failed to find closed tickets GuildId: {{guildId}}",
  "log.database_ticket_find_all_by_guild_failed":
    "failed to find tickets for guild GuildId: {{guildId}}",
  "log.database_ticket_create_failed":
    "failed to create ticket GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_update_failed": "failed to update ticket Id: {{id}}",
  "log.database_ticket_delete_failed": "failed to delete ticket Id: {{id}}",
  "log.database_ticket_delete_by_category_failed":
    "failed to delete tickets GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_delete_all_failed":
    "failed to delete all tickets GuildId: {{guildId}}",
  "log.auto_delete_scheduled":
    "auto-delete timer started GuildId: {{guildId}} ChannelId: {{channelId}} DelayMs: {{delayMs}}",
  "log.auto_delete_cancelled":
    "auto-delete timer cancelled GuildId: {{guildId}} TicketId: {{ticketId}}",
  "log.auto_delete_restore":
    "auto-delete timers restored on startup Count: {{count}}",
  "log.panel_deleted":
    "panel deletion detected GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.panel_channel_deleted":
    "panel channel deletion detected GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.panel_cleanup_failed": "panel cleanup failed GuildId: {{guildId}}",
  "log.ticket_channel_deleted":
    "ticket channel deletion detected, record removed GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.ticket_channel_cleanup_failed":
    "ticket cleanup after channel deletion failed GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.missing_channel_tickets_removed":
    "removed tickets whose channel no longer exists GuildId: {{guildId}} Count: {{count}}",
  "log.ticket_channel_sync_failed":
    "ticket/channel sync failed (nothing removed) GuildId: {{guildId}}",
  "log.auto_delete_restore_guild":
    "auto-delete timers restored on rejoin/reconnect GuildId: {{guildId}} Count: {{count}}",
  "log.guild_resync_failed":
    "ticket/channel sync after reconnect failed GuildId: {{guildId}}",
  "log.ticket_channel_access_missing":
    "stopped a ticket operation because the bot cannot handle the ticket channel (for deletion, including a missing Manage Channels) GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.auto_delete_held_channel_inaccessible":
    "auto-delete held and will be retried later (the bot cannot handle the channel, lacks Manage Channels, or the guild could not be fetched) GuildId: {{guildId}} ChannelId: {{channelId}} TicketId: {{ticketId}} RetryInMs: {{retryInMs}}",
  "log.auto_delete_still_held":
    "auto-delete still held on retry; will be retried again later GuildId: {{guildId}} ChannelId: {{channelId}} TicketId: {{ticketId}} RetryInMs: {{retryInMs}}",
  "log.ticket_channel_delete_failed":
    "failed to delete the ticket channel (the record is already deleted; the channel remains) GuildId: {{guildId}} ChannelId: {{channelId}}",
  "log.inaccessible_ticket_channels_found":
    "found ticket channels the bot cannot handle GuildId: {{guildId}} Count: {{count}} ChannelIds: {{channelIds}}",
  "log.teardown_channel_inaccessible":
    "could not delete a ticket channel the bot cannot handle (or lacks Manage Channels for) during removal (the channel remains) GuildId: {{guildId}} ChannelId: {{channelId}}",
} as const;

export type TicketTranslations = typeof ticket;
