// tests/unit/bot/services/botEventRegistration.test.ts
import { registerBotEvents } from "@/bot/services/botEventRegistration";

const loggerInfoMock = vi.fn();
const loggerDebugMock = vi.fn();
const registerBotEventMock = vi.fn();

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
  tDefault: vi.fn((key: string) => `default:${key}`),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    info: (...args: unknown[]) => loggerInfoMock(...args),
    debug: (...args: unknown[]) => loggerDebugMock(...args),
  },
}));

vi.mock("@/bot/types/discord", () => ({
  registerBotEvent: (...args: unknown[]) => registerBotEventMock(...args),
}));

describe("bot/services/botEventRegistration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("全イベントが登録されて進捗がログ出力されることを確認", () => {
    const client = {};
    const events = [
      { name: "ready", execute: vi.fn() },
      { name: "interactionCreate", execute: vi.fn() },
    ];

    registerBotEvents(client as never, events as never);

    expect(registerBotEventMock).toHaveBeenCalledTimes(2);
    expect(registerBotEventMock).toHaveBeenNthCalledWith(1, client, events[0]);
    expect(registerBotEventMock).toHaveBeenNthCalledWith(2, client, events[1]);
    // registering + event × 2 + registered = 4
    expect(loggerInfoMock).toHaveBeenCalledTimes(4);
    expect(loggerDebugMock).not.toHaveBeenCalled();
  });
});
