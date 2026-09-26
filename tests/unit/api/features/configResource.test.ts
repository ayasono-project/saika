// ギルド共通設定リソース（/api/guilds/:guildId/config）のユニットテスト

import Fastify, { type FastifyInstance } from "fastify";

const invalidateLocaleCacheMock = vi.hoisted(() => vi.fn());
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: vi.fn((...args: unknown[]) => String(args[1])),
  tDefault: vi.fn((key: string) => key),
  localeManager: { invalidateLocaleCache: invalidateLocaleCacheMock },
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// DB（Prisma）だけをモックし、サービス・リポジトリ・シリアライザーは実物を通す
const prismaMock = vi.hoisted(() => ({
  guildSettings: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
  },
}));

const serviceHolder = vi.hoisted(() => ({ current: undefined as unknown }));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildSettingsService: () => serviceHolder.current,
}));

import { createConfigResource } from "@/api/features/configResource";
import { registerSettingsResource } from "@/api/routes/settingsResource";
import { GuildCoreRepository } from "@/features/guild-settings/guildCoreRepository";
import { createGuildSettingsService } from "@/features/guild-settings/guildSettingsService";

/**
 * 認可を素通しにした Fastify に config リソースだけを登録する
 * @returns 組み立てたアプリ
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  app.decorate("authenticate", async () => {});
  app.decorate("requireGuildAccess", async (request) => {
    request.guildId = (request.params as { guildId?: string }).guildId;
  });
  registerSettingsResource(app, createConfigResource(prismaMock as never));
  return app;
}

// config リソースの reset・patch が、DB へ渡す値まで正しいことを検証
describe("api/features/configResource", () => {
  let app: FastifyInstance;

  // 各ケースでモックを初期化し、実サービス（DB だけモック）を委譲先にする
  beforeEach(async () => {
    vi.clearAllMocks();
    prismaMock.guildSettings.upsert.mockResolvedValue(undefined);
    serviceHolder.current = createGuildSettingsService(
      new GuildCoreRepository(prismaMock as never),
      { deleteAllSettings: vi.fn() },
    );
    app = await buildApp();
  });

  // Fastify インスタンスをケースごとに閉じる
  afterEach(async () => {
    await app.close();
  });

  // undefined を渡すと update から落ち、成功を返した後もエラー通知チャンネルが残っていた
  it("POST /reset はエラー通知チャンネルの設定を null で DB から消し、ロケールキャッシュを無効化する", async () => {
    const res = await app.inject({ method: "POST", url: "/g1/config/reset" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      data: { locale: "ja", errorChannelId: null },
    });
    expect(prismaMock.guildSettings.upsert).toHaveBeenCalledWith({
      where: { guildId: "g1" },
      update: { locale: "ja", errorChannelId: null },
      create: { guildId: "g1", locale: "ja", errorChannelId: null },
    });
    expect(invalidateLocaleCacheMock).toHaveBeenCalledWith("g1");
  });

  it("PATCH で errorChannelId: null を送るとエラー通知チャンネルの設定を消し、locale には触れない", async () => {
    prismaMock.guildSettings.findUnique.mockResolvedValue({
      id: "id-1",
      guildId: "g1",
      locale: "en",
      errorChannelId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await app.inject({
      method: "PATCH",
      url: "/g1/config",
      payload: { errorChannelId: null },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      data: { locale: "en", errorChannelId: null },
    });
    expect(prismaMock.guildSettings.upsert).toHaveBeenCalledWith({
      where: { guildId: "g1" },
      update: { errorChannelId: null },
      create: { guildId: "g1", locale: "ja", errorChannelId: null },
    });
    expect(invalidateLocaleCacheMock).not.toHaveBeenCalled();
  });
});
