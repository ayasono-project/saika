// src/bot/features/vc-command/commands/vcCommand.constants.ts
// VC操作コマンド定数

/**
 * VC操作コマンドで使用するコマンド名・サブコマンド名・オプション名定数
 */
export const VC_COMMAND = {
  NAME: "vc",
  SUBCOMMAND: {
    RENAME: "rename",
    LIMIT: "limit",
  },
  OPTION: {
    NAME: "name",
    LIMIT: "limit",
  },
  LIMIT_MIN: 0,
  LIMIT_MAX: 99,
} as const;
