// tests/unit/shared/utils/discordWebhookTransport.test.ts
// DiscordWebhookTransport の Webhook 送信・エラー耐性・description 組み立てロジックを検証する

import type { Mock } from "vitest";
import { DiscordWebhookTransport } from "@/shared/utils/discordWebhookTransport";
import { name as PROJECT_NAME } from "../../../../package.json";

// i18next をモックして t() が期待値を返すようにする
vi.mock("i18next", () => ({
  default: {
    t: vi.fn((key: string, opts?: Record<string, unknown>) =>
      key === "system:discord.error_notification_title"
        ? `🚨 ${String(opts?.appName ?? "")} エラー通知`
        : key,
    ),
  },
}));

const TEST_WEBHOOK_URL = "https://discord.com/api/webhooks/123/token";

// Discord Embed の description 文字数上限
const MAX_DESC_LENGTH = 4096;

describe("shared/utils/discordWebhookTransport", () => {
  let fetchMock: Mock;

  // 各テスト前後でグローバル fetch をスタブ化・リストアする
  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("level が 'error' であること（error レベルのログのみで発火する）", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    expect(transport.level).toBe("error");
  });

  // コールバックが同期的に呼ばれることで後続のトランスポート処理をブロックしないことを確認する
  it("コールバックが同期的に呼ばれること", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    transport.log({ level: "error", message: "fail" }, callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("正しい Webhook URL と メソッドで fetch が呼ばれること", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    transport.log({ level: "error", message: "boom" }, callback);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      TEST_WEBHOOK_URL,
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("タイトル・カラー・タイムスタンプを含む正しい Embed ペイロードを送信すること", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    transport.log({ level: "error", message: "boom" }, callback);

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { title: string; color: number; timestamp: string }[];
    };
    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0]?.title).toBe(`🚨 ${PROJECT_NAME} エラー通知`);
    expect(body.embeds[0]?.color).toBe(0xe74c3c);
    expect(body.embeds[0]?.timestamp).toBeDefined();
  });

  // description に message が含まれることを確認（エラー内容の可視性保証）
  it("Embed の description に message が含まれること", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    transport.log({ level: "error", message: "test error message" }, callback);

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { description: string }[];
    };
    expect(body.embeds[0]?.description).toContain("test error message");
  });

  // stack が存在する場合は コードブロック形式でdescription に付記されることを確認する
  it("stack が存在する場合は description にコードブロック形式で付記されること", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    transport.log(
      { level: "error", message: "fail", stack: "Error\n  at foo (bar.ts:1)" },
      callback,
    );

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { description: string }[];
    };
    expect(body.embeds[0]?.description).toContain("```");
    expect(body.embeds[0]?.description).toContain("Error\n  at foo (bar.ts:1)");
  });

  it("stack が存在しない場合は description にコードブロックを含めないこと", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    transport.log({ level: "error", message: "no stack" }, callback);

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { description: string }[];
    };
    expect(body.embeds[0]?.description).not.toContain("```");
  });

  // 4096文字を超えるdescriptionが "..." に切り詰められ、Discord文字数上限を守ることを確認する
  it("4096 文字を超える description が '...' に切り詰められること", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();
    const longMessage = "a".repeat(MAX_DESC_LENGTH + 100);

    transport.log({ level: "error", message: longMessage }, callback);

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { description: string }[];
    };
    const desc = body.embeds[0]?.description ?? "";
    expect(desc.length).toBeLessThanOrEqual(MAX_DESC_LENGTH);
    expect(desc.endsWith("...")).toBe(true);
  });

  // 4096文字ちょうどの場合は切り詰めが発生しないことを境界値テストで確認する
  it("description がちょうど 4096 文字の場合は切り詰めが発生しないこと", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();
    // "**" + message + "**" が 4096文字になるようメッセージ長を調整する
    const msg = "a".repeat(MAX_DESC_LENGTH - 4); // "**" x2 = 4文字

    transport.log({ level: "error", message: msg }, callback);

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { description: string }[];
    };
    const desc = body.embeds[0]?.description ?? "";
    expect(desc.length).toBe(MAX_DESC_LENGTH);
    expect(desc.endsWith("...")).toBe(false);
  });

  // fetch 失敗時はアプリをクラッシュさせず、stderrにのみ記録することを確認する
  it("fetch エラーをスローせずに安全に処理すること", async () => {
    fetchMock.mockRejectedValue(new Error("Network error"));
    const stderrSpy = vi
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    // fetch は非同期なので、catch が実行されるまで待機する
    await expect(
      Promise.resolve(
        transport.log({ level: "error", message: "fail" }, callback),
      ).then(() => new Promise((resolve) => setTimeout(resolve, 10))),
    ).resolves.not.toThrow();

    // Promise.reject が catch されるまで待機
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[DiscordWebhookTransport] Failed to send webhook",
      ),
    );

    stderrSpy.mockRestore();
  });

  // "logged" イベントが非同期で発行されることを確認する（Winston の規約準拠）
  it("ログ後に 'logged' イベントが発行されること", async () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();
    const loggedHandler = vi.fn();
    transport.on("logged", loggedHandler);

    const info = { level: "error", message: "event test" };
    transport.log(info, callback);

    // setImmediate で発行されるため、次のマイクロタスクサイクルまで待機する
    await new Promise((resolve) => setImmediate(resolve));

    expect(loggedHandler).toHaveBeenCalledWith(info);
  });

  it("message が文字列以外（数値）の場合に String() で変換されることを確認する（type guard の false ブランチ）", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    // message に数値を渡して非文字列パスを通す
    transport.log({ level: "error", message: 42 }, callback);

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { description: string }[];
    };
    expect(body.embeds[0]?.description).toContain("42");
  });

  it("message が undefined の場合に空文字列へフォールバックすることを確認する（nullish coalescing の右辺ブランチ）", () => {
    const transport = new DiscordWebhookTransport(TEST_WEBHOOK_URL);
    const callback = vi.fn();

    // message を省略して undefined パスを通す
    transport.log({ level: "error" }, callback);

    const fetchArgs = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(fetchArgs[1].body as string) as {
      embeds: { description: string }[];
    };
    // 空文字列を String() した結果は "**" のみになる
    expect(body.embeds[0]?.description).toBe("****");
  });
});
