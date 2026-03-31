// tests/unit/shared/features/reaction-role/reactionRolePanelConfigService.test.ts
import {
  createReactionRolePanelConfigService,
  ReactionRolePanelConfigService,
} from "@/shared/features/reaction-role/reactionRolePanelConfigService";

const createRepositoryMock = () => ({
  findById: vi.fn(),
  findAllByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteAllByGuild: vi.fn(),
});

// ReactionRolePanelConfigService が各メソッドを IReactionRolePanelRepository へ正しく委譲することを検証する
describe("shared/features/reaction-role/reactionRolePanelConfigService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findById がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new ReactionRolePanelConfigService(repository as never);
    const expected = { id: "panel-1", guildId: "guild-1" };
    repository.findById.mockResolvedValue(expected);

    const result = await service.findById("panel-1");

    expect(repository.findById).toHaveBeenCalledWith("panel-1");
    expect(result).toBe(expected);
  });

  it("findAllByGuild がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new ReactionRolePanelConfigService(repository as never);
    const expected = [{ id: "panel-1", guildId: "guild-1" }];
    repository.findAllByGuild.mockResolvedValue(expected);

    const result = await service.findAllByGuild("guild-1");

    expect(repository.findAllByGuild).toHaveBeenCalledWith("guild-1");
    expect(result).toBe(expected);
  });

  it("create がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new ReactionRolePanelConfigService(repository as never);
    const data = { guildId: "guild-1", channelId: "ch-1", messageId: "msg-1" };
    const expected = { ...data, id: "panel-1" };
    repository.create.mockResolvedValue(expected);

    const result = await service.create(data as never);

    expect(repository.create).toHaveBeenCalledWith(data);
    expect(result).toBe(expected);
  });

  it("update がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new ReactionRolePanelConfigService(repository as never);
    const data = { title: "Updated Title" };
    const expected = { id: "panel-1", guildId: "guild-1", ...data };
    repository.update.mockResolvedValue(expected);

    const result = await service.update("panel-1", data as never);

    expect(repository.update).toHaveBeenCalledWith("panel-1", data);
    expect(result).toBe(expected);
  });

  it("delete がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new ReactionRolePanelConfigService(repository as never);
    repository.delete.mockResolvedValue(undefined);

    await service.delete("panel-1");

    expect(repository.delete).toHaveBeenCalledWith("panel-1");
  });

  it("deleteAllByGuild がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new ReactionRolePanelConfigService(repository as never);
    repository.deleteAllByGuild.mockResolvedValue(3);

    const result = await service.deleteAllByGuild("guild-1");

    expect(repository.deleteAllByGuild).toHaveBeenCalledWith("guild-1");
    expect(result).toBe(3);
  });

  it("createReactionRolePanelConfigService ファクトリ関数がインスタンスを生成すること", () => {
    const repository = createRepositoryMock();
    const service = createReactionRolePanelConfigService(repository as never);

    expect(service).toBeInstanceOf(ReactionRolePanelConfigService);
  });
});
