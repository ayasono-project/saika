// tests/unit/bot/commands/index.test.ts
// commandLoader が commands/ ディレクトリを自動スキャンして
// 有効な Command オブジェクトのみを返すことを検証する

import { loadCommands } from "@/bot/utils/commandLoader";

// コマンドファイルが依存する外部モジュールをスタブ化（実行時コストを削減）
vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: vi.fn(() => ({
    ja: "test-description",
    localizations: {},
  })),
  getChoiceLocalizations: vi
    .fn()
    .mockImplementation((_ns: string, _key: string, value: string) => ({
      name: "test",
      name_localizations: { "en-US": "test", "en-GB": "test" },
      value,
    })),
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
  tShared: vi.fn((key: string) => key),
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/prisma", () => ({
  getPrismaClient: vi.fn(),
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotCompositionRoot: vi.fn(() => ({
    afkService: {},
    memberLogService: {},
    bumpReminderService: {},
    messageDeleteService: {},
    stickyMessageService: {},
    vacService: {},
  })),
  getBotTicketConfigService: vi.fn(() => ({})),
  getBotTicketRepository: vi.fn(() => ({})),
}));
vi.mock("@/bot/features/ticket/services/ticketAutoDeleteService", () => ({
  scheduleTicketAutoDelete: vi.fn(),
  cancelTicketAutoDelete: vi.fn(),
  restoreAutoDeleteTimers: vi.fn(),
}));
vi.mock("@/bot/features/ticket/services/ticketService", () => ({
  createTicketChannel: vi.fn(),
  closeTicket: vi.fn(),
  reopenTicket: vi.fn(),
  deleteTicket: vi.fn(),
  hasTicketPermission: vi.fn(),
  hasStaffRole: vi.fn(),
}));

// 現在 commands/ に登録済みのコマンド名（新規追加時はここへの手動追加不要）
const KNOWN_COMMAND_NAMES = [
  "afk",
  "afk-config",
  "bump-reminder-config",
  "member-log-config",
  "message-delete",
  "sticky-message",
  "ticket",
  "ticket-config",
  "vc",
  "vac-config",
  "vc-recruit-config",
  "ping",
];

describe("commandLoader", () => {
  // loadCommands() は全コマンドファイルを動的ロードするため高コスト。
  // テスト間で結果をキャッシュし、初回のみ実行する。
  let cachedCommands: Awaited<ReturnType<typeof loadCommands>>;
  beforeAll(async () => {
    cachedCommands = await loadCommands();
  }, 30_000);

  it("commands/ ディレクトリから Command オブジェクトを自動ロードする", () => {
    expect(cachedCommands.length).toBeGreaterThan(0);
  });

  it("ロードされた各コマンドは data と execute を持つ", () => {
    for (const cmd of cachedCommands) {
      expect(cmd.data).toBeDefined();
      expect(typeof cmd.execute).toBe("function");
      expect(typeof cmd.data.name).toBe("string");
    }
  });

  it("コマンド名が重複していない（export default との二重収集がない）", () => {
    const names = cachedCommands.map((c) => c.data.name);
    const uniqueNames = new Set(names);

    // export default と named export の両方を持つファイルで同一コマンドが二重登録されないことを保証
    expect(names.length).toBe(uniqueNames.size);
  });

  it("既知のコマンドがすべて含まれている", () => {
    const names = cachedCommands.map((c) => c.data.name);

    for (const expectedName of KNOWN_COMMAND_NAMES) {
      expect(names).toContain(expectedName);
    }
  });

  // commands ディレクトリが存在しない場合に ENOENT を詳細メッセージ付きで再スローすることを確認
  it("存在しないパスを指定すると ENOENT 専用メッセージで投げる", async () => {
    await expect(
      loadCommands("/absolutely/nonexistent/xyz/commands"),
    ).rejects.toThrow("[commandLoader]");
  });

  // ENOENT 以外のエラー（ファイルをパスに指定 → ENOTDIR）はそのまま再スローすることを確認
  it("ENOENT 以外のファイルシステムエラーはそのまま再スローする", async () => {
    // import.meta.url はこのファイル自体のパス（ファイルなのでディレクトリとして読もうとすると ENOTDIR）
    const thisFilePath = new URL(import.meta.url).pathname;
    await expect(loadCommands(thisFilePath)).rejects.not.toThrow(
      "[commandLoader]",
    );
    await expect(loadCommands(thisFilePath)).rejects.toThrow();
  });
});
