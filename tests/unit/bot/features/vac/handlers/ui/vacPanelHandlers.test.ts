// tests/unit/bot/features/vac/handlers/ui/vacPanelHandlers.test.ts

import type { Mock } from "vitest";
import { vcPanelButtonHandler } from "@/bot/features/vc-panel/handlers/ui/vcPanelButton";
import { vcPanelModalHandler } from "@/bot/features/vc-panel/handlers/ui/vcPanelModal";
import { vcPanelUserSelectHandler } from "@/bot/features/vc-panel/handlers/ui/vcPanelUserSelect";
import { safeReply } from "@/bot/utils/interaction";

const isVcPanelManagedChannelMock = vi.fn().mockResolvedValue(true);
const getAfkConfigMock = vi.fn();

// VC操作パネル customId 定数を固定化して matches 判定を検証しやすくする
vi.mock("@/bot/features/vc-panel/vcControlPanel", () => ({
  VAC_PANEL_CUSTOM_ID: {
    RENAME_BUTTON_PREFIX: "vac:rename-btn:",
    LIMIT_BUTTON_PREFIX: "vac:limit-btn:",
    AFK_BUTTON_PREFIX: "vac:afk-btn:",
    REFRESH_BUTTON_PREFIX: "vac:refresh-btn:",
    RENAME_MODAL_PREFIX: "vac:rename-modal:",
    LIMIT_MODAL_PREFIX: "vac:limit-modal:",
    AFK_SELECT_PREFIX: "vac:afk-select:",
    RENAME_INPUT: "rename-input",
    LIMIT_INPUT: "limit-input",
  },
  getVacPanelChannelId: vi.fn(() => "voice-1"),
  sendVcControlPanel: vi.fn(),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

// 所有権レジストリをモックして管理対象チェックを制御する
vi.mock("@/bot/features/vc-panel/vcPanelOwnershipRegistry", () => ({
  isVcPanelManagedChannel: (...args: unknown[]) =>
    isVcPanelManagedChannelMock(...args),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));
vi.mock("@/shared/features/afk/afkConfigService", () => ({
  getAfkConfig: (...args: unknown[]) => getAfkConfigMock(...args),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));
vi.mock("@/shared/database/repositories/afkConfigRepository", () => ({
  getAfkConfigRepository: vi.fn(() => ({
    getAfkConfig: (...args: unknown[]) => getAfkConfigMock(...args),
  })),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));
vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));
vi.mock("@/bot/utils/interaction", () => ({
  safeReply: vi.fn(),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((message: string) => ({ message })),
  createSuccessEmbed: vi.fn((message: string) => ({ message })),
}));

// VACパネルのボタン・モーダル・ユーザーセレクト 3種ハンドラについて、
// customId マッチング／VC 存在確認／操作者在籍チェック／各アクションの正常系と異常系を網羅的に検証する
// NOTE: テスト内変数名は旧名称のまま維持（実態は vc-panel の新ハンドラーを指す）
const vacPanelButtonHandler = vcPanelButtonHandler;
const vacPanelModalHandler = vcPanelModalHandler;
const vacPanelUserSelectHandler = vcPanelUserSelectHandler;
describe("bot/features/vac/ui handlers", () => {
  // 各ケース前にモックを初期化する
  beforeEach(() => {
    vi.clearAllMocks();
    isVcPanelManagedChannelMock.mockResolvedValue(true);
    getAfkConfigMock.mockResolvedValue({ enabled: true, channelId: "afk-1" });
  });

  it("`matches` が customId prefix ベースで判定できることを検証", () => {
    expect(vacPanelButtonHandler.matches("vac:rename-btn:voice-1")).toBe(true);
    expect(vacPanelButtonHandler.matches("vac:limit-btn:voice-1")).toBe(true);
    expect(vacPanelButtonHandler.matches("vac:afk-btn:voice-1")).toBe(true);
    expect(vacPanelButtonHandler.matches("vac:refresh-btn:voice-1")).toBe(true);
    expect(vacPanelButtonHandler.matches("other:voice-1")).toBe(false);

    expect(vacPanelModalHandler.matches("vac:rename-modal:voice-1")).toBe(true);
    expect(vacPanelModalHandler.matches("vac:limit-modal:voice-1")).toBe(true);
    expect(vacPanelModalHandler.matches("other:voice-1")).toBe(false);

    expect(vacPanelUserSelectHandler.matches("vac:afk-select:voice-1")).toBe(
      true,
    );
    expect(vacPanelUserSelectHandler.matches("other:voice-1")).toBe(false);
  });

  it("guild が無い場合は副作用なく return することを検証", async () => {
    await expect(
      vacPanelButtonHandler.execute({ guild: null } as never),
    ).resolves.toBeUndefined();

    await expect(
      vacPanelModalHandler.execute({ guild: null } as never),
    ).resolves.toBeUndefined();

    await expect(
      vacPanelUserSelectHandler.execute({ guild: null } as never),
    ).resolves.toBeUndefined();
  });

  it("ボタン処理で対象VCが取得できない場合はエラー応答することを検証", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
      customId: "vac:rename-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("ボタンのcustomIdにパネルチャンネルが含まれない場合は早期リターンする", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn(),
        },
      },
      customId: "unknown:custom-id",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(interaction.guild.channels.fetch).not.toHaveBeenCalled();
    expect(safeReply).not.toHaveBeenCalled();
  });

  it("ボタンの対象チャンネルfetchが失敗した場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockRejectedValue(new Error("fetch failed")),
        },
      },
      customId: "vac:rename-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("ボタンの対象チャンネルが管理対象でない場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
      },
      customId: "vac:rename-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    isVcPanelManagedChannelMock.mockResolvedValue(false);

    await vacPanelButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("ボタン操作者がVCに在籍していない場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "other-voice" },
          }),
        },
      },
      customId: "vac:rename-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_in_vc" }],
      flags: 64,
    });
  });

  it("ボタン操作者のfetchが失敗した場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
        members: {
          fetch: vi.fn().mockRejectedValue(new Error("fetch failed")),
        },
      },
      customId: "vac:rename-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_in_vc" }],
      flags: 64,
    });
  });

  it("リネームボタン押下時にリネームモーダルを表示する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:rename-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn().mockResolvedValue(undefined),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(interaction.showModal).toHaveBeenCalledTimes(1);
  });

  it("上限設定ボタン押下時に上限設定モーダルを表示する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:limit-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn().mockResolvedValue(undefined),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(interaction.showModal).toHaveBeenCalledTimes(1);
  });

  it("AFKボタン押下時にユーザー選択メニューを返答する", async () => {
    const mockMember1 = { displayName: "User One", id: "user-one" };
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            members: {
              size: 1,
              values: () => [mockMember1][Symbol.iterator](),
            },
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:afk-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        components: expect.any(Array),
        flags: 64,
      }),
    );
  });

  it("VC にメンバーが 0 人の場合は not_in_vc エラーを返す", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            members: {
              size: 0,
              values: () => [][Symbol.iterator](),
            },
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:afk-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: vi.fn() },
      showModal: vi.fn(),
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({ flags: 64 }),
    );
  });

  it("更新ボタン押下時にパネルを再送信して成功応答する", async () => {
    const deleteMock = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            members: { size: 3 },
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:refresh-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: true, delete: deleteMock },
      showModal: vi.fn(),
    };

    const panelModule = (await vi.importMock(
      "@/bot/features/vc-panel/vcControlPanel",
    )) as {
      sendVcControlPanel: Mock;
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(panelModule.sendVcControlPanel).toHaveBeenCalledWith({
      id: "voice-1",
      type: 2,
      members: { size: 3 },
    });
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.panel_refreshed" }],
      flags: 64,
    });
  });

  it("更新メッセージが削除不可の場合でもパネルを更新する", async () => {
    const deleteMock = vi.fn();
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            members: { size: 1 },
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:refresh-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: false, delete: deleteMock },
      showModal: vi.fn(),
    };

    const panelModule = (await vi.importMock(
      "@/bot/features/vc-panel/vcControlPanel",
    )) as {
      sendVcControlPanel: Mock;
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(deleteMock).not.toHaveBeenCalled();
    expect(panelModule.sendVcControlPanel).toHaveBeenCalledTimes(1);
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.panel_refreshed" }],
      flags: 64,
    });
  });

  it("メッセージ削除が失敗しても更新フローを継続する", async () => {
    const deleteMock = vi.fn().mockRejectedValue(new Error("delete failed"));
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            members: { size: 1 },
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:refresh-btn:voice-1",
      user: { id: "user-1" },
      message: { deletable: true, delete: deleteMock },
      showModal: vi.fn(),
    };

    const panelModule = (await vi.importMock(
      "@/bot/features/vc-panel/vcControlPanel",
    )) as {
      sendVcControlPanel: Mock;
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(deleteMock).toHaveBeenCalledTimes(1);
    expect(panelModule.sendVcControlPanel).toHaveBeenCalledTimes(1);
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.panel_refreshed" }],
      flags: 64,
    });
  });

  it("customId.startsWith を全て偽に制御した場合でも、例外を投げず副作用なしで終了することを検証", async () => {
    const startsWithMock = vi
      .fn()
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);

    const customId = {
      startsWith: startsWithMock,
    } as unknown as string;

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            members: { size: 1 },
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId,
      user: { id: "user-1" },
      message: { deletable: true, delete: vi.fn() },
      showModal: vi.fn(),
    };

    const panelModule = (await vi.importMock(
      "@/bot/features/vc-panel/vcControlPanel",
    )) as {
      sendVcControlPanel: Mock;
    };

    await vacPanelButtonHandler.execute(interaction as never);

    expect(interaction.showModal).not.toHaveBeenCalled();
    expect(panelModule.sendVcControlPanel).not.toHaveBeenCalled();
    expect(safeReply).not.toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ message: "vac:user-response.panel_refreshed" }],
      }),
    );
  });

  it("モーダル処理で人数制限が範囲外の場合はエラー応答することを検証", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            edit: vi.fn(),
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:limit-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "120"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.limit_out_of_range" }],
      flags: 64,
    });
  });

  it("モーダルの対象チャンネルがボイスチャンネルでない場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
      customId: "vac:rename-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "new-name"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("モーダルのチャンネルfetchが失敗した場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockRejectedValue(new Error("fetch failed")),
        },
      },
      customId: "vac:rename-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "new-name"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("モーダルの対象チャンネルが管理対象でない場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            edit: vi.fn(),
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:rename-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "new-name"),
      },
    };

    isVcPanelManagedChannelMock.mockResolvedValue(false);

    await vacPanelModalHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("モーダル操作者が対象ボイスチャンネルに在籍していない場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            edit: vi.fn(),
          }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "other-voice" },
          }),
        },
      },
      customId: "vac:rename-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "new-name"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_in_vc" }],
      flags: 64,
    });
  });

  it("モーダルのメンバーfetchが失敗した場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: 2,
            edit: vi.fn(),
          }),
        },
        members: {
          fetch: vi.fn().mockRejectedValue(new Error("fetch failed")),
        },
      },
      customId: "vac:rename-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "new-name"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_in_vc" }],
      flags: 64,
    });
  });

  it("モーダルのリネーム入力が空の場合はエラー応答する", async () => {
    const voiceChannel = {
      id: "voice-1",
      type: 2,
      edit: vi.fn(),
    };

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(voiceChannel),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:rename-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "   "),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(voiceChannel.edit).not.toHaveBeenCalled();
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.name_required" }],
      flags: 64,
    });
  });

  it("モーダルリネームでチャンネルをリネームして成功応答する", async () => {
    const voiceChannel = {
      id: "voice-1",
      type: 2,
      edit: vi.fn().mockResolvedValue(undefined),
    };

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(voiceChannel),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:rename-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "my-vc"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(voiceChannel.edit).toHaveBeenCalledWith({ name: "my-vc" });
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.renamed" }],
      flags: 64,
    });
  });

  it("0以外の人数制限をチャンネルに設定して成功応答する", async () => {
    const voiceChannel = {
      id: "voice-1",
      type: 2,
      edit: vi.fn().mockResolvedValue(undefined),
    };

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(voiceChannel),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:limit-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "5"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(voiceChannel.edit).toHaveBeenCalledWith({ userLimit: 5 });
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.limit_changed" }],
      flags: 64,
    });
  });

  it("Discord では userLimit=0 が「人数制限なし（無制限）」を意味するため、0 入力を正しく処理することを検証", async () => {
    const voiceChannel = {
      id: "voice-1",
      type: 2,
      edit: vi.fn().mockResolvedValue(undefined),
    };

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(voiceChannel),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:limit-modal:voice-1",
      user: { id: "user-1" },
      fields: {
        getTextInputValue: vi.fn(() => "0"),
      },
    };

    await vacPanelModalHandler.execute(interaction as never);

    expect(voiceChannel.edit).toHaveBeenCalledWith({ userLimit: 0 });
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.limit_changed" }],
      flags: 64,
    });
  });

  it("user-select で対象ユーザーをAFKへ移動し成功応答することを検証", async () => {
    const movedMember = {
      voice: {
        channelId: "voice-1",
        setChannel: vi.fn().mockResolvedValue(undefined),
      },
    };
    const skippedMember = {
      voice: {
        channelId: "other-voice",
        setChannel: vi.fn(),
      },
    };

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce({
              id: "voice-1",
              type: 2,
              members: { size: 2 },
            })
            .mockResolvedValueOnce({ id: "afk-1", type: 2 }),
        },
        members: {
          fetch: vi.fn((userId: string) => {
            if (userId === "operator") {
              return Promise.resolve({ voice: { channelId: "voice-1" } });
            }
            if (userId === "move-user") {
              return Promise.resolve(movedMember);
            }
            if (userId === "skip-user") {
              return Promise.resolve(skippedMember);
            }
            return Promise.resolve(null);
          }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["move-user", "skip-user"],
    };

    const databaseModule = (await vi.importMock(
      "@/shared/database/repositories/afkConfigRepository",
    )) as {
      getAfkConfigRepository: Mock;
    };
    databaseModule.getAfkConfigRepository.mockReturnValue({
      getAfkConfig: vi.fn().mockResolvedValue({
        enabled: true,
        channelId: "afk-1",
      }),
    });

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(movedMember.voice.setChannel).toHaveBeenCalledWith({
      id: "afk-1",
      type: 2,
    });
    expect(safeReply).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: expect.any(Array),
        flags: 64,
      }),
    );
  });

  it("user-selectの対象チャンネルが無効な場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("user-selectの対象チャンネルfetchが失敗した場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockRejectedValue(new Error("fetch failed")),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("user-selectの対象チャンネルが管理対象でない場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    isVcPanelManagedChannelMock.mockResolvedValue(false);

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("user-select操作者がVCに在籍していない場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "other-voice" },
          }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_in_vc" }],
      flags: 64,
    });
  });

  it("user-select操作者のfetchが失敗した場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
        members: {
          fetch: vi.fn().mockRejectedValue(new Error("operator fetch failed")),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_in_vc" }],
      flags: 64,
    });
  });

  it("AFK設定がDBに未登録（null）の場合、移動処理をスキップしエラー応答することを検証", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue({ id: "voice-1", type: 2 }),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    getAfkConfigMock.mockResolvedValueOnce(null);

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "afk:user-response.not_configured" }],
      flags: 64,
    });
  });

  it("AFK設定は存在するが対象チャンネルが削除済み等で null になる場合のエラー応答を検証", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce({ id: "voice-1", type: 2 })
            .mockResolvedValueOnce(null),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    const databaseModule = (await vi.importMock(
      "@/shared/database/repositories/afkConfigRepository",
    )) as {
      getAfkConfigRepository: Mock;
    };
    databaseModule.getAfkConfigRepository.mockReturnValue({
      getAfkConfig: vi.fn().mockResolvedValue({
        enabled: true,
        channelId: "afk-1",
      }),
    });

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "afk:user-response.channel_not_found" }],
      flags: 64,
    });
  });

  it("AFKチャンネルのfetchが失敗した場合はエラー応答する", async () => {
    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce({ id: "voice-1", type: 2 })
            .mockRejectedValueOnce(new Error("afk fetch failed")),
        },
        members: {
          fetch: vi.fn().mockResolvedValue({
            voice: { channelId: "voice-1" },
          }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["user-1"],
    };

    const databaseModule = (await vi.importMock(
      "@/shared/database/repositories/afkConfigRepository",
    )) as {
      getAfkConfigRepository: Mock;
    };
    databaseModule.getAfkConfigRepository.mockReturnValue({
      getAfkConfig: vi.fn().mockResolvedValue({
        enabled: true,
        channelId: "afk-1",
      }),
    });

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "afk:user-response.channel_not_found" }],
      flags: 64,
    });
  });

  it("setChannel が全員分失敗した場合にのみ afk_move_failed エラーを返すことを検証", async () => {
    const failingMoveMember = {
      voice: {
        channelId: "voice-1",
        setChannel: vi.fn().mockRejectedValue(new Error("move failed")),
      },
    };

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce({ id: "voice-1", type: 2 })
            .mockResolvedValueOnce({ id: "afk-1", type: 2 }),
        },
        members: {
          fetch: vi.fn((userId: string) => {
            if (userId === "operator") {
              return Promise.resolve({ voice: { channelId: "voice-1" } });
            }
            if (userId === "move-user") {
              return Promise.resolve(failingMoveMember);
            }
            return Promise.resolve(null);
          }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["move-user"],
    };

    const databaseModule = (await vi.importMock(
      "@/shared/database/repositories/afkConfigRepository",
    )) as {
      getAfkConfigRepository: Mock;
    };
    databaseModule.getAfkConfigRepository.mockReturnValue({
      getAfkConfig: vi.fn().mockResolvedValue({
        enabled: true,
        channelId: "afk-1",
      }),
    });

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(failingMoveMember.voice.setChannel).toHaveBeenCalledWith({
      id: "afk-1",
      type: 2,
    });
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.afk_move_failed" }],
      flags: 64,
    });
  });

  it("選択メンバーの一部 fetch が失敗しても残りを正常に移動し成功応答する、部分失敗への回復性を検証", async () => {
    const movableMember = {
      voice: {
        channelId: "voice-1",
        setChannel: vi.fn().mockResolvedValue(undefined),
      },
    };

    const interaction = {
      locale: "ja",
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce({ id: "voice-1", type: 2 })
            .mockResolvedValueOnce({ id: "afk-1", type: 2 }),
        },
        members: {
          fetch: vi.fn((userId: string) => {
            if (userId === "operator") {
              return Promise.resolve({ voice: { channelId: "voice-1" } });
            }
            if (userId === "broken-user") {
              return Promise.reject(new Error("member fetch failed"));
            }
            if (userId === "move-user") {
              return Promise.resolve(movableMember);
            }
            return Promise.resolve(null);
          }),
        },
      },
      customId: "vac:afk-select:voice-1",
      user: { id: "operator" },
      values: ["broken-user", "move-user"],
    };

    const databaseModule = (await vi.importMock(
      "@/shared/database/repositories/afkConfigRepository",
    )) as {
      getAfkConfigRepository: Mock;
    };
    databaseModule.getAfkConfigRepository.mockReturnValue({
      getAfkConfig: vi.fn().mockResolvedValue({
        enabled: true,
        channelId: "afk-1",
      }),
    });

    await vacPanelUserSelectHandler.execute(interaction as never);

    expect(movableMember.voice.setChannel).toHaveBeenCalledWith({
      id: "afk-1",
      type: 2,
    });
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.members_moved" }],
      flags: 64,
    });
  });
});
