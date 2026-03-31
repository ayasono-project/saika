// tests/unit/bot/features/member-log/handlers/memberLogUtils.test.ts
import {
  formatAccountAge,
  formatCustomMessage,
} from "@/bot/features/member-log/handlers/memberLogUtils";

// memberLogUtils のプレースホルダー置換・アカウント年齢フォーマットを検証
describe("bot/features/member-log/handlers/memberLogUtils", () => {
  // formatCustomMessage：各プレースホルダーが正しく置換されることを検証
  describe("formatCustomMessage", () => {
    it("{userMention} が指定のメンション文字列に置換されることを確認", () => {
      const result = formatCustomMessage(
        "ようこそ {userMention}！",
        "<@123>",
        "Alice",
        10,
        "TestServer",
      );
      expect(result).toBe("ようこそ <@123>！");
    });

    it("{userName} が指定のユーザー名に置換されることを確認", () => {
      const result = formatCustomMessage(
        "さようなら {userName}",
        "<@456>",
        "Bob",
        5,
        "TestServer",
      );
      expect(result).toBe("さようなら Bob");
    });

    it("{memberCount} がメンバー数の文字列に置換されることを確認", () => {
      const result = formatCustomMessage(
        "現在 {memberCount} 人",
        "<@789>",
        "Carol",
        42,
        "TestServer",
      );
      expect(result).toBe("現在 42 人");
    });

    it("{serverName} がサーバー名に置換されることを確認", () => {
      const result = formatCustomMessage(
        "ようこそ {serverName} へ！",
        "<@123>",
        "Alice",
        10,
        "MyServer",
      );
      expect(result).toBe("ようこそ MyServer へ！");
    });

    it("複数のプレースホルダーが同時に置換されることを確認", () => {
      const result = formatCustomMessage(
        "{userMention}（{userName}）が{serverName}に参加。計{memberCount}人。",
        "<@111>",
        "Dave",
        100,
        "TestServer",
      );
      expect(result).toBe("<@111>（Dave）がTestServerに参加。計100人。");
    });

    it("同じプレースホルダーが複数ある場合にすべて置換されることを確認", () => {
      const result = formatCustomMessage(
        "{userMention} さん、{userMention} さん",
        "<@222>",
        "Eve",
        1,
        "TestServer",
      );
      expect(result).toBe("<@222> さん、<@222> さん");
    });

    it("プレースホルダーがない場合はテンプレートをそのまま返すことを確認", () => {
      const result = formatCustomMessage(
        "固定メッセージ",
        "<@333>",
        "Frank",
        7,
        "TestServer",
      );
      expect(result).toBe("固定メッセージ");
    });
  });

  // formatAccountAge：年・月・日の組み合わせで正しいフォーマット結果を返すことを検証
  describe("formatAccountAge", () => {
    const t = (key: string, opts?: { count?: number }) => {
      if (key === "memberLog:embed.field.value.age_years")
        return `${opts?.count}年`;
      if (key === "memberLog:embed.field.value.age_months")
        return `${opts?.count}ヶ月`;
      if (key === "memberLog:embed.field.value.age_days")
        return `${opts?.count}日`;
      if (key === "memberLog:embed.field.value.age_separator") return "";
      return key;
    };

    it("年・月・日がすべて正の値の場合にすべて結合して返すことを確認", () => {
      const result = formatAccountAge(2, 3, 15, t as never);
      expect(result).toBe("2年3ヶ月15日");
    });

    it("年が 0 の場合に年を省略して返すことを確認", () => {
      const result = formatAccountAge(0, 6, 10, t as never);
      expect(result).toBe("6ヶ月10日");
    });

    it("年・月がともに 0 の場合に日のみ返すことを確認", () => {
      const result = formatAccountAge(0, 0, 3, t as never);
      expect(result).toBe("3日");
    });

    it("年・月・日がすべて 0 の場合に「0日」を返すことを確認", () => {
      const result = formatAccountAge(0, 0, 0, t as never);
      expect(result).toBe("0日");
    });

    it("月が 0 の場合に月を省略して返すことを確認", () => {
      const result = formatAccountAge(1, 0, 5, t as never);
      expect(result).toBe("1年5日");
    });
  });
});
