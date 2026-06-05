// tests/unit/api/features/vcRecruitResource.test.ts
// VC募集設定リソース（setups reconcile 含む）のユニットテスト。
// repo をインメモリでモックし、Discord 副作用（パネル投稿）は無効化する。

import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Setup = {
    categoryId: string | null;
    panelChannelId: string;
    postChannelId: string;
    panelMessageId: string;
    threadArchiveDuration: 60 | 1440 | 4320 | 10080;
    createdVoiceChannelIds: string[];
  };
  type Settings = {
    enabled: boolean;
    mentionRoleIds: string[];
    setups: Setup[];
  };
  let state: Settings = { enabled: false, mentionRoleIds: [], setups: [] };
  return {
    reset: () => {
      state = { enabled: false, mentionRoleIds: [], setups: [] };
    },
    repo: {
      getVcRecruitSettingsOrDefault: async () => state,
      // biome-ignore lint/suspicious/noExplicitAny: テスト用
      saveVcRecruitSettings: async (_g: string, cfg: any) => {
        state = cfg;
      },
    },
  };
});

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitSettingsService: () => h.repo,
}));

import { createVcRecruitResource } from "@/api/features/vcRecruitResource";
import type { ApiServerDeps } from "@/api/types";

const deps = {
  client: { channels: { fetch: async () => null } },
} as unknown as ApiServerDeps;
const resource = createVcRecruitResource(deps);

beforeEach(() => h.reset());

describe("createVcRecruitResource", () => {
  it("read は既定値を返す", async () => {
    expect(await resource.read("g1")).toEqual({
      enabled: false,
      mentionRoleIds: [],
      setups: [],
    });
  });

  it("patch で enabled / mentionRoleIds を更新する", async () => {
    const res = await resource.patch("g1", {
      enabled: true,
      mentionRoleIds: ["r1"],
    });
    expect(res.enabled).toBe(true);
    expect(res.mentionRoleIds).toEqual(["r1"]);
  });

  it("patch で setup を追加し、契約形（id=panelChannelId）で返す", async () => {
    const res = await resource.patch("g1", {
      setups: [
        {
          id: "ignored",
          categoryId: null,
          panelChannelId: "p1",
          postChannelId: "po1",
          archiveMinutes: 1440,
        },
      ],
    });
    expect(res.setups).toEqual([
      {
        id: "p1",
        categoryId: null,
        panelChannelId: "p1",
        postChannelId: "po1",
        archiveMinutes: 1440,
      },
    ]);
  });

  it("panel/post チャンネル欠落の setup は採用しない", async () => {
    const res = await resource.patch("g1", {
      setups: [
        {
          id: "x",
          categoryId: null,
          panelChannelId: null,
          postChannelId: null,
          archiveMinutes: 1440,
        },
      ],
    });
    expect(res.setups).toEqual([]);
  });

  it("既存 setup を残しつつ削除された setup を取り除く", async () => {
    await resource.patch("g1", {
      setups: [
        {
          id: "p1",
          categoryId: null,
          panelChannelId: "p1",
          postChannelId: "po1",
          archiveMinutes: 1440,
        },
        {
          id: "p2",
          categoryId: null,
          panelChannelId: "p2",
          postChannelId: "po2",
          archiveMinutes: 60,
        },
      ],
    });
    const res = await resource.patch("g1", {
      setups: [
        {
          id: "p1",
          categoryId: "cat",
          panelChannelId: "p1",
          postChannelId: "po1",
          archiveMinutes: 4320,
        },
      ],
    });
    expect(res.setups).toEqual([
      {
        id: "p1",
        categoryId: "cat",
        panelChannelId: "p1",
        postChannelId: "po1",
        archiveMinutes: 4320,
      },
    ]);
  });

  it("reset で空設定に戻す", async () => {
    await resource.patch("g1", { enabled: true, mentionRoleIds: ["r1"] });
    const res = await resource.reset("g1");
    expect(res).toEqual({ enabled: false, mentionRoleIds: [], setups: [] });
  });
});
