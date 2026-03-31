// tests/unit/bot/features/reaction-role/commands/usecases/reactionRoleConfigSetup.test.ts

const sessionSetMock: ReturnType<typeof vi.fn> = vi.fn();

vi.mock(
  "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState",
  () => ({
    reactionRoleSetupSessions: {
      set: sessionSetMock,
      get: vi.fn(),
      delete: vi.fn(),
    },
  }),
);

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (p: string, m: string, params?: Record<string, unknown>) =>
    params ? `[${p}] ${m}:${JSON.stringify(params)}` : `[${p}] ${m}`,
  tDefault: vi.fn((key: string) => key),
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

function createInteractionMock(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    guildId: "guild-1",
    locale: "ja",
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/reaction-role/commands/usecases/reactionRoleConfigSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("セッションが正しいデフォルト値で作成されること", async () => {
    const { handleReactionRoleConfigSetup } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigSetup"
    );

    const interaction = createInteractionMock();

    await handleReactionRoleConfigSetup(interaction as never, "guild-1");

    expect(sessionSetMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        title: "",
        description: "",
        color: "#00A8F3",
        mode: "",
        buttons: [],
        buttonCounter: 0,
      }),
    );
  });

  it("モーダルのcustomIdにSETUP_MODAL_PREFIXが含まれること", async () => {
    const { handleReactionRoleConfigSetup } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigSetup"
    );

    const interaction = createInteractionMock();

    await handleReactionRoleConfigSetup(interaction as never, "guild-1");

    expect(interaction.showModal).toHaveBeenCalledTimes(1);
    const modal = (interaction.showModal as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(modal.data.custom_id).toContain("reaction-role:setup-modal:");
  });

  it("モーダルにタイトル・説明・カラーの3フィールドが含まれること", async () => {
    const { handleReactionRoleConfigSetup } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigSetup"
    );

    const interaction = createInteractionMock();

    await handleReactionRoleConfigSetup(interaction as never, "guild-1");

    const modal = (interaction.showModal as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(modal.components).toHaveLength(3);

    const fieldCustomIds = modal.components.map(
      (row: { components: { data: { custom_id: string } }[] }) =>
        row.components[0].data.custom_id,
    );
    expect(fieldCustomIds).toContain("reaction-role:setup-title");
    expect(fieldCustomIds).toContain("reaction-role:setup-description");
    expect(fieldCustomIds).toContain("reaction-role:setup-color");
  });

  it("showModalが呼ばれること", async () => {
    const { handleReactionRoleConfigSetup } = await import(
      "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigSetup"
    );

    const interaction = createInteractionMock();

    await handleReactionRoleConfigSetup(interaction as never, "guild-1");

    expect(interaction.showModal).toHaveBeenCalledTimes(1);
  });
});
