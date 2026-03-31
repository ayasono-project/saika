// tests/unit/bot/features/vc-recruit/commands/usecases/vcRecruitConfigAddRole.test.ts
import { handleVcRecruitConfigAddRole } from "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigAddRole";
import { VC_RECRUIT_ROLE_CUSTOM_ID } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----

const tInteractionMock = vi.fn(
  (_locale: string, key: string, _opts?: Record<string, unknown>) => key,
);
const tDefaultMock = vi.fn((key: string) => key);

vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
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
  tInteraction: (...args: unknown[]) =>
    tInteractionMock(...(args as Parameters<typeof tInteractionMock>)),
  tDefault: (...args: unknown[]) =>
    tDefaultMock(...(args as Parameters<typeof tDefaultMock>)),
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";

function makeInteraction(opts: { hasGuild?: boolean } = {}) {
  const { hasGuild = true } = opts;
  return {
    id: "interaction-123",
    locale: "ja",
    guild: hasGuild ? { id: GUILD_ID } : null,
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

// handleVcRecruitConfigAddRole のギルドチェック・RoleSelectMenu 返信・customId 構造を検証
describe("bot/features/vc-recruit/commands/usecases/vcRecruitConfigAddRole", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guild が null の場合は ValidationError を投げる", async () => {
    const interaction = makeInteraction({ hasGuild: false });
    await expect(
      handleVcRecruitConfigAddRole(interaction as never),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("RoleSelectMenu とボタンをエフェメラルで返信する", async () => {
    const interaction = makeInteraction();
    await handleVcRecruitConfigAddRole(interaction as never);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const call = interaction.reply.mock.calls[0][0];
    // コンポーネントが2行（セレクト + ボタン）
    expect(call.components).toHaveLength(2);
    // エフェメラル
    expect(call.flags).toBeDefined();
  });

  it("セレクトメニューの customId にセッション ID が含まれる", async () => {
    const interaction = makeInteraction();
    await handleVcRecruitConfigAddRole(interaction as never);

    const call = interaction.reply.mock.calls[0][0];
    const selectRow = call.components[0];
    const selectJson = selectRow.toJSON();
    expect(selectJson.components[0].custom_id).toBe(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_SELECT_PREFIX}${interaction.id}`,
    );
  });
});
