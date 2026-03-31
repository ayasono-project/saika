// tests/unit/shared/features/ticket/ticketConfigService.test.ts
import {
  createTicketConfigService,
  TicketConfigService,
} from "@/shared/features/ticket/ticketConfigService";

const createRepositoryMock = () => ({
  findByGuildAndCategory: vi.fn(),
  findAllByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteAllByGuild: vi.fn(),
  incrementCounter: vi.fn(),
});

// TicketConfigService が各メソッドを IGuildTicketConfigRepository へ正しく委譲することを検証する
describe("shared/features/ticket/ticketConfigService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findByGuildAndCategory がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new TicketConfigService(repository as never);
    const expected = { guildId: "guild-1", categoryId: "cat-1" };
    repository.findByGuildAndCategory.mockResolvedValue(expected);

    const result = await service.findByGuildAndCategory("guild-1", "cat-1");

    expect(repository.findByGuildAndCategory).toHaveBeenCalledWith(
      "guild-1",
      "cat-1",
    );
    expect(result).toBe(expected);
  });

  it("findAllByGuild がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new TicketConfigService(repository as never);
    const expected = [{ guildId: "guild-1" }];
    repository.findAllByGuild.mockResolvedValue(expected);

    const result = await service.findAllByGuild("guild-1");

    expect(repository.findAllByGuild).toHaveBeenCalledWith("guild-1");
    expect(result).toBe(expected);
  });

  it("create がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new TicketConfigService(repository as never);
    const config = { guildId: "guild-1", categoryId: "cat-1" };
    const expected = { ...config, id: 1 };
    repository.create.mockResolvedValue(expected);

    const result = await service.create(config as never);

    expect(repository.create).toHaveBeenCalledWith(config);
    expect(result).toBe(expected);
  });

  it("update がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new TicketConfigService(repository as never);
    const data = { staffRoleIds: "[]" };
    const expected = { guildId: "guild-1", categoryId: "cat-1", ...data };
    repository.update.mockResolvedValue(expected);

    const result = await service.update("guild-1", "cat-1", data as never);

    expect(repository.update).toHaveBeenCalledWith("guild-1", "cat-1", data);
    expect(result).toBe(expected);
  });

  it("delete がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new TicketConfigService(repository as never);
    repository.delete.mockResolvedValue(undefined);

    await service.delete("guild-1", "cat-1");

    expect(repository.delete).toHaveBeenCalledWith("guild-1", "cat-1");
  });

  it("deleteAllByGuild がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new TicketConfigService(repository as never);
    repository.deleteAllByGuild.mockResolvedValue(3);

    const result = await service.deleteAllByGuild("guild-1");

    expect(repository.deleteAllByGuild).toHaveBeenCalledWith("guild-1");
    expect(result).toBe(3);
  });

  it("incrementCounter がリポジトリへ委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new TicketConfigService(repository as never);
    repository.incrementCounter.mockResolvedValue(42);

    const result = await service.incrementCounter("guild-1", "cat-1");

    expect(repository.incrementCounter).toHaveBeenCalledWith(
      "guild-1",
      "cat-1",
    );
    expect(result).toBe(42);
  });

  it("createTicketConfigService ファクトリ関数がインスタンスを生成すること", () => {
    const repository = createRepositoryMock();
    const service = createTicketConfigService(repository as never);

    expect(service).toBeInstanceOf(TicketConfigService);
  });
});
