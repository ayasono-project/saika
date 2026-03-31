// tests/unit/shared/locale/logPrefixed.test.ts
// logPrefixed / logCommand ヘルパー関数のテスト

import {
  localeManager,
  logCommand,
  logPrefixed,
} from "@/shared/locale/localeManager";

// i18n 依存の翻訳結果を検証するためロケールを初期化
beforeAll(async () => {
  await localeManager.initialize();
});

describe("logPrefixed", () => {
  it("基本形式: [prefix] message の形式で返すこと", () => {
    const result = logPrefixed(
      "system:log_prefix.bump_reminder",
      "bumpReminder:log.detected",
      { guildId: "123", service: "disboard" },
    );

    expect(result).toBe(
      "[Bumpリマインダー] Bumpを検知 GuildId: 123 Service: disboard",
    );
  });

  it("補間パラメータがメッセージに正しく展開されること", () => {
    const result = logPrefixed(
      "system:log_prefix.interaction_create",
      "system:interaction.command_executed",
      { commandName: "/test", userId: "456" },
    );

    expect(result).toBe(
      "[interactionCreate] コマンド実行 CommandName: /test UserId: 456",
    );
  });

  it("サブプレフィックス付き: [prefix:sub] message の形式で返すこと", () => {
    const result = logPrefixed(
      "system:log_prefix.interaction_create",
      "system:interaction.command_executed",
      { commandName: "/test", userId: "456" },
      "command",
    );

    expect(result).toBe(
      "[interactionCreate:command] コマンド実行 CommandName: /test UserId: 456",
    );
  });

  it("サブプレフィックスとパラメータの両方が正しく動作すること", () => {
    const result = logPrefixed(
      "system:log_prefix.bump_reminder",
      "bumpReminder:log.detected",
      { guildId: "999", service: "dissoku" },
      "check",
    );

    expect(result).toBe(
      "[Bumpリマインダー:check] Bumpを検知 GuildId: 999 Service: dissoku",
    );
  });
});

describe("logCommand", () => {
  it("基本形式: [/command-name] message の形式で返すこと", () => {
    const result = logCommand(
      "/message-delete",
      "messageDelete:log.lock_acquired",
      { guildId: "789" },
    );

    expect(result).toBe("[/message-delete] ロック取得: guild=789");
  });

  it("補間パラメータがメッセージに正しく展開されること", () => {
    const result = logCommand("/bump-reminder", "bumpReminder:log.detected", {
      guildId: "321",
      service: "disboard",
    });

    expect(result).toBe(
      "[/bump-reminder] Bumpを検知 GuildId: 321 Service: disboard",
    );
  });
});
