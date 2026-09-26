// チケットパネル CRUD ルートの統合的ユニットテスト。
// 設定サービス・ticket リポジトリをインメモリでモックし、Discord 副作用は無効化する。

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
  const byCategory = new Map<string, any>();
  return {
    reset: () => byCategory.clear(),
    service: {
      findAllByGuild: async () => [...byCategory.values()],
      findByGuildAndCategory: async (_g: string, c: string) =>
        byCategory.get(c) ?? null,
      create: async (config: any) => {
        byCategory.set(config.categoryId, config);
        return config;
      },
      update: async (_g: string, c: string, data: any) => {
        const row = byCategory.get(c);
        Object.assign(row, data);
        return row;
      },
      delete: async (_g: string, c: string) => {
        byCategory.delete(c);
      },
    },
    repo: {
      findOpenByCategory: vi.fn(async () => [] as unknown[]),
    },
    resumeAutoDeleteForCategory: vi.fn(async () => undefined),
  };
});

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketSettingsService: () => h.service,
  getBotTicketRepository: () => h.repo,
}));

vi.mock("@/features/ticket/services/ticketAutoDeleteService", () => ({
  resumeAutoDeleteForCategory: h.resumeAutoDeleteForCategory,
}));

import { toErrorResponse } from "@/api/lib/httpError";
import { ticketRoutes } from "@/api/routes/tickets";
import type { ApiServerDeps } from "@/api/types";
import type { BotClient } from "@/bot/client";
import { localeManager } from "@/shared/locale/localeManager";

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
  await app.register(ticketRoutes, {
    prefix: "/guilds",
    deps: { client: makeClient() } as unknown as ApiServerDeps,
  });
  return app;
}

const PANEL = {
  categoryId: "cat1",
  channelId: "c1",
  staffRoleIds: ["r1"],
  title: "サポート",
  description: "説明",
  color: "#00A8F3",
  autoDeleteDays: 7,
  maxTicketsPerUser: 1,
};

describe("ticketRoutes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    await localeManager.initialize();
  });
  beforeEach(async () => {
    h.reset();
    vi.clearAllMocks();
    h.repo.findOpenByCategory.mockResolvedValue([]);
    app = await buildApp();
  });
  afterEach(async () => {
    if (app) await app.close();
  });

  it("GET は初期状態で空配列", async () => {
    const res = await app.inject({ method: "GET", url: "/guilds/g1/tickets" });
    expect(res.json().data).toEqual([]);
  });

  it("POST で作成し、id=categoryId・openCount=0 を返す", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/guilds/g1/tickets",
      payload: PANEL,
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data).toEqual({ ...PANEL, id: "cat1", openCount: 0 });
  });

  it("POST でパネルを作り直すと、そのカテゴリの残っていたチケットの自動削除を再開し、オープン件数も返す", async () => {
    // パネル削除後も残っていた（孤立していた）オープン中のチケットが2件ある
    h.repo.findOpenByCategory.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);

    const res = await app.inject({
      method: "POST",
      url: "/guilds/g1/tickets",
      payload: PANEL,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().data.openCount).toBe(2);
    expect(h.resumeAutoDeleteForCategory).toHaveBeenCalledTimes(1);
    expect(h.resumeAutoDeleteForCategory).toHaveBeenCalledWith(
      "g1",
      "cat1",
      expect.anything(),
      h.repo,
    );
  });

  it("同一カテゴリの再 POST は 409 CONFLICT", async () => {
    await app.inject({
      method: "POST",
      url: "/guilds/g1/tickets",
      payload: PANEL,
    });
    const res = await app.inject({
      method: "POST",
      url: "/guilds/g1/tickets",
      payload: PANEL,
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("CONFLICT");
  });

  it("categoryId 欠落の POST は 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/guilds/g1/tickets",
      payload: { ...PANEL, categoryId: null },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("PATCH で title を更新する", async () => {
    await app.inject({
      method: "POST",
      url: "/guilds/g1/tickets",
      payload: PANEL,
    });
    const res = await app.inject({
      method: "PATCH",
      url: "/guilds/g1/tickets/cat1",
      payload: { title: "新タイトル" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.title).toBe("新タイトル");
  });

  it("存在しないカテゴリの PATCH は 404", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/guilds/g1/tickets/ghost",
      payload: { title: "x" },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe("NOT_FOUND");
  });

  it("DELETE で削除し、GET が空になる", async () => {
    await app.inject({
      method: "POST",
      url: "/guilds/g1/tickets",
      payload: PANEL,
    });
    const del = await app.inject({
      method: "DELETE",
      url: "/guilds/g1/tickets/cat1",
    });
    expect(del.json().data).toEqual({ id: "cat1" });
    const list = await app.inject({ method: "GET", url: "/guilds/g1/tickets" });
    expect(list.json().data).toEqual([]);
  });
});
