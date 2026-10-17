// Composition Root の登録漏れを検出するテスト

import type { PrismaClient } from "@prisma/client";
import * as compositionRoot from "@/bot/services/botCompositionRoot";

// 登録漏れは typecheck でも機能ごとのテストでも見つからず、本番で初めて
// `not initialized` で落ちる。初期化後にすべての getter が値を返すことだけを確かめる
describe("bot/services/botCompositionRoot", () => {
  it("初期化すると、すべての getBot* が登録済みの値を返すこと", () => {
    compositionRoot.initializeBotCompositionRoot({} as PrismaClient);

    const getters = Object.entries(compositionRoot).filter(([name]) =>
      name.startsWith("getBot"),
    );

    expect(getters.length).toBeGreaterThan(0);
    for (const [name, getter] of getters) {
      expect(() => (getter as () => unknown)(), name).not.toThrow();
    }
  });
});
