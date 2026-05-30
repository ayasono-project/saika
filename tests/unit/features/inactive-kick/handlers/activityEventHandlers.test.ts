// tests/unit/features/inactive-kick/handlers/activityEventHandlers.test.ts

// vi.mock はホイストされるため、ファクトリから参照する値は vi.hoisted で定義する
const mocks = vi.hoisted(() => ({
  recordMemberActivity: vi.fn(),
  deleteActivity: vi.fn(),
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/features/inactive-kick/handlers/recordActivity", () => ({
  recordMemberActivity: (...args: unknown[]) =>
    mocks.recordMemberActivity(...args),
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotMemberActivityRepository: () => ({
    deleteActivity: mocks.deleteActivity,
  }),
}));
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (prefixKey: string, messageKey: string) =>
    `[${prefixKey}] ${messageKey}`,
}));
vi.mock("@/shared/utils/logger", () => ({ logger: mocks.logger }));

import {
  handleInactiveKickMemberRemove,
  handleInactiveKickMessageActivity,
  handleInactiveKickReactionActivity,
  handleInactiveKickVoiceActivity,
} from "@/features/inactive-kick/handlers/activityEventHandlers";

const GUILD = { id: "guild-1", members: { fetch: vi.fn() } };

describe("inactive-kick/activityEventHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.recordMemberActivity.mockResolvedValue(undefined);
    mocks.deleteActivity.mockResolvedValue(undefined);
  });

  describe("message", () => {
    it("通常メッセージで活動を記録する", async () => {
      await handleInactiveKickMessageActivity({
        author: { bot: false, id: "user-1" },
        guild: GUILD,
        member: { id: "user-1" },
      } as never);

      expect(mocks.recordMemberActivity).toHaveBeenCalledTimes(1);
      expect(mocks.recordMemberActivity.mock.calls[0][1]).toBe("user-1");
    });

    it("Bot のメッセージは無視する", async () => {
      await handleInactiveKickMessageActivity({
        author: { bot: true, id: "bot-1" },
        guild: GUILD,
      } as never);
      expect(mocks.recordMemberActivity).not.toHaveBeenCalled();
    });

    it("DM（guild なし）は無視する", async () => {
      await handleInactiveKickMessageActivity({
        author: { bot: false, id: "user-1" },
        guild: null,
      } as never);
      expect(mocks.recordMemberActivity).not.toHaveBeenCalled();
    });
  });

  describe("voice", () => {
    it("VC 参加（null→チャンネル）で活動を記録する", async () => {
      await handleInactiveKickVoiceActivity(
        { channelId: null } as never,
        {
          channelId: "vc-1",
          guild: GUILD,
          member: { id: "user-1", user: { bot: false } },
        } as never,
      );
      expect(mocks.recordMemberActivity).toHaveBeenCalledTimes(1);
    });

    it("VC 内の状態変化（移動・ミュート等）は無視する", async () => {
      await handleInactiveKickVoiceActivity(
        { channelId: "vc-1" } as never,
        {
          channelId: "vc-2",
          guild: GUILD,
          member: { id: "user-1", user: { bot: false } },
        } as never,
      );
      expect(mocks.recordMemberActivity).not.toHaveBeenCalled();
    });

    it("Bot の VC 参加は無視する", async () => {
      await handleInactiveKickVoiceActivity(
        { channelId: null } as never,
        {
          channelId: "vc-1",
          guild: GUILD,
          member: { id: "bot-1", user: { bot: true } },
        } as never,
      );
      expect(mocks.recordMemberActivity).not.toHaveBeenCalled();
    });
  });

  describe("reaction", () => {
    it("リアクションで活動を記録する", async () => {
      await handleInactiveKickReactionActivity(
        { message: { guild: GUILD } } as never,
        { bot: false, id: "user-1" } as never,
      );
      expect(mocks.recordMemberActivity).toHaveBeenCalledTimes(1);
      expect(mocks.recordMemberActivity.mock.calls[0][1]).toBe("user-1");
    });

    it("Bot のリアクションは無視する", async () => {
      await handleInactiveKickReactionActivity(
        { message: { guild: GUILD } } as never,
        { bot: true, id: "bot-1" } as never,
      );
      expect(mocks.recordMemberActivity).not.toHaveBeenCalled();
    });

    it("ギルド解決不可（DM 等）は無視する", async () => {
      await handleInactiveKickReactionActivity(
        { message: { guild: null } } as never,
        { bot: false, id: "user-1" } as never,
      );
      expect(mocks.recordMemberActivity).not.toHaveBeenCalled();
    });
  });

  describe("memberRemove", () => {
    it("退出メンバーの活動履歴を削除する", async () => {
      await handleInactiveKickMemberRemove({
        guild: { id: "guild-1" },
        user: { id: "user-1" },
      } as never);
      expect(mocks.deleteActivity).toHaveBeenCalledWith("guild-1", "user-1");
    });

    it("削除失敗でも例外を投げず警告ログのみ", async () => {
      mocks.deleteActivity.mockRejectedValueOnce(new Error("db down"));
      await handleInactiveKickMemberRemove({
        guild: { id: "guild-1" },
        user: { id: "user-1" },
      } as never);
      expect(mocks.logger.warn).toHaveBeenCalledTimes(1);
    });
  });
});
