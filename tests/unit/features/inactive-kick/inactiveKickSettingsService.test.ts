// tests/unit/features/inactive-kick/inactiveKickSettingsService.test.ts

import { DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS } from "@/features/inactive-kick/inactiveKickSettingsDefaults";
import { createInactiveKickSettingsService } from "@/features/inactive-kick/inactiveKickSettingsService";
import type {
  IInactiveKickSettingsRepository,
  InactiveKickSettings,
} from "@/shared/database/types";

/** インメモリのフェイクリポジトリ */
function createFakeRepository(): IInactiveKickSettingsRepository & {
  store: Map<string, InactiveKickSettings>;
} {
  const store = new Map<string, InactiveKickSettings>();
  return {
    store,
    async getInactiveKickSettings(guildId) {
      return store.get(guildId) ?? null;
    },
    async updateInactiveKickSettings(guildId, settings) {
      store.set(guildId, settings);
    },
    async getAllEnabled() {
      return [...store.entries()]
        .filter(([, s]) => s.enabled)
        .map(([guildId, s]) => ({ guildId, ...s }));
    },
    async deleteInactiveKickSettings(guildId) {
      store.delete(guildId);
    },
    async updateLastRunDate(_guildId: string, _date: string) {},
  };
}

const GUILD = "g1";

describe("inactive-kick/InactiveKickSettingsService", () => {
  it("getSettingsOrDefault は未設定時にデフォルトを返す", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(false);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);
    expect(settings.whitelistRoleIds).toEqual([]);
  });

  it("enable は enabled=true と enabledAt を設定する", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    const now = new Date(2026, 0, 15);
    await service.enable(GUILD, now);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(true);
    expect(settings.enabledAt).toEqual(now);
  });

  it("disable は enabledAt を据え置きつつ enabled=false にする", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    const now = new Date(2026, 0, 15);
    await service.enable(GUILD, now);
    await service.disable(GUILD);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(false);
    expect(settings.enabledAt).toEqual(now);
  });

  it("whitelist ロール追加は冪等（重複追加は false）", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    expect(await service.addWhitelistRole(GUILD, "r1")).toBe(true);
    expect(await service.addWhitelistRole(GUILD, "r1")).toBe(false);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.whitelistRoleIds).toEqual(["r1"]);
  });

  it("whitelist ユーザー削除は未登録なら false", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    expect(await service.removeWhitelistUser(GUILD, "u1")).toBe(false);
    await service.addWhitelistUser(GUILD, "u1");
    expect(await service.removeWhitelistUser(GUILD, "u1")).toBe(true);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.whitelistUserIds).toEqual([]);
  });

  it("removeFromWhitelist はロール・ユーザーを一括削除し件数を返す", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.addWhitelistRole(GUILD, "r1");
    await service.addWhitelistRole(GUILD, "r2");
    await service.addWhitelistUser(GUILD, "u1");

    const removed = await service.removeFromWhitelist(GUILD, ["r1"], ["u1"]);
    expect(removed).toBe(2);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.whitelistRoleIds).toEqual(["r2"]);
    expect(settings.whitelistUserIds).toEqual([]);
  });

  it("removeFromWhitelist は該当なしなら 0 を返し更新しない", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.addWhitelistRole(GUILD, "r1");
    const removed = await service.removeFromWhitelist(GUILD, ["x"], ["y"]);
    expect(removed).toBe(0);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.whitelistRoleIds).toEqual(["r1"]);
  });

  it("setTier / setMarkerRole / clearMarkerRole が反映される", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.setTier(GUILD, 0, { thresholdDays: 90 });
    await service.setMarkerRole(GUILD, "role-x");
    let settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: 90,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);
    expect(settings.markerRoleId).toBe("role-x");

    await service.clearMarkerRole(GUILD);
    settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.markerRoleId).toBeUndefined();
  });

  it("setTier は新しい tenureDays を追加し、既存 tenureDays は上書きする", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.setTier(GUILD, 30, { thresholdDays: 60 });
    await service.setTier(GUILD, 0, { thresholdDays: 14 });
    let settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: 14,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
      {
        tenureDays: 30,
        thresholdDays: 60,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);

    await service.setTier(GUILD, 30, { thresholdDays: 90 });
    settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: 14,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
      {
        tenureDays: 30,
        thresholdDays: 90,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);
  });

  it("setTier は省略したフィールドについて既存階層の値を維持する", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.setTier(GUILD, 0, {
      thresholdDays: 30,
      trackVoice: false,
      minMessageCount: 5,
    });
    await service.setTier(GUILD, 0, { thresholdDays: 45 });
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: 45,
        trackMessage: true,
        trackVoice: false,
        trackReaction: true,
        minMessageCount: 5,
      },
    ]);
  });

  it("removeTier は最後の1件を削除できない", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.setTier(GUILD, 30, { thresholdDays: 60 });
    expect(await service.removeTier(GUILD, 30)).toBe(true);
    expect(await service.removeTier(GUILD, 0)).toBe(false);
    expect(await service.removeTier(GUILD, 999)).toBe(false);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);
  });

  it("removeTiers は複数件を一括削除し、実際に削除した件数を返す", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.setTier(GUILD, 15, { thresholdDays: 30 });
    await service.setTier(GUILD, 30, { thresholdDays: 60 });
    expect(await service.removeTiers(GUILD, [15, 30])).toBe(2);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);
    // 既に無い在籍日数は無視され、削除件数に含まれない
    expect(await service.removeTiers(GUILD, [999])).toBe(0);
  });

  it("removeTiers は全件選択されても最低1件（在籍日数が最小のもの）を残す", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.setTier(GUILD, 15, { thresholdDays: 30 });
    await service.setTier(GUILD, 30, { thresholdDays: 60 });
    const removed = await service.removeTiers(GUILD, [0, 15, 30]);
    expect(removed).toBe(2);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);
  });

  it("reset はデフォルトへ戻す", async () => {
    const repo = createFakeRepository();
    const service = createInactiveKickSettingsService(repo);
    await service.enable(GUILD, new Date());
    await service.setTier(GUILD, 0, { thresholdDays: 200 });
    await service.addWhitelistRole(GUILD, "r1");

    await service.reset(GUILD);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(false);
    expect(settings.enabledAt).toBeUndefined();
    expect(settings.tiers).toEqual([
      {
        tenureDays: 0,
        thresholdDays: DEFAULT_INACTIVE_KICK_THRESHOLD_DAYS,
        trackMessage: true,
        trackVoice: true,
        trackReaction: true,
      },
    ]);
    expect(settings.whitelistRoleIds).toEqual([]);
  });

  it("getAllEnabled は有効なギルドのみ返す", async () => {
    const service = createInactiveKickSettingsService(createFakeRepository());
    await service.enable("g1", new Date());
    await service.setTier("g2", 0, { thresholdDays: 60 }); // 無効のまま
    const enabled = await service.getAllEnabled();
    expect(enabled.map((s) => s.guildId)).toEqual(["g1"]);
  });
});
