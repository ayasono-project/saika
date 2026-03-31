// tests/unit/bot/features/vac/handlers/ui/vacPanelModal.test.ts
import { DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { vcPanelModalHandler } from "@/bot/features/vc-panel/handlers/ui/vcPanelModal";
import { safeReply } from "@/bot/utils/interaction";

const isVcPanelManagedChannelMock = vi.fn();

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
  tInteraction: vi.fn(
    (_locale: string, key: string, params?: Record<string, unknown>) => {
      if (key === "vac:user-response.renamed") {
        return `renamed:${String(params?.name)}`;
      }
      if (key === "vac:user-response.limit_changed") {
        return `limit:${String(params?.limit)}`;
      }
      if (key === "vac:user-response.unlimited") {
        return "unlimited";
      }
      return key;
    },
  ),
}));

vi.mock("@/bot/features/vc-panel/vcPanelOwnershipRegistry", () => ({
  isVcPanelManagedChannel: (...args: unknown[]) =>
    isVcPanelManagedChannelMock(...args),
}));

vi.mock("@/bot/utils/interaction", () => ({
  safeReply: vi.fn(),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((message: string) => ({ message })),
  createSuccessEmbed: vi.fn((message: string) => ({ message })),
}));

vi.mock("@/bot/features/vc-panel/vcControlPanel", () => ({
  VAC_PANEL_CUSTOM_ID: {
    RENAME_MODAL_PREFIX: "vac:rename-modal:",
    LIMIT_MODAL_PREFIX: "vac:limit-modal:",
    RENAME_INPUT: "rename-input",
    LIMIT_INPUT: "limit-input",
  },
  getVacPanelChannelId: vi.fn((customId: string, prefix: string) =>
    customId.startsWith(prefix) ? customId.slice(prefix.length) : "",
  ),
}));

function createBaseInteraction(overrides?: {
  customId?: string;
  channel?: unknown;
  memberChannelId?: string;
  renameInput?: string;
  limitInput?: string;
}) {
  const channel =
    overrides?.channel ?? ({ id: "voice-1", type: 2, edit: vi.fn() } as const);

  return {
    locale: "ja",
    guild: {
      id: "guild-1",
      channels: {
        fetch: vi.fn().mockResolvedValue(channel),
      },
      members: {
        fetch: vi.fn().mockResolvedValue({
          voice: { channelId: overrides?.memberChannelId ?? "voice-1" },
        }),
      },
    },
    customId: overrides?.customId ?? "vac:rename-modal:voice-1",
    user: { id: "user-1" },
    fields: {
      getTextInputValue: vi.fn((inputId: string) => {
        if (inputId === "rename-input") {
          return overrides?.renameInput ?? "Renamed VC";
        }
        return overrides?.limitInput ?? "10";
      }),
    },
  };
}

// VACパネルのリネーム・人数制限モーダルハンドラーを検証する
// customId マッチング・管理外チャンネルのエラー・入力トリム・数値バリデーション違反の各フローを確認する
describe("bot/features/vac/handlers/ui/vacPanelModal", () => {
  // 毎テストで isManagedVacChannel が true を返すデフォルト正常状態に戻す
  beforeEach(() => {
    vi.clearAllMocks();
    isVcPanelManagedChannelMock.mockResolvedValue(true);
  });

  it("サポートされているモーダルのcustomIdプレフィックスのみにマッチする", () => {
    expect(vcPanelModalHandler.matches("vac:rename-modal:voice-1")).toBe(true);
    expect(vcPanelModalHandler.matches("vac:limit-modal:voice-1")).toBe(true);
    expect(vcPanelModalHandler.matches("other:voice-1")).toBe(false);
  });

  it("対象チャンネルがVACに管理されていない場合はエラーを返答する", async () => {
    isVcPanelManagedChannelMock.mockResolvedValueOnce(false);
    const interaction = createBaseInteraction();

    await vcPanelModalHandler.execute(interaction as never);

    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.not_vac_channel" }],
      flags: 64,
    });
  });

  it("入力値の前後空白をトリムして channel.edit に渡し、成功メッセージを返すことを検証", async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createBaseInteraction({
      customId: "vac:rename-modal:voice-1",
      channel: { id: "voice-1", type: 2, edit: editMock },
      renameInput: " New Name ",
    });

    await vcPanelModalHandler.execute(interaction as never);

    expect(editMock).toHaveBeenCalledWith({ name: "New Name" });
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "renamed:New Name" }],
      flags: 64,
    });
  });

  it("channel.edit で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する（rename）", async () => {
    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "PATCH",
      "/channels/voice-1",
      {},
    );
    const editMock = vi.fn().mockRejectedValue(apiError);
    const interaction = createBaseInteraction({
      customId: "vac:rename-modal:voice-1",
      channel: { id: "voice-1", type: 2, edit: editMock },
      renameInput: "New Name",
    });

    await expect(
      vcPanelModalHandler.execute(interaction as never),
    ).rejects.toBe(apiError);
  });

  it("channel.edit で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する（limit）", async () => {
    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "PATCH",
      "/channels/voice-1",
      {},
    );
    const editMock = vi.fn().mockRejectedValue(apiError);
    const interaction = createBaseInteraction({
      customId: "vac:limit-modal:voice-1",
      channel: { id: "voice-1", type: 2, edit: editMock },
      limitInput: "5",
    });

    await expect(
      vcPanelModalHandler.execute(interaction as never),
    ).rejects.toBe(apiError);
  });

  it('数値に変換できない入力（"abc"）ではチャンネル編集を行わずバリデーションエラーを返すことを検証', async () => {
    const editMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createBaseInteraction({
      customId: "vac:limit-modal:voice-1",
      channel: { id: "voice-1", type: 2, edit: editMock },
      limitInput: "abc",
    });

    await vcPanelModalHandler.execute(interaction as never);

    expect(editMock).not.toHaveBeenCalled();
    expect(safeReply).toHaveBeenCalledWith(interaction, {
      embeds: [{ message: "vac:user-response.limit_out_of_range" }],
      flags: 64,
    });
  });
});
