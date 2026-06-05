// tests/unit/api/stickyRoutes.test.ts
// sticky コレクション CRUD ルート（/api/guilds/:guildId/sticky）の統合的ユニットテスト。
// Composition Root の sticky サービスをインメモリ実装でモックする。

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
  type Row = {
    id: string;
    guildId: string;
    channelId: string;
    content: string;
    embedData: { title?: string; description?: string; color?: number } | null;
    updatedBy: string | null;
    lastMessageId: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  const items: Row[] = [];
  let seq = 0;
  return {
    items,
    reset: () => {
      items.length = 0;
      seq = 0;
    },
    service: {
      findAllByGuild: async (g: string) => items.filter((i) => i.guildId === g),
      findByChannel: async (c: string) =>
        items.find((i) => i.channelId === c) ?? null,
      create: async (
        guildId: string,
        channelId: string,
        content: string,
        embedData?: Row["embedData"],
      ) => {
        const row: Row = {
          id: `st${++seq}`,
          guildId,
          channelId,
          content,
          embedData: embedData ?? null,
          updatedBy: null,
          lastMessageId: null,
          createdAt: new Date(0),
          updatedAt: new Date(0),
        };
        items.push(row);
        return row;
      },
      updateContent: async (
        id: string,
        content: string,
        embedData: Row["embedData"],
      ) => {
        const row = items.find((i) => i.id === id);
        if (!row) throw new Error("not found");
        row.content = content;
        row.embedData = embedData;
        return row;
      },
      delete: async (id: string) => {
        const idx = items.findIndex((i) => i.id === id);
        if (idx >= 0) items.splice(idx, 1);
      },
      updateLastMessageId: async () => {},
    },
  };
});

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageSettingsService: () => h.service,
}));

import { toErrorResponse } from "@/api/lib/httpError";
import { stickyRoutes } from "@/api/routes/sticky";
import type { ApiServerDeps } from "@/api/types";
import type { BotClient } from "@/bot/client";
import { localeManager } from "@/shared/locale/localeManager";

/** Discord 副作用を no-op にするための空キャッシュ Client */
function makeClient(): BotClient {
  return { guilds: { cache: new Map() } } as unknown as BotClient;
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
  await app.register(stickyRoutes, {
    prefix: "/guilds",
    deps: { client: makeClient() } as unknown as ApiServerDeps,
  });
  return app;
}

describe("stickyRoutes", () => {
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
    const res = await app.inject({ method: "GET", url: "/guilds/g1/sticky" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });

  it("POST で作成し、GET で取得できる（embed なし）", async () => {
    const body = { channelId: "c1", content: "hello", embed: null };
    const post = await app.inject({
      method: "POST",
      url: "/guilds/g1/sticky",
      payload: body,
    });
    expect(post.statusCode).toBe(200);
    expect(post.json().data).toEqual(body);

    const list = await app.inject({ method: "GET", url: "/guilds/g1/sticky" });
    expect(list.json().data).toEqual([body]);
  });

  it("POST で embed をラウンドトリップする", async () => {
    const body = {
      channelId: "c2",
      content: "x",
      embed: { title: "T", description: "D", color: "#FF0000", fields: [] },
    };
    const post = await app.inject({
      method: "POST",
      url: "/guilds/g1/sticky",
      payload: body,
    });
    expect(post.json().data).toEqual(body);
  });

  it("同一 channelId の POST は upsert（重複しない）", async () => {
    await app.inject({
      method: "POST",
      url: "/guilds/g1/sticky",
      payload: { channelId: "c1", content: "first", embed: null },
    });
    await app.inject({
      method: "POST",
      url: "/guilds/g1/sticky",
      payload: { channelId: "c1", content: "second", embed: null },
    });
    const list = await app.inject({ method: "GET", url: "/guilds/g1/sticky" });
    expect(list.json().data).toEqual([
      { channelId: "c1", content: "second", embed: null },
    ]);
  });

  it("PATCH で content を部分更新する", async () => {
    await app.inject({
      method: "POST",
      url: "/guilds/g1/sticky",
      payload: { channelId: "c1", content: "old", embed: null },
    });
    const patch = await app.inject({
      method: "PATCH",
      url: "/guilds/g1/sticky/c1",
      payload: { content: "new" },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().data.content).toBe("new");
  });

  it("存在しない channelId の PATCH は 404", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/guilds/g1/sticky/ghost",
      payload: { content: "x" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("DELETE で削除し、GET が空になる", async () => {
    await app.inject({
      method: "POST",
      url: "/guilds/g1/sticky",
      payload: { channelId: "c1", content: "x", embed: null },
    });
    const del = await app.inject({
      method: "DELETE",
      url: "/guilds/g1/sticky/c1",
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().data).toEqual({ channelId: "c1" });
    const list = await app.inject({ method: "GET", url: "/guilds/g1/sticky" });
    expect(list.json().data).toEqual([]);
  });

  it("channelId 欠落の POST は 400 VALIDATION_ERROR", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/guilds/g1/sticky",
      payload: { content: "x", embed: null },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });
});
