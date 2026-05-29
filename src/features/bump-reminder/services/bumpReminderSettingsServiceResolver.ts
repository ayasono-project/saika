// src/bot/features/bump-reminder/services/bumpReminderSettingsServiceResolver.ts
// bump-reminder 設定サービスの依存解決

import { type IBumpReminderSettingsRepository } from "../../../shared/database/types";
import {
  BumpReminderSettingsService,
  createBumpReminderSettingsService,
  getBumpReminderSettingsService,
} from "../bumpReminderSettingsService";

let cachedService: BumpReminderSettingsService | undefined;
let cachedRepository: IBumpReminderSettingsRepository | undefined;

/**
 * 注入された repository から設定サービスを生成する
 */
export function createBumpReminderFeatureSettingsService(
  repository: IBumpReminderSettingsRepository,
): BumpReminderSettingsService {
  return createBumpReminderSettingsService(repository);
}

/**
 * Bot層で利用する bump-reminder 設定サービスを解決する
 */
export function getBumpReminderFeatureSettingsService(
  repository?: IBumpReminderSettingsRepository,
): BumpReminderSettingsService {
  if (!repository) {
    return getBumpReminderSettingsService();
  }

  const resolvedRepository = repository;

  if (!cachedService || cachedRepository !== resolvedRepository) {
    cachedService =
      createBumpReminderFeatureSettingsService(resolvedRepository);
    cachedRepository = resolvedRepository;
  }

  return cachedService;
}
