// src/shared/locale/locales/en/resources.ts
// English translation resources export

import { common } from "./common";
import {
  about,
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
  unverifiedKick,
  vac,
  vcAutoRecruit,
  vcRecruit,
} from "./features";
import { system } from "./system";

export const en: {
  common: typeof common;
  system: typeof system;
  about: typeof about;
  ping: typeof ping;
  help: typeof help;
  afk: typeof afk;
  bumpReminder: typeof bumpReminder;
  vac: typeof vac;
  vcAutoRecruit: typeof vcAutoRecruit;
  messageDelete: typeof messageDelete;
  memberLog: typeof memberLog;
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
  vcAutoRecruit,
  messageDelete,
  memberLog,
  unverifiedKick,
  reactionRole,
  stickyMessage,
  ticket,
  vcRecruit,
  guildSettings,
};

export type EnglishTranslations = typeof en;
