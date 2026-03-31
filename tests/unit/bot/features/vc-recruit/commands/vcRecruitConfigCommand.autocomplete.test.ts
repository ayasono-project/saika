// tests/unit/bot/features/vc-recruit/commands/vcRecruitConfigCommand.autocomplete.test.ts
import { autocompleteVcRecruitConfigCommand } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.autocomplete";
import { VC_RECRUIT_CONFIG_COMMAND } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants";

const mockRespondCategoryAutocomplete = vi.fn();
vi.mock("@/bot/utils/categoryAutocomplete", () => ({
  respondCategoryAutocomplete: (...args: unknown[]) =>
    mockRespondCategoryAutocomplete(...args),
}));

describe("bot/features/vc-recruit/commands/vcRecruitConfigCommand.autocomplete", () => {
  it("正しいオプションで respondCategoryAutocomplete に処理を委譲する", async () => {
    const interaction = {
      commandName: VC_RECRUIT_CONFIG_COMMAND.NAME,
    } as never;

    await autocompleteVcRecruitConfigCommand(interaction);

    expect(mockRespondCategoryAutocomplete).toHaveBeenCalledWith(interaction, {
      commandName: VC_RECRUIT_CONFIG_COMMAND.NAME,
      subcommands: [VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.SETUP],
      topLocaleKey: "vcRecruit:vc-recruit-config.setup.category.top",
      topValue: VC_RECRUIT_CONFIG_COMMAND.TARGET.TOP,
    });
  });
});
