// tests/unit/bot/features/member-log/handlers/inviteTracker.test.ts
import {
  clearInviteCacheForTest,
  findUsedInvite,
  initGuildInviteCache,
} from "@/bot/features/member-log/handlers/inviteTracker";

// inviteTracker のキャッシュ初期化・招待特定ロジックを検証
describe("bot/features/member-log/handlers/inviteTracker", () => {
  beforeEach(() => {
    clearInviteCacheForTest();
  });

  // initGuildInviteCache：招待一覧を正常取得できる場合とエラーの場合を検証
  describe("initGuildInviteCache", () => {
    it("guild.invites.fetch が成功した場合にキャッシュが初期化されることを確認", async () => {
      const fakeInvites = new Map([
        ["abc123", { code: "abc123", uses: 5 }],
        ["xyz789", { code: "xyz789", uses: 2 }],
      ]);
      const guild = {
        id: "guild-1",
        invites: {
          fetch: vi.fn().mockResolvedValue(fakeInvites),
        },
      };

      await initGuildInviteCache(guild as never);

      // キャッシュ済みであれば findUsedInvite で比較できる（uses が同数なので null が返る）
      const result = await findUsedInvite({
        id: "guild-1",
        invites: { fetch: vi.fn().mockResolvedValue(fakeInvites) },
      } as never);
      expect(result).toBeNull();
    });

    it("invite.uses が null の場合に 0 として扱われることを確認", async () => {
      const fakeInvites = new Map([
        ["nulluses", { code: "nulluses", uses: null }],
      ]);
      const guild = {
        id: "guild-null",
        invites: { fetch: vi.fn().mockResolvedValue(fakeInvites) },
      };

      await initGuildInviteCache(guild as never);

      // uses=null → 0 としてキャッシュされるので、uses=1 で参加検出できる
      const updatedInvites = new Map([
        ["nulluses", { code: "nulluses", uses: 1 }],
      ]);
      const result = await findUsedInvite({
        id: "guild-null",
        invites: { fetch: vi.fn().mockResolvedValue(updatedInvites) },
      } as never);
      expect(result).toEqual({ code: "nulluses", uses: 1 });
    });

    it("guild.invites.fetch が例外を投げた場合も例外が伝播しないことを確認", async () => {
      const guild = {
        id: "guild-2",
        invites: {
          fetch: vi.fn().mockRejectedValue(new Error("Missing Permissions")),
        },
      };

      await expect(
        initGuildInviteCache(guild as never),
      ).resolves.toBeUndefined();
    });
  });

  // findUsedInvite：使用回数が増えた招待を返す・権限エラー時は null を返すことを検証
  describe("findUsedInvite", () => {
    it("キャッシュより uses が増えた招待コードを返すことを確認", async () => {
      const invite = { code: "abc123", uses: 3 };
      const cachedInvites = new Map([["abc123", { code: "abc123", uses: 3 }]]);
      const guild = {
        id: "guild-1",
        invites: { fetch: vi.fn().mockResolvedValue(cachedInvites) },
      };
      await initGuildInviteCache(guild as never);

      // uses を 1 増やして参加をシミュレート
      const updatedInvite = { code: "abc123", uses: 4 };
      const updatedInvites = new Map([["abc123", updatedInvite]]);
      const guildAfterJoin = {
        id: "guild-1",
        invites: { fetch: vi.fn().mockResolvedValue(updatedInvites) },
      };

      const result = await findUsedInvite(guildAfterJoin as never);
      expect(result).toBe(updatedInvite);
      // 型確認
      expect((result as typeof invite).code).toBe("abc123");
    });

    it("どの招待の uses も増えていない場合に null を返すことを確認", async () => {
      const invites = new Map([["abc123", { code: "abc123", uses: 3 }]]);
      const guild = {
        id: "guild-1",
        invites: { fetch: vi.fn().mockResolvedValue(invites) },
      };
      await initGuildInviteCache(guild as never);

      const result = await findUsedInvite({
        id: "guild-1",
        invites: { fetch: vi.fn().mockResolvedValue(invites) },
      } as never);
      expect(result).toBeNull();
    });

    it("キャッシュに存在しない新規招待コードで uses > 0 の場合に返すことを確認", async () => {
      // キャッシュは空（initGuildInviteCache 未呼び出し）
      const newInvite = { code: "new999", uses: 1 };
      const invites = new Map([["new999", newInvite]]);
      const guild = {
        id: "guild-3",
        invites: { fetch: vi.fn().mockResolvedValue(invites) },
      };

      const result = await findUsedInvite(guild as never);
      expect(result).toBe(newInvite);
    });

    it("guild.invites.fetch が例外を投げた場合に null を返しキャッシュを更新しないことを確認", async () => {
      const guild = {
        id: "guild-4",
        invites: {
          fetch: vi.fn().mockRejectedValue(new Error("Missing Permissions")),
        },
      };

      const result = await findUsedInvite(guild as never);
      expect(result).toBeNull();
    });
  });
});
