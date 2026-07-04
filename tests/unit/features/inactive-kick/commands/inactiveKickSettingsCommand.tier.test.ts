// tests/unit/features/inactive-kick/commands/inactiveKickSettingsCommand.tier.test.ts

import { Locale } from "discord.js";
import {
  buildTierListField,
  formatTierSummary,
} from "@/features/inactive-kick/commands/inactiveKickSettingsCommand.tier";
import type { InactiveKickTier } from "@/shared/database/types";
import { localeManager } from "@/shared/locale/localeManager";

// i18n 依存の表示文言検証に備えてロケールを初期化
beforeAll(async () => {
  await localeManager.initialize();
});

const DEFAULT_TIER: InactiveKickTier = {
  tenureDays: 0,
  thresholdDays: 30,
  trackMessage: true,
  trackVoice: true,
  trackReaction: true,
};

describe("inactive-kick/tier サマリー表示（常に活動判定・アクティブ条件・モードを箇条書きで表示する）", () => {
  it("デフォルト値の階層でも活動判定・アクティブ条件（なし）・モード（通常）を省略せず箇条書きで表示する", () => {
    const text = formatTierSummary(Locale.Japanese, DEFAULT_TIER);
    expect(text).toContain("在籍 0 日以上 → 非アクティブ 30 日");
    expect(text).toContain(
      "• 活動判定: メッセージ: 有効 / VC参加: 有効 / リアクション: 有効",
    );
    expect(text).toContain("• アクティブ条件: なし");
    expect(text).toContain("• モード: 通常（非アクティブ日数で判定）");
  });

  it("track-voice OFF の階層は「無効」で表示する", () => {
    const text = formatTierSummary(Locale.Japanese, {
      ...DEFAULT_TIER,
      trackVoice: false,
    });
    expect(text).toContain(
      "• 活動判定: メッセージ: 有効 / VC参加: 無効 / リアクション: 有効",
    );
  });

  it("アクティブ条件が複数設定されていれば「または」で連結する", () => {
    const text = formatTierSummary(Locale.Japanese, {
      ...DEFAULT_TIER,
      minMessageCount: 3,
      minVoiceCount: 1,
    });
    expect(text).toContain(
      "• アクティブ条件: メッセージ3回以上 または VC参加1回以上",
    );
  });

  it("tenureDeadline が true なら見出しが「在籍N日以上からM日までで判定」になり、モード行も締め切りモードの説明文になる", () => {
    const text = formatTierSummary(Locale.Japanese, {
      ...DEFAULT_TIER,
      tenureDeadline: true,
    });
    expect(text).toContain("在籍 0 日以上から 30 日までで判定");
    expect(text).toContain(
      "• モード: 在籍日数締め切り（未達なら在籍日数到達時にキック・達していれば以後対象外）",
    );
  });

  it("buildTierListField は見出しを name・詳細行（箇条書き）を value に分けて返す", () => {
    const field = buildTierListField(Locale.Japanese, DEFAULT_TIER);
    expect(field.name).toBe("在籍 0 日以上 → 非アクティブ 30 日");
    expect(field.value).toBe(
      [
        "• 活動判定: メッセージ: 有効 / VC参加: 有効 / リアクション: 有効",
        "• アクティブ条件: なし",
        "• モード: 通常（非アクティブ日数で判定）",
      ].join("\n"),
    );
  });

  it("英語ロケールでも同じ構造で表示する", () => {
    const text = formatTierSummary(Locale.EnglishUS, DEFAULT_TIER);
    expect(text).toContain("Tenure 0+ days → inactive 30 days");
    expect(text).toContain(
      "• Activity tracking: Messages: Enabled / VC joins: Enabled / Reactions: Enabled",
    );
    expect(text).toContain("• Active condition: None");
    expect(text).toContain("• Mode: Normal (based on inactive days)");
  });
});
