// tests/unit/bot/features/vc-recruit/commands/usecases/vcRecruitConfigRemoveRole.test.ts
import { handleVcRecruitConfigRemoveRole } from "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigRemoveRole";
import { VC_RECRUIT_ROLE_CUSTOM_ID } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----

const getVcRecruitConfigOrDefaultMock = vi.fn();
const tInteractionMock = vi.fn(
  (_locale: string, key: string, _opts?: Record<string, unknown>) => key,
);
const tDefaultMock = vi.fn((key: string) => key);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitConfigService: () => ({
    getVcRecruitConfigOrDefault: (...args: unknown[]) =>
      getVcRecruitConfigOrDefaultMock(...args),
  }),
}));
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
    id: "interaction-456",
    locale: "ja",
    guild: hasGuild
      ? {
          id: GUILD_ID,
          roles: { cache: new Map([["role-1", { name: "TestRole" }]]) },
        }
      : null,
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

// handleVcRecruitConfigRemoveRole のギルドチェック・ロール0件エラー・StringSelectMenu 返信を検証
describe("bot/features/vc-recruit/commands/usecases/vcRecruitConfigRemoveRole", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guild が null の場合は ValidationError を投げる", async () => {
    const interaction = makeInteraction({ hasGuild: false });
    await expect(
      handleVcRecruitConfigRemoveRole(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("登録ロールが 0 件の場合は ValidationError を投げる", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      mentionRoleIds: [],
    });
    const interaction = makeInteraction();
    await expect(
      handleVcRecruitConfigRemoveRole(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("登録ロールがある場合は StringSelectMenu + ボタンをエフェメラルで返信する", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      mentionRoleIds: ["role-1"],
    });
    const interaction = makeInteraction();
    await handleVcRecruitConfigRemoveRole(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const call = interaction.reply.mock.calls[0][0];
    expect(call.components).toHaveLength(2);
    expect(call.flags).toBeDefined();
  });

  it("セレクトメニューの customId にセッション ID が含まれる", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      mentionRoleIds: ["role-1"],
    });
    const interaction = makeInteraction();
    await handleVcRecruitConfigRemoveRole(interaction as never, GUILD_ID);

    const call = interaction.reply.mock.calls[0][0];
    const selectRow = call.components[0];
    const selectJson = selectRow.toJSON();
    expect(selectJson.components[0].custom_id).toBe(
      `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_SELECT_PREFIX}${interaction.id}`,
    );
  });
});
