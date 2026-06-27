// tests/unit/features/unverified-kick/unverifiedKickSettingsService.test.ts

import { DEFAULT_UNVERIFIED_KICK_GRACE_DAYS } from "@/features/unverified-kick/unverifiedKickSettingsDefaults";
import { createUnverifiedKickSettingsService } from "@/features/unverified-kick/unverifiedKickSettingsService";
import type {
  IUnverifiedKickSettingsRepository,
  UnverifiedKickSettings,
} from "@/shared/database/types";

/** インメモリのフェイクリポジトリ */
function createFakeRepository(): IUnverifiedKickSettingsRepository & {
  store: Map<string, UnverifiedKickSettings>;
} {
  const store = new Map<string, UnverifiedKickSettings>();
  return {
    store,
    async getUnverifiedKickSettings(guildId) {
      return store.get(guildId) ?? null;
    },
    async updateUnverifiedKickSettings(guildId, settings) {
      store.set(guildId, settings);
    },
    async getAllEnabled() {
      return [...store.entries()]
        .filter(([, s]) => s.enabled)
        .map(([guildId, s]) => ({ guildId, ...s }));
    },
    async deleteUnverifiedKickSettings(guildId) {
      store.delete(guildId);
    },
    async updateLastRunDate(_guildId: string, _date: string) {},
  };
}

const GUILD = "g1";

describe("unverified-kick/UnverifiedKickSettingsService", () => {
  it("getSettingsOrDefault は未設定時にデフォルトを返す", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(false);
    expect(settings.graceDays).toBe(DEFAULT_UNVERIFIED_KICK_GRACE_DAYS);
    expect(settings.warnDays).toBeUndefined();
    expect(settings.exemptRoleIds).toEqual([]);
  });

  it("enable は enabled=true と enabledAt を設定する", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    const now = new Date(2026, 0, 15);
    await service.enable(GUILD, now);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(true);
    expect(settings.enabledAt).toEqual(now);
  });

  it("disable は enabledAt を据え置きつつ enabled=false にする", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    const now = new Date(2026, 0, 15);
    await service.enable(GUILD, now);
    await service.disable(GUILD);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(false);
    expect(settings.enabledAt).toEqual(now);
  });

  it("setWarnDays / clearWarnDays が反映される", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    await service.setWarnDays(GUILD, 5);
    expect((await service.getSettingsOrDefault(GUILD)).warnDays).toBe(5);
    await service.clearWarnDays(GUILD);
    expect(
      (await service.getSettingsOrDefault(GUILD)).warnDays,
    ).toBeUndefined();
  });

  it("exempt ロール追加は冪等（重複追加は false）", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    expect(await service.addExemptRole(GUILD, "r1")).toBe(true);
    expect(await service.addExemptRole(GUILD, "r1")).toBe(false);
    expect((await service.getSettingsOrDefault(GUILD)).exemptRoleIds).toEqual([
      "r1",
    ]);
  });

  it("removeExemptRoles は一括削除し件数を返す", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    await service.addExemptRole(GUILD, "r1");
    await service.addExemptRole(GUILD, "r2");
    const removed = await service.removeExemptRoles(GUILD, ["r1", "x"]);
    expect(removed).toBe(1);
    expect((await service.getSettingsOrDefault(GUILD)).exemptRoleIds).toEqual([
      "r2",
    ]);
  });

  it("setMarkerRole / clearMarkerRole が反映される", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    await service.setMarkerRole(GUILD, "role-x");
    expect((await service.getSettingsOrDefault(GUILD)).markerRoleId).toBe(
      "role-x",
    );
    await service.clearMarkerRole(GUILD);
    expect(
      (await service.getSettingsOrDefault(GUILD)).markerRoleId,
    ).toBeUndefined();
  });

  it("setDmTemplate / setNotifyTemplate と各 clear が反映される", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    await service.setDmTemplate(GUILD, "dm-text");
    await service.setNotifyTemplate(GUILD, "notify-text");
    let s = await service.getSettingsOrDefault(GUILD);
    expect(s.dmTemplate).toBe("dm-text");
    expect(s.notifyTemplate).toBe("notify-text");
    await service.clearDmTemplate(GUILD);
    await service.clearNotifyTemplate(GUILD);
    s = await service.getSettingsOrDefault(GUILD);
    expect(s.dmTemplate).toBeUndefined();
    expect(s.notifyTemplate).toBeUndefined();
  });

  it("notify / log チャンネルの設定・解除が反映される", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    await service.setNotifyChannel(GUILD, "c-notify");
    await service.setLogChannel(GUILD, "c-log");
    let s = await service.getSettingsOrDefault(GUILD);
    expect(s.notifyChannelId).toBe("c-notify");
    expect(s.logChannelId).toBe("c-log");
    await service.clearNotifyChannel(GUILD);
    await service.clearLogChannel(GUILD);
    s = await service.getSettingsOrDefault(GUILD);
    expect(s.notifyChannelId).toBeUndefined();
    expect(s.logChannelId).toBeUndefined();
  });

  it("reset はデフォルトへ戻す", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    await service.enable(GUILD, new Date());
    await service.setGraceDays(GUILD, 20);
    await service.addExemptRole(GUILD, "r1");

    await service.reset(GUILD);
    const settings = await service.getSettingsOrDefault(GUILD);
    expect(settings.enabled).toBe(false);
    expect(settings.enabledAt).toBeUndefined();
    expect(settings.graceDays).toBe(DEFAULT_UNVERIFIED_KICK_GRACE_DAYS);
    expect(settings.exemptRoleIds).toEqual([]);
  });

  it("getAllEnabled は有効なギルドのみ返す", async () => {
    const service = createUnverifiedKickSettingsService(createFakeRepository());
    await service.enable("g1", new Date());
    await service.setGraceDays("g2", 10); // 無効のまま
    const enabled = await service.getAllEnabled();
    expect(enabled.map((s) => s.guildId)).toEqual(["g1"]);
  });
});
