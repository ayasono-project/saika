// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitTeardownState.test.ts
import {
  deleteTeardownConfirmSession,
  getTeardownConfirmSession,
  setTeardownConfirmSession,
  type TeardownConfirmSession,
} from "@/bot/features/vc-recruit/handlers/ui/vcRecruitTeardownState";

const GUILD_ID = "guild-1";

const makeSession = (): TeardownConfirmSession => ({
  guildId: GUILD_ID,
  selectedSetups: [
    { panelChannelId: "panel-ch-1", categoryLabel: "ゲームカテゴリー" },
    { panelChannelId: "panel-ch-2", categoryLabel: "TOP（カテゴリーなし）" },
  ],
});

describe("bot/features/vc-recruit/handlers/ui/vcRecruitTeardownState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("セッションを保存して取得できる", () => {
    const session = makeSession();
    setTeardownConfirmSession("sel-id-1", session);
    expect(getTeardownConfirmSession("sel-id-1")).toEqual(session);
  });

  it("存在しないキーを取得すると undefined を返す", () => {
    expect(getTeardownConfirmSession("nonexistent")).toBeUndefined();
  });

  it("deleteTeardownConfirmSession でセッションを削除できる", () => {
    setTeardownConfirmSession("sel-id-2", makeSession());
    deleteTeardownConfirmSession("sel-id-2");
    expect(getTeardownConfirmSession("sel-id-2")).toBeUndefined();
  });

  it("60秒後にセッションが自動的に削除される", () => {
    setTeardownConfirmSession("sel-id-3", makeSession());
    expect(getTeardownConfirmSession("sel-id-3")).not.toBeUndefined();

    vi.advanceTimersByTime(60_000);
    expect(getTeardownConfirmSession("sel-id-3")).toBeUndefined();
  });
});
