// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitPanelState.test.ts
import {
  deleteVcRecruitSession,
  getVcRecruitSession,
  setVcRecruitSession,
  updateVcRecruitSession,
  type VcRecruitSession,
} from "@/bot/features/vc-recruit/handlers/ui/vcRecruitPanelState";

const makeSession = (
  overrides?: Partial<VcRecruitSession>,
): VcRecruitSession => ({
  panelChannelId: "panel-ch-1",
  mentionRoleIds: [],
  selectedVcId: "__new__",
  createdAt: Date.now(),
  ...overrides,
});

describe("bot/features/vc-recruit/handlers/ui/vcRecruitPanelState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("セッションを保存して取得できる", () => {
    const session = makeSession();
    setVcRecruitSession("interaction-1", session);
    expect(getVcRecruitSession("interaction-1")).toEqual(session);
  });

  it("存在しないキーを取得すると undefined を返す", () => {
    expect(getVcRecruitSession("nonexistent")).toBeUndefined();
  });

  it("deleteVcRecruitSession でセッションを削除できる", () => {
    setVcRecruitSession("interaction-2", makeSession());
    deleteVcRecruitSession("interaction-2");
    expect(getVcRecruitSession("interaction-2")).toBeUndefined();
  });

  it("updateVcRecruitSession でセッションを部分更新できる", () => {
    setVcRecruitSession("interaction-3", makeSession());
    updateVcRecruitSession("interaction-3", {
      mentionRoleIds: ["role-1", "role-2"],
    });
    const updated = getVcRecruitSession("interaction-3");
    expect(updated?.mentionRoleIds).toEqual(["role-1", "role-2"]);
    expect(updated?.panelChannelId).toBe("panel-ch-1");
    expect(updated?.selectedVcId).toBe("__new__");
  });

  it("存在しないキーを更新しても何も起こらない", () => {
    updateVcRecruitSession("nonexistent", { mentionRoleIds: ["role-1"] });
    expect(getVcRecruitSession("nonexistent")).toBeUndefined();
  });

  it("selectedVcId を更新できる", () => {
    setVcRecruitSession("interaction-5", makeSession());
    updateVcRecruitSession("interaction-5", { selectedVcId: "vc-123" });
    const updated = getVcRecruitSession("interaction-5");
    expect(updated?.selectedVcId).toBe("vc-123");
    expect(updated?.mentionRoleIds).toEqual([]);
  });

  it("15分後にセッションが自動的に削除される", () => {
    setVcRecruitSession("interaction-6", makeSession());
    expect(getVcRecruitSession("interaction-6")).not.toBeUndefined();

    vi.advanceTimersByTime(15 * 60 * 1000);
    expect(getVcRecruitSession("interaction-6")).toBeUndefined();
  });
});
