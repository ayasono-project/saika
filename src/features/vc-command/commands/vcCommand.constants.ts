// src/features/vc-command/commands/vcCommand.constants.ts
// VC操作コマンド定数

/**
 * VC操作コマンドで使用するコマンド名・サブコマンド名・オプション名定数
 */
export const VC_COMMAND = {
  NAME: "vc",
  SUBCOMMAND: {
    RENAME: "rename",
    LIMIT: "limit",
    DISCONNECT: "disconnect",
    MOVE: "move",
  },
  OPTION: {
    NAME: "name",
    LIMIT: "limit",
    TARGET_MEMBER: "target-member",
    TARGET_CHANNEL: "target-channel",
    TO: "to",
    REASON: "reason",
  },
  LIMIT_MIN: 0,
  LIMIT_MAX: 99,
} as const;
