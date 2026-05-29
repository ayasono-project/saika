// tests/unit/shared/database/repositories/persistence/guildSettingsReadPersistence.test.ts
import {
  existsGuildSettingsRecord,
  findGuildLocale,
  findGuildSettingsRecord,
} from "@/features/guild-settings/persistence/guildSettingsReadPersistence";

// guildSettingsReadPersistence の各読み取り関数が Prisma の findUnique を
// 正しい引数で呼び出し、取得結果をそのまま返すことを検証する
describe("shared/database/repositories/persistence/guildSettingsReadPersistence", () => {
  const createPrisma = () => ({
    guildSettings: {
      findUnique: vi.fn(),
    },
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("findGuildSettingsRecord が guildId でフルレコードを返すこと", async () => {
    const prisma = createPrisma();
    const record = { guildId: "guild-1", locale: "ja" };
    prisma.guildSettings.findUnique.mockResolvedValue(record);

    await expect(
      findGuildSettingsRecord(prisma as never, "guild-1"),
    ).resolves.toBe(record);
    expect(prisma.guildSettings.findUnique).toHaveBeenCalledWith({
      where: { guildId: "guild-1" },
    });
  });

  // レコードが存在する場合は true、null が返った場合は false になることを
  // 同一テスト内でモックの返却値を切り替えて両方の分岐を確認する
  it("existsGuildSettingsRecord がレコードの有無に応じて true/false を返すこと", async () => {
    const prisma = createPrisma();
    prisma.guildSettings.findUnique.mockResolvedValueOnce({ id: 1 });
    await expect(
      existsGuildSettingsRecord(prisma as never, "guild-1"),
    ).resolves.toBe(true);
    expect(prisma.guildSettings.findUnique).toHaveBeenLastCalledWith({
      where: { guildId: "guild-1" },
      select: { id: true },
    });

    prisma.guildSettings.findUnique.mockResolvedValueOnce(null);
    await expect(
      existsGuildSettingsRecord(prisma as never, "guild-2"),
    ).resolves.toBe(false);
  });

  // select: { locale } で取得したフィールドを返し、レコードがない場合は null を返すことを確認
  it("findGuildLocale がロケールまたは null を返すこと", async () => {
    const prisma = createPrisma();
    prisma.guildSettings.findUnique.mockResolvedValueOnce({ locale: "en" });
    await expect(findGuildLocale(prisma as never, "guild-1")).resolves.toBe(
      "en",
    );

    prisma.guildSettings.findUnique.mockResolvedValueOnce(null);
    await expect(
      findGuildLocale(prisma as never, "guild-2"),
    ).resolves.toBeNull();
  });
});
