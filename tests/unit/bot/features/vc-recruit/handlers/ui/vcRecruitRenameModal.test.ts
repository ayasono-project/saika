// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitRenameModal.test.ts

import { ChannelType, MessageFlags } from "discord.js";
import { vcRecruitRenameModalHandler } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitRenameModal";

// ---- モック定義 ----

const safeReplyMock = vi.fn();
const tGuildMock = vi.fn(async (_guildId: string, key: string) => key);

vi.mock("@/bot/utils/interaction", () => ({
  safeReply: (...args: unknown[]) => safeReplyMock(...args),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: vi.fn((msg: string) => ({ warning: msg })),
  createSuccessEmbed: vi.fn((msg: string) => ({ success: msg })),
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
  tGuild: (...args: unknown[]) =>
    tGuildMock(...(args as Parameters<typeof tGuildMock>)),
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

// ---- 定数 ----

const GUILD_ID = "guild-1";
const VC_ID = "vc-1";
const MODAL_PREFIX = "vc-recruit:rename-vc-modal:";

// ---- ヘルパー ----

/** モーダル送信インタラクションのモックを生成する */
function makeModalInteraction(opts: {
  voiceChannelId?: string;
  hasGuild?: boolean;
  newName?: string;
}) {
  const {
    voiceChannelId = VC_ID,
    hasGuild = true,
    newName = "新しいVC名",
  } = opts;

  const setNameMock = vi.fn().mockResolvedValue(undefined);

  const guild = hasGuild
    ? {
        id: GUILD_ID,
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: voiceChannelId,
            type: ChannelType.GuildVoice,
            name: "元のVC名",
            setName: setNameMock,
          }),
        },
      }
    : null;

  return {
    customId: `${MODAL_PREFIX}${voiceChannelId}`,
    guild,
    fields: {
      getTextInputValue: vi.fn().mockReturnValue(newName),
    },
    _setNameMock: setNameMock,
  };
}

// ---- テスト ----

// matches() の検証
describe("vcRecruitRenameModalHandler / matches()", () => {
  it("rename-vc-modal プレフィックスに一致する", () => {
    expect(vcRecruitRenameModalHandler.matches(`${MODAL_PREFIX}${VC_ID}`)).toBe(
      true,
    );
  });

  it("無関係な customId には一致しない", () => {
    expect(vcRecruitRenameModalHandler.matches("vc-recruit:modal:abc")).toBe(
      false,
    );
    expect(vcRecruitRenameModalHandler.matches("unrelated")).toBe(false);
  });
});

// execute() の検証
describe("vcRecruitRenameModalHandler / execute()", () => {
  // beforeEach: 各テストの前にモックをリセットして副作用を分離する
  beforeEach(() => {
    vi.clearAllMocks();
    safeReplyMock.mockResolvedValue(undefined);
  });

  it("guild が null の場合は早期リターンして何もしない", async () => {
    const interaction = makeModalInteraction({ hasGuild: false });

    await vcRecruitRenameModalHandler.execute(interaction as never);

    expect(safeReplyMock).not.toHaveBeenCalled();
  });

  it("VC が存在する場合は名前を更新して成功メッセージを表示する", async () => {
    const interaction = makeModalInteraction({ newName: "新しい名前" });

    await vcRecruitRenameModalHandler.execute(interaction as never);

    // Assert: チャンネル名を更新
    expect(interaction._setNameMock).toHaveBeenCalledWith("新しい名前");
    // Assert: 成功メッセージを表示
    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ success: "vcRecruit:user-response.rename_success" }],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("VC が削除済みの場合はエラーメッセージを表示する", async () => {
    const interaction = makeModalInteraction({});

    // VC fetch が null を返す
    interaction.guild!.channels.fetch = vi.fn().mockResolvedValue(null);

    await vcRecruitRenameModalHandler.execute(interaction as never);

    // Assert: setName は呼ばれない
    expect(interaction._setNameMock).not.toHaveBeenCalled();
    // Assert: エラーメッセージを表示
    expect(safeReplyMock).toHaveBeenCalledWith(
      interaction,
      expect.objectContaining({
        embeds: [{ warning: "vcRecruit:user-response.vc_already_deleted" }],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });
});
