// src/shared/locale/locales/en/resources.ts
// English translation resources export

import { common } from "./common";
import {
  afk,
  bumpReminder,
  guildConfig,
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

export const en: {
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
  guildConfig: typeof guildConfig;
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
  guildConfig,
};

export type EnglishTranslations = typeof en;
