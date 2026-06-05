// tests/unit/api/settingsResource.test.ts
// 設定リソース共通ルートファクトリのユニットテスト

import Fastify, { type FastifyInstance } from "fastify";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { toErrorResponse } from "@/api/lib/httpError";
import {
  registerSettingsResource,
  type SettingsResource,
} from "@/api/routes/settingsResource";
import { localeManager } from "@/shared/locale/localeManager";

interface Demo {
  value: number;
}

/** メモリ上で read/patch/reset を実装する疑似リソース */
function makeResource(store: { current: Demo }): SettingsResource<Demo> {
  return {
    path: "demo",
    async read() {
      return store.current;
    },
    async patch(_guildId, body) {
      store.current = { ...store.current, ...body };
      return store.current;
    },
    async reset() {
      store.current = { value: 0 };
      return store.current;
    },
  };
}

async function buildApp(store: { current: Demo }): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate("authenticate", async () => {});
  app.decorate("requireGuildAccess", async (request) => {
    request.guildId = (request.params as { guildId?: string }).guildId;
  });
  app.setErrorHandler((error, _request, reply) => {
    const mapped = toErrorResponse(error, "internal");
    reply.status(mapped.status).send(mapped.body);
  });
  registerSettingsResource(app, makeResource(store));
  return app;
}

describe("registerSettingsResource", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await localeManager.initialize();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET は現在値を data 封筒で返す", async () => {
    app = await buildApp({ current: { value: 7 } });
    const res = await app.inject({ method: "GET", url: "/g1/demo" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { value: 7 } });
  });

  it("PATCH は部分更新を適用して返す", async () => {
    app = await buildApp({ current: { value: 1 } });
    const res = await app.inject({
      method: "PATCH",
      url: "/g1/demo",
      payload: { value: 42 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { value: 42 } });
  });

  it("POST /reset はデフォルトへ戻す", async () => {
    app = await buildApp({ current: { value: 99 } });
    const res = await app.inject({ method: "POST", url: "/g1/demo/reset" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ data: { value: 0 } });
  });
});
