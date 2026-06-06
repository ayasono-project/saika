// src/shared/locale/locales/ja/resources.ts
// 日本語翻訳リソースのエクスポート

import { common } from "./common";
import {
  about,
  afk,
  bumpReminder,
  guildSettings,
  help,
  inactiveKick,
  memberLog,
  messageDelete,
  ping,
  reactionRole,
  stickyMessage,
  ticket,
  unverifiedKick,
  vac,
  vc,
  vcAutoRecruit,
  vcRecruit,
} from "./features";
import { system } from "./system";

export const ja: {
  common: typeof common;
  system: typeof system;
  about: typeof about;
  ping: typeof ping;
  help: typeof help;
  afk: typeof afk;
  bumpReminder: typeof bumpReminder;
  vac: typeof vac;
  vc: typeof vc;
  vcAutoRecruit: typeof vcAutoRecruit;
  messageDelete: typeof messageDelete;
  memberLog: typeof memberLog;
  inactiveKick: typeof inactiveKick;
  unverifiedKick: typeof unverifiedKick;
  reactionRole: typeof reactionRole;
  stickyMessage: typeof stickyMessage;
  ticket: typeof ticket;
  vcRecruit: typeof vcRecruit;
  guildSettings: typeof guildSettings;
} = {
  common,
  system,
  about,
  ping,
  help,
  afk,
  bumpReminder,
  vac,
  vc,
  vcAutoRecruit,
  messageDelete,
  memberLog,
  inactiveKick,
  unverifiedKick,
  reactionRole,
  stickyMessage,
  ticket,
  vcRecruit,
  guildSettings,
};

export type JapaneseTranslations = typeof ja;
