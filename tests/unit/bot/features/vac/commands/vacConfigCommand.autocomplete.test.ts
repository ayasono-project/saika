// tests/unit/bot/features/vac/commands/vacConfigCommand.autocomplete.test.ts
import { autocompleteVacConfigCommand } from "@/bot/features/vac/commands/vacConfigCommand.autocomplete";
import { VAC_CONFIG_COMMAND } from "@/bot/features/vac/commands/vacConfigCommand.constants";

const mockRespondCategoryAutocomplete = vi.fn();
vi.mock("@/bot/utils/categoryAutocomplete", () => ({
  respondCategoryAutocomplete: (...args: unknown[]) =>
    mockRespondCategoryAutocomplete(...args),
}));

describe("bot/features/vac/commands/vacConfigCommand.autocomplete", () => {
  it("正しいオプションでrespondCategoryAutocompleteへ委譲する", async () => {
    const interaction = { commandName: VAC_CONFIG_COMMAND.NAME } as never;

    await autocompleteVacConfigCommand(interaction);

    expect(mockRespondCategoryAutocomplete).toHaveBeenCalledWith(interaction, {
      commandName: VAC_CONFIG_COMMAND.NAME,
      subcommands: [
        VAC_CONFIG_COMMAND.SUBCOMMAND.CREATE_TRIGGER,
        VAC_CONFIG_COMMAND.SUBCOMMAND.REMOVE_TRIGGER,
      ],
      topLocaleKey: "vac:vac-config.remove-trigger-vc.category.top",
      topValue: VAC_CONFIG_COMMAND.TARGET.TOP,
    });
  });
});
