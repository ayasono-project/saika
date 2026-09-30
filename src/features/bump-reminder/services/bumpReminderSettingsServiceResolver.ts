// bump-reminder 設定サービスの依存解決

import { type IBumpReminderSettingsRepository } from "../../../shared/database/types";
import {
  BumpReminderSettingsService,
  createBumpReminderSettingsService,
} from "../bumpReminderSettingsService";

/**
 * 注入された repository から設定サービスを生成する
 */
export function createBumpReminderFeatureSettingsService(
  repository: IBumpReminderSettingsRepository,
): BumpReminderSettingsService {
  return createBumpReminderSettingsService(repository);
}
