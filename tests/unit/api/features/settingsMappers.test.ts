// tests/unit/api/features/settingsMappers.test.ts
// 機能別設定のドメイン↔契約マッパー（純粋関数）のユニットテスト

import type { Guild as DiscordGuild } from "discord.js";
import { describe, expect, it } from "vitest";
import { applyAfkPatch, toContractAfk } from "@/api/features/afkResource";
import { applyBumpPatch, toContractBump } from "@/api/features/bumpResource";
import { toContractConfig } from "@/api/features/configResource";
import {
  applyMemberLogPatch,
  toContractMemberLog,
} from "@/api/features/memberLogResource";
import {
  applyVacPatch,
  toActiveVac,
  toContractVac,
} from "@/api/features/vacResource";

describe("afk マッパー", () => {
  it("toContractAfk は channelId 未設定を null にする", () => {
    expect(toContractAfk({ enabled: true, channelId: undefined })).toEqual({
      enabled: true,
      channelId: null,
    });
  });

  it("applyAfkPatch は null を undefined（クリア）に、未指定は現状維持", () => {
    const cur = { enabled: true, channelId: "c1" };
    expect(applyAfkPatch(cur, { channelId: null })).toEqual({
      enabled: true,
      channelId: undefined,
    });
    expect(applyAfkPatch(cur, { enabled: false })).toEqual({
      enabled: false,
      channelId: "c1",
    });
  });
});

describe("bump マッパー", () => {
  it("toContractBump は channelId 未設定を all にする", () => {
    expect(
      toContractBump({
        enabled: true,
        channelId: undefined,
        mentionRoleId: undefined,
        mentionUserIds: [],
      }),
    ).toEqual({
      enabled: true,
      channelId: "all",
      mentionRoleId: null,
      mentionUserIds: [],
    });
  });

  it("applyBumpPatch は all を undefined に、特定IDはそのまま", () => {
    const cur = {
      enabled: false,
      channelId: "c1",
      mentionRoleId: "r1",
      mentionUserIds: ["u1"],
    };
    expect(applyBumpPatch(cur, { channelId: "all" }).channelId).toBeUndefined();
    expect(applyBumpPatch(cur, { channelId: "c2" }).channelId).toBe("c2");
    expect(
      applyBumpPatch(cur, { mentionRoleId: null }).mentionRoleId,
    ).toBeUndefined();
  });
});

describe("vac マッパー", () => {
  it("toContractVac は createdChannels を除外する", () => {
    expect(
      toContractVac({
        enabled: true,
        triggerChannelIds: ["v1"],
        createdChannels: [{ voiceChannelId: "x", ownerId: "o", createdAt: 1 }],
      }),
    ).toEqual({ enabled: true, triggerChannelIds: ["v1"] });
  });

  it("applyVacPatch は createdChannels を保持する", () => {
    const cur = {
      enabled: false,
      triggerChannelIds: [],
      createdChannels: [{ voiceChannelId: "x", ownerId: "o", createdAt: 1 }],
    };
    const next = applyVacPatch(cur, {
      enabled: true,
      triggerChannelIds: ["v2"],
    });
    expect(next.createdChannels).toEqual(cur.createdChannels);
    expect(next.triggerChannelIds).toEqual(["v2"]);
  });

  it("toActiveVac はチャンネル名・オーナー表示名を解決する", () => {
    const guild = {
      channels: { cache: new Map([["vc1", { name: "ゲームVC" }]]) },
      members: { cache: new Map([["owner1", { displayName: "Alice" }]]) },
    } as unknown as DiscordGuild;
    const active = toActiveVac(
      { voiceChannelId: "vc1", ownerId: "owner1", createdAt: Date.now() },
      guild,
    );
    expect(active.id).toBe("vc1");
    expect(active.name).toBe("ゲームVC");
    expect(active.owner).toBe("Alice");
    expect(typeof active.createdLabel).toBe("string");
  });

  it("toActiveVac は未解決時に ID へフォールバックする", () => {
    const guild = {
      channels: { cache: new Map() },
      members: { cache: new Map() },
    } as unknown as DiscordGuild;
    const active = toActiveVac(
      { voiceChannelId: "vc9", ownerId: "owner9", createdAt: 1 },
      guild,
    );
    expect(active.name).toBe("vc9");
    expect(active.owner).toBe("owner9");
  });
});

describe("member-log マッパー", () => {
  it("toContractMemberLog は未設定メッセージを空文字にする", () => {
    expect(
      toContractMemberLog({
        enabled: true,
        channelId: undefined,
        joinMessage: undefined,
        leaveMessage: undefined,
      }),
    ).toEqual({
      enabled: true,
      channelId: null,
      joinMessage: "",
      leaveMessage: "",
    });
  });

  it("applyMemberLogPatch は空文字をクリア扱いにする", () => {
    const cur = {
      enabled: true,
      channelId: "c1",
      joinMessage: "hi",
      leaveMessage: "bye",
    };
    const next = applyMemberLogPatch(cur, { joinMessage: "", channelId: null });
    expect(next.joinMessage).toBeUndefined();
    expect(next.channelId).toBeUndefined();
    expect(next.leaveMessage).toBe("bye");
  });
});

describe("config マッパー", () => {
  it("toContractConfig は null をデフォルトにする", () => {
    expect(toContractConfig(null)).toEqual({
      locale: "ja",
      errorChannelId: null,
    });
  });

  it("toContractConfig は非対応 locale を ja に丸める", () => {
    const base = {
      guildId: "g",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(
      toContractConfig({ ...base, locale: "fr", errorChannelId: "c1" }),
    ).toEqual({ locale: "ja", errorChannelId: "c1" });
    expect(
      toContractConfig({ ...base, locale: "en", errorChannelId: undefined })
        .locale,
    ).toBe("en");
  });
});
