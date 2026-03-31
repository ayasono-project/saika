// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.constants.ts
// bump-reminder-config コマンドの定数定義

/**
 * bump-reminder-config コマンドで共用するコマンド名・サブコマンド名・オプション名定数
 */
export const BUMP_REMINDER_CONFIG_COMMAND = {
  NAME: "bump-reminder-config",
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
