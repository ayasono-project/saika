// src/shared/locale/locales/en/features/ticket.ts
// Ticket channel feature English translations

export const ticket = {
  // ── Command definitions
  "ticket.description": "Manage tickets",
  "ticket.close.description": "Close the ticket",
  "ticket.open.description": "Reopen the ticket",
  "ticket.delete.description": "Delete the ticket",
  "ticket-config.description":
    "Configure ticket feature (requires Manage Server)",
  "ticket-config.setup.description": "Set up ticket panel",
  "ticket-config.setup.category.description": "Category for ticket channels",
  "ticket-config.teardown.description": "Remove ticket panel",
  "ticket-config.reset.description": "Reset all settings",
  "ticket-config.view.description": "Show current settings",
  "ticket-config.edit-panel.description": "Edit panel title and description",
  "ticket-config.edit-panel.category.description": "Target category",
  "ticket-config.set-roles.description": "Set staff roles (overwrite)",
  "ticket-config.set-roles.category.description": "Target category",
  "ticket-config.add-roles.description": "Add staff roles",
  "ticket-config.add-roles.category.description": "Target category",
  "ticket-config.remove-roles.description": "Remove staff roles",
  "ticket-config.remove-roles.category.description": "Target category",
  "ticket-config.set-auto-delete.description": "Set auto-delete period",
  "ticket-config.set-auto-delete.category.description": "Target category",
  "ticket-config.set-auto-delete.days.description": "Days until auto-delete",
  "ticket-config.set-max-tickets.description": "Set max tickets per user",
  "ticket-config.set-max-tickets.category.description": "Target category",
  "ticket-config.set-max-tickets.count.description": "Max tickets per user",

  // ── User responses
  "user-response.setup_success": "Ticket panel has been set up.",
  "user-response.teardown_success": "Ticket panel has been removed.",
  "user-response.teardown_cancelled": "Cancelled.",
  "user-response.reset_success": "All ticket settings have been reset.",
  "user-response.reset_cancelled": "Cancelled.",
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
  "user-response.not_authorized":
    "You do not have permission to perform this action.",
  "user-response.ticket_already_closed": "This ticket is already closed.",
  "user-response.ticket_already_open": "This ticket is already open.",
  "user-response.max_tickets_reached":
    "You have reached the maximum number of simultaneous tickets ({{max}}).",
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
  "embed.title.reset_confirm": "Ticket Settings Reset",
  "embed.description.reset_warning":
    "All ticket settings will be reset. All panels, ticket channels, and settings for all categories will be deleted. This action cannot be undone.",
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

  // ── UI labels
  "ui.button.create_ticket": "Create Ticket",
  "ui.button.close": "Close",
  "ui.button.reopen": "Reopen",
  "ui.button.delete": "Delete",
  "ui.button.delete_confirm": "Delete",
  "ui.button.teardown_confirm": "Remove",
  "ui.button.teardown_cancel": "Cancel",
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
  "log.teardown":
    "ticket panel removed GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.reset": "all ticket settings reset GuildId: {{guildId}}",
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
  "log.database_config_saved":
    "ticket config saved GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_config_save_failed":
    "failed to save ticket config GuildId: {{guildId}} CategoryId: {{categoryId}}",
  "log.database_ticket_saved":
    "ticket saved GuildId: {{guildId}} TicketId: {{ticketId}}",
  "log.database_ticket_save_failed":
    "failed to save ticket GuildId: {{guildId}} TicketId: {{ticketId}}",
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
} as const;

export type TicketTranslations = typeof ticket;
