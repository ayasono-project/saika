// tests/unit/api/reactionRoleRoutes.test.ts
// リアクションロール CRUD ルートの統合的ユニットテスト。
// Composition Root のサービスをインメモリ実装でモックし、Discord 副作用は無効化する。

import Fastify, { type FastifyInstance } from "fastify";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const h = vi.hoisted(() => {
  // biome-ignore lint/suspicious/noExplicitAny: テスト用インメモリ行
  const items: any[] = [];
  let seq = 0;
  return {
    items,
    reset: () => {
      items.length = 0;
      seq = 0;
    },
    service: {
      findAllByGuild: async (g: string) => items.filter((i) => i.guildId === g),
      findById: async (id: string) => items.find((i) => i.id === id) ?? null,
      // biome-ignore lint/suspicious/noExplicitAny: テスト用
      create: async (data: any) => {
        const row = {
          ...data,
          id: `rp${++seq}`,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        };
        items.push(row);
        return row;
      },
      // biome-ignore lint/suspicious/noExplicitAny: テスト用
      update: async (id: string, data: any) => {
        const row = items.find((i) => i.id === id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
      delete: async (id: string) => {
        const idx = items.findIndex((i) => i.id === id);
        if (idx >= 0) items.splice(idx, 1);
      },
    },
  };
});

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelSettingsService: () => h.service,
}));

import { toErrorResponse } from "@/api/lib/httpError";
import { reactionRoleRoutes } from "@/api/routes/reactionRoles";
import type { ApiServerDeps } from "@/api/types";
import type { BotClient } from "@/bot/client";
import { localeManager } from "@/shared/locale/localeManager";

/** Discord 副作用を no-op にする Client（channels.fetch は常に null） */
function makeClient(): BotClient {
  return {
    channels: { fetch: async () => null },
  } as unknown as BotClient;
}

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate("authenticate", async (request) => {
    request.authUser = {
      discordUserId: "u1",
      username: "u",
      globalName: null,
      avatar: null,
      guilds: ["g1"],
    };
  });
  app.decorate("requireGuildAccess", async (request) => {
    request.guildId = (request.params as { guildId?: string }).guildId;
  });
  app.setErrorHandler((error, _request, reply) => {
    const mapped = toErrorResponse(error, "internal");
    reply.status(mapped.status).send(mapped.body);
  });
  await app.register(reactionRoleRoutes, {
    prefix: "/guilds",
    deps: { client: makeClient() } as unknown as ApiServerDeps,
  });
  return app;
}

const PANEL = {
  channelId: "c1",
  mode: "toggle",
  title: "ロール",
  description: "選んでね",
  color: "#5865F2",
  buttons: [
    {
      id: "x",
      label: "A",
      emoji: "😀",
      style: "primary",
      roleIds: ["r1", "r2"],
    },
  ],
};

describe("reactionRoleRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await localeManager.initialize();
  });
  beforeEach(async () => {
    h.reset();
    app = await buildApp();
  });
  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET は初期状態で空配列", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/guilds/g1/reaction-roles",
    });
    expect(res.json().data).toEqual([]);
  });

  it("POST で作成し、id・ボタンを契約形で返す", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/guilds/g1/reaction-roles",
      payload: PANEL,
    });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data.id).toBe("rp1");
    expect(data.channelId).toBe("c1");
    expect(data.buttons).toEqual([
      {
        id: "1",
        label: "A",
        emoji: "😀",
        style: "primary",
        roleIds: ["r1", "r2"],
      },
    ]);
  });

  it("channelId 欠落の POST は 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/guilds/g1/reaction-roles",
      payload: { ...PANEL, channelId: null },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH で title を更新する", async () => {
    const created = (
      await app.inject({
        method: "POST",
        url: "/guilds/g1/reaction-roles",
        payload: PANEL,
      })
    ).json().data;
    const res = await app.inject({
      method: "PATCH",
      url: `/guilds/g1/reaction-roles/${created.id}`,
      payload: { title: "新タイトル" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.title).toBe("新タイトル");
  });

  it("存在しない id の PATCH は 404", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/guilds/g1/reaction-roles/ghost",
      payload: { title: "x" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("DELETE で削除し、GET が空になる", async () => {
    const created = (
      await app.inject({
        method: "POST",
        url: "/guilds/g1/reaction-roles",
        payload: PANEL,
      })
    ).json().data;
    const del = await app.inject({
      method: "DELETE",
      url: `/guilds/g1/reaction-roles/${created.id}`,
    });
    expect(del.json().data).toEqual({ id: created.id });
    const list = await app.inject({
      method: "GET",
      url: "/guilds/g1/reaction-roles",
    });
    expect(list.json().data).toEqual([]);
  });
});
