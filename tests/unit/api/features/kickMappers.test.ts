// vc-auto-recruit / unverified-kick マッパー（純粋関数）のユニットテスト

import type { Guild as DiscordGuild } from "discord.js";
import { describe, expect, it } from "vitest";
import {
  applyUnverifiedKickPatch,
  toContractUnverifiedKick,
} from "@/api/features/unverifiedKickResource";
import {
  applyVcAutoRecruitPatch,
  toActiveInvite,
  toContractVcAutoRecruit,
} from "@/api/features/vcAutoRecruitResource";

const NOW = new Date("2026-06-04T00:00:00Z");

describe("vc-auto-recruit マッパー", () => {
  it("toContract は message 未設定を空文字にする", () => {
    expect(
      toContractVcAutoRecruit({
        enabled: true,
        channelId: undefined,
        message: undefined,
        embedEnabled: true,
        enabledChannelIds: ["ch1"],
        activeInvites: [],
      }),
    ).toEqual({
      enabled: true,
      channelId: null,
      message: "",
      embedEnabled: true,
      enabledChannelIds: ["ch1"],
    });
  });

  it("applyPatch は activeInvites を保持する", () => {
    const cur = {
      enabled: false,
      channelId: undefined,
      message: undefined,
      embedEnabled: true,
      enabledChannelIds: [],
      activeInvites: [
        {
          voiceChannelId: "v",
          postChannelId: "p",
          messageId: "m",
          createdAt: 1,
        },
      ],
    };
    const next = applyVcAutoRecruitPatch(cur, { enabled: true });
    expect(next.activeInvites).toEqual(cur.activeInvites);
    expect(next.enabled).toBe(true);
  });

  it("toActiveInvite は VC 名・投稿チャンネル名を解決する", () => {
    const guild = {
      channels: {
        cache: new Map([
          ["v1", { name: "ゲームVC" }],
          ["p1", { name: "募集" }],
        ]),
      },
    } as unknown as DiscordGuild;
    const inv = toActiveInvite(
      {
        voiceChannelId: "v1",
        postChannelId: "p1",
        messageId: "m",
        createdAt: 1,
      },
      guild,
    );
    expect(inv).toMatchObject({
      id: "v1",
      vcName: "ゲームVC",
      channelName: "募集",
    });
    expect(typeof inv.startedLabel).toBe("string");
  });
});

describe("unverified-kick マッパー", () => {
  it("toContract は warnDays 未設定を 0 にする", () => {
    expect(
      toContractUnverifiedKick({
        enabled: false,
        graceDays: 7,
        exemptRoleIds: [],
        timezone: "Asia/Tokyo",
        runHour: 3,
        mentionEnabled: true,
      }),
    ).toMatchObject({ warnDays: 0, verifiedRoleId: null, dmTemplate: "" });
  });

  it("warnDays 0 はクリア（undefined）扱い", () => {
    const cur = {
      enabled: false,
      graceDays: 7,
      warnDays: 3,
      exemptRoleIds: [],
      timezone: "Asia/Tokyo",
      runHour: 3,
      mentionEnabled: true,
    };
    expect(
      applyUnverifiedKickPatch(cur, { warnDays: 0 }, NOW).warnDays,
    ).toBeUndefined();
    expect(applyUnverifiedKickPatch(cur, { warnDays: 5 }, NOW).warnDays).toBe(
      5,
    );
  });

  it("有効化時は enabledAt を now にする", () => {
    const cur = {
      enabled: false,
      graceDays: 7,
      exemptRoleIds: [],
      timezone: "Asia/Tokyo",
      runHour: 3,
      mentionEnabled: true,
    };
    expect(
      applyUnverifiedKickPatch(cur, { enabled: true }, NOW).enabledAt,
    ).toBe(NOW);
  });
});
