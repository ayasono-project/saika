// tests/unit/api/botRoutes.test.ts
// Bot 情報ルート（GET /api/bot）のユニットテスト。

import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { botRoutes } from "@/api/routes/bot";
import type { ApiServerDeps } from "@/api/types";

async function makeApp(user: unknown): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  const client = {
    user,
    generateInvite: () =>
      "https://discord.com/oauth2/authorize?client_id=bot-1",
  };
  const deps = { client } as unknown as ApiServerDeps;
  await app.register(botRoutes, { deps });
  return app;
}

describe("botRoutes", () => {
  let app: FastifyInstance;
  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET /bot は Bot の id/username/avatarUrl を返す", async () => {
    app = await makeApp({
      id: "bot-1",
      username: "Saika",
      displayAvatarURL: () => "https://cdn/avatar.png",
    });
    const res = await app.inject({ method: "GET", url: "/bot" });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({
      id: "bot-1",
      username: "Saika",
      avatarUrl: "https://cdn/avatar.png",
      inviteUrl: "https://discord.com/oauth2/authorize?client_id=bot-1",
    });
  });

  it("client.user が未準備でも既定値を返す", async () => {
    app = await makeApp(null);
    const res = await app.inject({ method: "GET", url: "/bot" });
    expect(res.json().data).toEqual({
      id: null,
      username: "Saika",
      avatarUrl: null,
      inviteUrl: "https://discord.com/oauth2/authorize?client_id=bot-1",
    });
  });
});
