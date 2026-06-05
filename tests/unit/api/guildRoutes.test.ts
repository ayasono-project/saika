// tests/unit/api/guildRoutes.test.ts
// ギルド/Discord リソースルート（/api/guilds 配下）の統合的ユニットテスト

import { ChannelType } from "discord.js";
import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { toErrorResponse } from "@/api/lib/httpError";
import { guildRoutes } from "@/api/routes/guilds";
import type { ApiServerDeps } from "@/api/types";
import type { BotClient } from "@/bot/client";
import { localeManager } from "@/shared/locale/localeManager";

const USER_ID = "u1";

/** チャンネル/ロール/メンバーを備えた疑似ギルド */
function fakeGuild(id: string) {
  return {
    id,
    name: "Bot Guild",
    iconURL: () => null,
    memberCount: 5,
    channels: {
      cache: new Map([
        ["c1", { id: "c1", name: "general", type: ChannelType.GuildText }],
        ["v1", { id: "v1", name: "VC", type: ChannelType.GuildVoice }],
        ["t1", { id: "t1", name: "thread", type: ChannelType.PublicThread }],
      ]),
    },
    roles: {
      cache: new Map([
        [
          id,
          { id, name: "@everyone", color: 0, hexColor: "#000000", position: 0 },
        ],
        [
          "r1",
          { id: "r1", name: "Mod", color: 1, hexColor: "#000001", position: 2 },
        ],
        [
          "r2",
          { id: "r2", name: "VIP", color: 0, hexColor: "#000000", position: 1 },
        ],
      ]),
    },
    members: {
      cache: new Map([["m1", { id: "m1", displayName: "Alice" }]]),
    },
  };
}

function makeClient(guilds: Map<string, unknown>): BotClient {
  return { guilds: { cache: guilds } } as unknown as BotClient;
}

async function buildApp(client: BotClient): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  // 認証は本ユニットの対象外のためデコレータをスタブ化する
  app.decorate("authenticate", async (request) => {
    request.authUser = {
      discordUserId: USER_ID,
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
  const deps = { client } as unknown as ApiServerDeps;
  await app.register(guildRoutes, {
    prefix: "/guilds",
    deps,
  });
  return app;
}

describe("guildRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await localeManager.initialize();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /:guildId/channels は対象種別のみ返す（thread 除外）", async () => {
    app = await buildApp(makeClient(new Map([["g1", fakeGuild("g1")]])));
    const res = await app.inject({ method: "GET", url: "/guilds/g1/channels" });
    expect(res.statusCode).toBe(200);
    const data = res.json().data;
    expect(data).toEqual([
      { id: "c1", name: "general", type: "text" },
      { id: "v1", name: "VC", type: "voice" },
    ]);
  });

  it("GET /:guildId/roles は @everyone を除外し位置降順", async () => {
    app = await buildApp(makeClient(new Map([["g1", fakeGuild("g1")]])));
    const res = await app.inject({ method: "GET", url: "/guilds/g1/roles" });
    const data = res.json().data;
    expect(data.map((r: { id: string }) => r.id)).toEqual(["r1", "r2"]);
    expect(data[1].color).toBeNull();
  });

  it("GET /:guildId/members はメンバーを返す", async () => {
    app = await buildApp(makeClient(new Map([["g1", fakeGuild("g1")]])));
    const res = await app.inject({ method: "GET", url: "/guilds/g1/members" });
    expect(res.json().data).toEqual([{ id: "m1", name: "Alice" }]);
  });

  it("Bot 未参加ギルドは 404 を返す", async () => {
    app = await buildApp(makeClient(new Map()));
    const res = await app.inject({
      method: "GET",
      url: "/guilds/ghost/channels",
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("GET /guilds/joined は管理可能ギルドのうち Bot 参加分の ID を返す", async () => {
    // authenticate スタブのクレームは guilds=["g1"]。Bot が g1 に参加していれば返る。
    app = await buildApp(makeClient(new Map([["g1", fakeGuild("g1")]])));
    const res = await app.inject({ method: "GET", url: "/guilds/joined" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual(["g1"]);
  });

  it("GET /guilds/joined は Bot 未参加なら空配列", async () => {
    app = await buildApp(makeClient(new Map()));
    const res = await app.inject({ method: "GET", url: "/guilds/joined" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual([]);
  });
});
