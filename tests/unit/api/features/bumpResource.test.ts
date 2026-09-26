import { createBumpResource } from "@/api/features/bumpResource";
import type { BumpReminderSettings } from "@/shared/database/types";

const getSettingsOrDefaultMock = vi.fn();
const saveSettingsMock = vi.fn();
const cancelAllForGuildMock = vi.fn();
const findPendingByGuildMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotBumpReminderSettingsService: () => ({
    getBumpReminderSettingsOrDefault: (...args: unknown[]) =>
      getSettingsOrDefaultMock(...args),
    saveBumpReminderSettings: (...args: unknown[]) => saveSettingsMock(...args),
  }),
  getBotBumpReminderManager: () => ({
    cancelAllForGuild: (...args: unknown[]) => cancelAllForGuildMock(...args),
  }),
  getBotBumpReminderRepository: () => ({
    findPendingByGuild: (...args: unknown[]) => findPendingByGuildMock(...args),
  }),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (prefixKey: string, messageKey: string) =>
    `[${prefixKey}] ${messageKey}`,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), warn: vi.fn() },
}));

/** 設定済みで有効・特定チャンネル・メンションありの現在設定 */
const CONFIGURED_SETTINGS: BumpReminderSettings = {
  enabled: true,
  channelId: "ch-bump",
  mentionRoleId: "role-1",
  mentionUserIds: ["user-1"],
};

/**
 * パネルメッセージを1件だけ残している偽の Discord クライアントを作る
 * @returns 偽クライアントと、パネルの削除関数
 */
function createClientWithPanel() {
  const deletePanel = vi.fn().mockResolvedValue(undefined);
  const channel = {
    isTextBased: () => true,
    messages: {
      fetch: vi.fn().mockResolvedValue({ delete: deletePanel }),
    },
  };
  const client = { channels: { fetch: vi.fn().mockResolvedValue(channel) } };
  return { client, deletePanel };
}

// ダッシュボードの無効化・リセットが、コマンドと同じく予約とパネルを取り消し、同じ初期状態に戻すことを検証
describe("api/features/bumpResource", () => {
  // ケースごとに呼び出し記録を消し、現在設定と進行中の予約（パネル付き）を1件用意する
  beforeEach(() => {
    vi.clearAllMocks();
    getSettingsOrDefaultMock.mockResolvedValue({ ...CONFIGURED_SETTINGS });
    saveSettingsMock.mockResolvedValue(undefined);
    cancelAllForGuildMock.mockResolvedValue(1);
    findPendingByGuildMock.mockResolvedValue([
      { channelId: "ch-bump", panelMessageId: "panel-1" },
    ]);
  });

  describe("reset", () => {
    // 以前はダッシュボードだけ enabled:false で保存し、コマンドの reset（有効のまま）と結果が逆だった（回帰テスト）
    it("コマンドの reset と同じ初期状態（有効・全チャンネル・メンションなし）で保存して返す", async () => {
      const { client } = createClientWithPanel();

      const result = await createBumpResource(client as never).reset("g-1");

      expect(saveSettingsMock).toHaveBeenCalledWith("g-1", {
        enabled: true,
        channelId: undefined,
        mentionRoleId: undefined,
        mentionUserIds: [],
      });
      expect(result).toEqual({
        enabled: true,
        channelId: "all",
        mentionRoleId: null,
        mentionUserIds: [],
      });
    });

    // 以前はダッシュボードのリセットでは予約が残り、リセット前の Bump のリマインドが届いていた（回帰テスト）
    it("進行中の予約を取り消し、そのパネルメッセージを消す", async () => {
      const { client, deletePanel } = createClientWithPanel();

      await createBumpResource(client as never).reset("g-1");

      expect(cancelAllForGuildMock).toHaveBeenCalledWith("g-1");
      expect(client.channels.fetch).toHaveBeenCalledWith("ch-bump");
      expect(deletePanel).toHaveBeenCalledTimes(1);
    });
  });

  describe("patch", () => {
    // 以前はダッシュボードで無効化しても予約が残り、予定時刻の前に有効へ戻すと無効化前の予約が発火した（回帰テスト）
    it("enabled:false で保存したら、進行中の予約を取り消してパネルを消す", async () => {
      const { client, deletePanel } = createClientWithPanel();

      const result = await createBumpResource(client as never).patch("g-1", {
        enabled: false,
      });

      expect(saveSettingsMock).toHaveBeenCalledWith("g-1", {
        ...CONFIGURED_SETTINGS,
        enabled: false,
      });
      expect(cancelAllForGuildMock).toHaveBeenCalledWith("g-1");
      expect(deletePanel).toHaveBeenCalledTimes(1);
      expect(result.enabled).toBe(false);
      // 取り消しの最中に検知した Bump で予約が入らないよう、無効化の保存が先
      expect(saveSettingsMock.mock.invocationCallOrder[0]).toBeLessThan(
        cancelAllForGuildMock.mock.invocationCallOrder[0],
      );
    });

    it("有効のまま保存した場合は予約を取り消さない", async () => {
      const { client, deletePanel } = createClientWithPanel();

      await createBumpResource(client as never).patch("g-1", {
        mentionRoleId: null,
      });

      expect(saveSettingsMock).toHaveBeenCalledWith("g-1", {
        ...CONFIGURED_SETTINGS,
        mentionRoleId: undefined,
      });
      expect(cancelAllForGuildMock).not.toHaveBeenCalled();
      expect(deletePanel).not.toHaveBeenCalled();
    });

    it("無効の状態でほかの項目だけ保存した場合も、無効である以上は予約を取り消す", async () => {
      getSettingsOrDefaultMock.mockResolvedValue({
        ...CONFIGURED_SETTINGS,
        enabled: false,
      });
      const { client } = createClientWithPanel();

      await createBumpResource(client as never).patch("g-1", {
        channelId: "all",
      });

      expect(cancelAllForGuildMock).toHaveBeenCalledWith("g-1");
    });

    it("設定の保存に失敗した場合は予約を取り消さずに例外を返す", async () => {
      saveSettingsMock.mockRejectedValue(new Error("db down"));
      const { client } = createClientWithPanel();

      await expect(
        createBumpResource(client as never).patch("g-1", { enabled: false }),
      ).rejects.toThrow("db down");
      expect(cancelAllForGuildMock).not.toHaveBeenCalled();
    });
  });
});
