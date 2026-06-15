// tests/unit/features/reaction-role/reactionRolePanelRepository.test.ts
import type { Mock } from "vitest";

const executeWithDatabaseErrorMock: Mock = vi.fn(async (fn: () => unknown) =>
  fn(),
);

vi.mock("@/shared/utils/errorHandling", () => ({
  executeWithDatabaseError: executeWithDatabaseErrorMock,
}));

function createPrismaMock(): {
  guildReactionRolePanel: {
    delete: Mock;
    deleteMany: Mock;
  };
} {
  return {
    guildReactionRolePanel: {
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  };
}

describe("features/reaction-role/reactionRolePanelRepository", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    executeWithDatabaseErrorMock.mockImplementation(async (fn: () => unknown) =>
      fn(),
    );
  });

  async function loadModule() {
    return import("@/features/reaction-role/reactionRolePanelRepository");
  }

  it("delete は deleteMany に委譲し冪等（0 件マッチでも例外を投げない）", async () => {
    const prisma = createPrismaMock();
    // 既削除を模す: count:0 を返しても例外を投げない
    prisma.guildReactionRolePanel.deleteMany.mockResolvedValue({ count: 0 });

    const { ReactionRolePanelRepository } = await loadModule();
    const repo = new ReactionRolePanelRepository(prisma as never);

    await expect(repo.delete("missing-id")).resolves.toBeUndefined();
    expect(prisma.guildReactionRolePanel.deleteMany).toHaveBeenCalledWith({
      where: { id: "missing-id" },
    });
    // delete（単数）は使わない＝P2025 を投げない設計
    expect(prisma.guildReactionRolePanel.delete).not.toHaveBeenCalled();
  });
});
