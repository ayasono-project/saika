// tests/unit/features/vc-auto-recruit/vcAutoRecruitSettingsDefaults.test.ts
// VC自動募集設定のデフォルト値・正規化ロジックを検証

import {
  createDefaultVcAutoRecruitSettings,
  DEFAULT_VC_AUTO_RECRUIT_SETTINGS,
  normalizeVcAutoRecruitSettings,
} from "@/features/vc-auto-recruit/vcAutoRecruitSettingsDefaults";

describe("features/vc-auto-recruit/vcAutoRecruitSettingsDefaults", () => {
  it("DEFAULT_VC_AUTO_RECRUIT_SETTINGS は無効・Embed有効・空配列であること", () => {
    expect(DEFAULT_VC_AUTO_RECRUIT_SETTINGS).toEqual({
      enabled: false,
      embedEnabled: true,
      activeInvites: [],
    });
  });

  it("createDefaultVcAutoRecruitSettings は呼び出しごとに別インスタンスを返すこと", () => {
    const first = createDefaultVcAutoRecruitSettings();
    const second = createDefaultVcAutoRecruitSettings();

    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.activeInvites).not.toBe(second.activeInvites);
  });

  it("normalizeVcAutoRecruitSettings は配列参照を複製すること", () => {
    const source = {
      enabled: true,
      channelId: "ch-1",
      message: "hi",
      embedEnabled: false,
      activeInvites: [
        {
          voiceChannelId: "vc-1",
          postChannelId: "ch-1",
          messageId: "m-1",
          createdAt: 1,
        },
      ],
    };

    const normalized = normalizeVcAutoRecruitSettings(source);

    expect(normalized).toEqual(source);
    expect(normalized.activeInvites).not.toBe(source.activeInvites);
  });
});
