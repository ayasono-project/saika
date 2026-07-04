// tests/unit/bot/commands/inactive-kick-settings.test.ts

import { ApplicationCommandOptionType, PermissionFlagsBits } from "discord.js";
import { inactiveKickSettingsCommand } from "@/bot/commands/inactive-kick-settings";

describe("bot/commands/inactive-kick-settings (definition)", () => {
  const json = inactiveKickSettingsCommand.data.toJSON();

  it("コマンド名と ManageGuild 既定権限が設定されている", () => {
    expect(json.name).toBe("inactive-kick-settings");
    expect(json.default_member_permissions).toBe(
      PermissionFlagsBits.ManageGuild.toString(),
    );
  });

  it("16 個のサブコマンドと whitelist・mention・tier サブコマンドグループを持つ", () => {
    const subcommands = (json.options ?? []).filter(
      (o) => o.type === ApplicationCommandOptionType.Subcommand,
    );
    const groups = (json.options ?? []).filter(
      (o) => o.type === ApplicationCommandOptionType.SubcommandGroup,
    );
    expect(subcommands).toHaveLength(16);
    expect(groups).toHaveLength(3);
    expect(groups.map((g) => g.name)).toContain("whitelist");
    expect(groups.map((g) => g.name)).toContain("mention");
    expect(groups.map((g) => g.name)).toContain("tier");
  });

  it("週/最終の事前メッセージ設定サブコマンドを持つ", () => {
    const names = (json.options ?? []).map((o) => o.name);
    expect(names).toContain("set-week-warn-message");
    expect(names).toContain("set-final-warn-message");
    expect(names).toContain("clear-week-warn-message");
    expect(names).toContain("clear-final-warn-message");
  });

  it("whitelist グループは add / remove / list を持つ", () => {
    const group = (json.options ?? []).find(
      (o) =>
        o.type === ApplicationCommandOptionType.SubcommandGroup &&
        o.name === "whitelist",
    );
    const subNames = (
      (group as { options?: Array<{ name: string }> }).options ?? []
    ).map((s) => s.name);
    expect(subNames).toEqual(["add", "remove", "list"]);
  });

  it("tier グループは set / remove / list を持ち、set は在籍日数・しきい値日数・活動判定・アクティブ条件のオプションを持つ", () => {
    const group = (json.options ?? []).find(
      (o) =>
        o.type === ApplicationCommandOptionType.SubcommandGroup &&
        o.name === "tier",
    ) as
      | { options?: Array<{ name: string } & Record<string, unknown>> }
      | undefined;
    const subNames = (group?.options ?? []).map((s) => s.name);
    expect(subNames).toEqual(["set", "remove", "list"]);

    const setSub = group?.options?.find((s) => s.name === "set") as
      | { options?: Array<Record<string, unknown>> }
      | undefined;
    const tenureOption = setSub?.options?.find((o) => o.name === "tenure-days");
    const thresholdOption = setSub?.options?.find(
      (o) => o.name === "threshold-days",
    );
    expect(tenureOption?.min_value).toBe(0);
    expect(tenureOption?.max_value).toBeUndefined();
    expect(tenureOption?.required).toBe(true);
    expect(thresholdOption?.min_value).toBe(14);
    expect(thresholdOption?.max_value).toBe(365);
    expect(thresholdOption?.required).toBe(true);

    const optionNames = (setSub?.options ?? []).map((o) => o.name);
    expect(optionNames).toEqual(
      expect.arrayContaining([
        "track-message",
        "track-voice",
        "track-reaction",
        "min-message-count",
        "min-voice-count",
        "min-reaction-count",
        "tenure-deadline",
      ]),
    );
  });
});
