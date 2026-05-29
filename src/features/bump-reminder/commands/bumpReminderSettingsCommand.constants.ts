// src/bot/features/bump-reminder/commands/bumpReminderSettingsCommand.constants.ts
// bump-reminder-settings コマンドの定数定義

/**
 * bump-reminder-settings コマンドで共用するコマンド名・サブコマンド名・オプション名定数
 */
export const BUMP_REMINDER_SETTINGS_COMMAND = {
  NAME: "bump-reminder-settings",
  SUBCOMMAND: {
    ENABLE: "enable",
    DISABLE: "disable",
    SET_MENTION: "set-mention",
    REMOVE_MENTION: "remove-mention",
    REMOVE_MENTION_USERS: "remove-mention-users",
    RESET: "reset",
    VIEW: "view",
  },
  OPTION: {
    ROLE: "role",
  },
} as const;
