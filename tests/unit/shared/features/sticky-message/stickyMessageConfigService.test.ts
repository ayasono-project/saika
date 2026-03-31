// tests/unit/shared/features/sticky-message/stickyMessageConfigService.test.ts
import type { Mock } from "vitest";

function createRepoMock(): {
  findByChannel: Mock;
  findAllByGuild: Mock;
  create: Mock;
  updateLastMessageId: Mock;
  updateContent: Mock;
  delete: Mock;
  deleteByChannel: Mock;
} {
  return {
    findByChannel: vi.fn(),
    findAllByGuild: vi.fn(),
    create: vi.fn(),
    updateLastMessageId: vi.fn(),
    updateContent: vi.fn(),
    delete: vi.fn(),
    deleteByChannel: vi.fn(),
  };
}

// StickyMessageConfigService の各メソッドがリポジトリへ正しい引数を委譲するか、
// およびシングルトン管理関数（set/get/create）のライフサイクルが正しく機能するかを検証する
describe("shared/features/sticky-message/stickyMessageConfigService", () => {
  // vi.resetModules でモジュールを再評価し、テスト間でシングルトン状態が持ち越されないようにする
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function loadModule() {
    return import(
      "@/shared/features/sticky-message/stickyMessageConfigService"
    );
  }

  it("findByChannel がリポジトリへ委譲すること", async () => {
    const repo = createRepoMock();
    const expected = { id: "s1", channelId: "ch-1", content: "hello" };
    repo.findByChannel.mockResolvedValue(expected);

    const { StickyMessageConfigService } = await loadModule();
    const service = new StickyMessageConfigService(repo as never);
    const result = await service.findByChannel("ch-1");

    expect(repo.findByChannel).toHaveBeenCalledWith("ch-1");
    expect(result).toBe(expected);
  });

  it("findAllByGuild がリポジトリへ委譲すること", async () => {
    const repo = createRepoMock();
    const expected = [{ id: "s1" }, { id: "s2" }];
    repo.findAllByGuild.mockResolvedValue(expected);

    const { StickyMessageConfigService } = await loadModule();
    const service = new StickyMessageConfigService(repo as never);
    const result = await service.findAllByGuild("guild-1");

    expect(repo.findAllByGuild).toHaveBeenCalledWith("guild-1");
    expect(result).toBe(expected);
  });

  it("create が全引数をリポジトリへ委譲すること", async () => {
    const repo = createRepoMock();
    const expected = { id: "s1" };
    repo.create.mockResolvedValue(expected);

    const { StickyMessageConfigService } = await loadModule();
    const service = new StickyMessageConfigService(repo as never);
    const result = await service.create(
      "g1",
      "ch-1",
      "content",
      '{"title":"t"}',
      "user-1",
    );

    expect(repo.create).toHaveBeenCalledWith(
      "g1",
      "ch-1",
      "content",
      '{"title":"t"}',
      "user-1",
    );
    expect(result).toBe(expected);
  });

  it("updateLastMessageId がリポジトリへ委譲すること", async () => {
    const repo = createRepoMock();
    repo.updateLastMessageId.mockResolvedValue(undefined);

    const { StickyMessageConfigService } = await loadModule();
    const service = new StickyMessageConfigService(repo as never);
    await service.updateLastMessageId("s1", "msg-id");

    expect(repo.updateLastMessageId).toHaveBeenCalledWith("s1", "msg-id");
  });

  it("updateContent がリポジトリへ委譲すること", async () => {
    const repo = createRepoMock();
    const expected = { id: "s1", content: "new" };
    repo.updateContent.mockResolvedValue(expected);

    const { StickyMessageConfigService } = await loadModule();
    const service = new StickyMessageConfigService(repo as never);
    const result = await service.updateContent("s1", "new", null, "user-1");

    expect(repo.updateContent).toHaveBeenCalledWith(
      "s1",
      "new",
      null,
      "user-1",
    );
    expect(result).toBe(expected);
  });

  it("delete がリポジトリへ委譲すること", async () => {
    const repo = createRepoMock();
    repo.delete.mockResolvedValue(undefined);

    const { StickyMessageConfigService } = await loadModule();
    const service = new StickyMessageConfigService(repo as never);
    await service.delete("s1");

    expect(repo.delete).toHaveBeenCalledWith("s1");
  });

  it("deleteByChannel がリポジトリへ委譲すること", async () => {
    const repo = createRepoMock();
    repo.deleteByChannel.mockResolvedValue(0);

    const { StickyMessageConfigService } = await loadModule();
    const service = new StickyMessageConfigService(repo as never);
    await service.deleteByChannel("ch-1");

    expect(repo.deleteByChannel).toHaveBeenCalledWith("ch-1");
  });

  it("createStickyMessageConfigService が新しいサービスインスタンスを返すこと", async () => {
    const repo = createRepoMock();
    const { createStickyMessageConfigService, StickyMessageConfigService } =
      await loadModule();

    const service = createStickyMessageConfigService(repo as never);
    expect(service).toBeInstanceOf(StickyMessageConfigService);
  });
});
