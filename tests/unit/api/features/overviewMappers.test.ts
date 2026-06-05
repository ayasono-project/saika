// tests/unit/api/features/overviewMappers.test.ts
// 概要の機能ステータス構築（toFeatureStatuses）のユニットテスト。

import { describe, expect, it } from "vitest";
import {
  type OverviewInputs,
  toFeatureStatuses,
} from "@/api/features/overviewResource";

const BASE: OverviewInputs = {
  locale: "ja",
  afkEnabled: false,
  afkChannelId: null,
  vacEnabled: false,
  vacTriggerCount: 0,
  vcRecruitEnabled: false,
  vcRecruitSetupCount: 0,
  vcAutoRecruitEnabled: false,
  vcAutoRecruitCategoryCount: 0,
  stickyCount: 0,
  memberLogEnabled: false,
  memberLogChannelId: null,
  bumpEnabled: false,
  bumpMentionRoleId: null,
  ticketCount: 0,
  reactionRoleCount: 0,
  inactiveKickEnabled: false,
  inactiveKickThresholdDays: 30,
  unverifiedKickEnabled: false,
  unverifiedKickVerifiedRoleId: null,
};

function statusFor(key: string, input: OverviewInputs) {
  const found = toFeatureStatuses(input).find((s) => s.key === key);
  if (!found) throw new Error(`feature ${key} not found`);
  return found;
}

describe("toFeatureStatuses", () => {
  it("12 機能を既定の表示順で返す", () => {
    const keys = toFeatureStatuses(BASE).map((s) => s.key);
    expect(keys).toEqual([
      "general",
      "afk",
      "vac",
      "vc-recruit",
      "vc-auto-recruit",
      "sticky",
      "member-log",
      "bump",
      "tickets",
      "reaction-roles",
      "inactive-kick",
      "unverified-kick",
    ]);
  });

  it("general は常に enabled で言語を要約に含む", () => {
    expect(statusFor("general", { ...BASE, locale: "en" })).toEqual({
      key: "general",
      state: "enabled",
      summary: "言語: en",
    });
  });

  it("トグル系は enabled/disabled を反映する", () => {
    expect(statusFor("afk", { ...BASE, afkEnabled: true }).state).toBe(
      "enabled",
    );
    expect(statusFor("afk", BASE).state).toBe("disabled");
  });

  it("コレクション系は件数 0 で unconfigured・1 以上で enabled", () => {
    expect(statusFor("sticky", BASE).state).toBe("unconfigured");
    expect(statusFor("tickets", { ...BASE, ticketCount: 2 }).state).toBe(
      "enabled",
    );
    expect(
      statusFor("reaction-roles", { ...BASE, reactionRoleCount: 1 }).summary,
    ).toBe("パネル: 1件");
  });

  it("要約に件数・閾値を反映する", () => {
    expect(statusFor("vac", { ...BASE, vacTriggerCount: 3 }).summary).toBe(
      "トリガー: 3チャンネル",
    );
    expect(
      statusFor("inactive-kick", { ...BASE, inactiveKickThresholdDays: 14 })
        .summary,
    ).toBe("閾値: 14日");
  });
});
