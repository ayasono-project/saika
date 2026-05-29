// src/shared/locale/locales/ja/resources.ts
// 日本語翻訳リソースのエクスポート

import { common } from "./common";
import {
  afk,
  bumpReminder,
  guildSettings,
  help,
  memberLog,
  messageDelete,
  ping,
  reactionRole,
  stickyMessage,
  ticket,
  vac,
  vc,
  vcRecruit,
} from "./features";
import { system } from "./system";

export const ja: {
  common: typeof common;
  system: typeof system;
  ping: typeof ping;
  help: typeof help;
  afk: typeof afk;
  bumpReminder: typeof bumpReminder;
  vac: typeof vac;
  vc: typeof vc;
  messageDelete: typeof messageDelete;
  memberLog: typeof memberLog;
  reactionRole: typeof reactionRole;
  stickyMessage: typeof stickyMessage;
  ticket: typeof ticket;
  vcRecruit: typeof vcRecruit;
  guildSettings: typeof guildSettings;
} = {
  common,
  system,
  ping,
  help,
  afk,
  bumpReminder,
  vac,
  vc,
  messageDelete,
  memberLog,
  reactionRole,
  stickyMessage,
  ticket,
  vcRecruit,
  guildSettings,
};

export type JapaneseTranslations = typeof ja;
