// tests/unit/features/vc-auto-recruit/vcAutoRecruitMessageBuilder.test.ts
// VC自動募集の content / Embed / ボタン生成を検証

import { ButtonStyle } from "discord.js";
import {
  buildEndedComponents,
  buildInviteEmbed,
  buildJoinComponents,
  formatInviteMessage,
} from "@/features/vc-auto-recruit/handlers/vcAutoRecruitMessageBuilder";
import type { GuildTFunction } from "@/shared/locale/helpers";

// 翻訳キーをそのまま返すスタブ翻訳関数
const t: GuildTFunction = ((key: string) => key) as unknown as GuildTFunction;

describe("features/vc-auto-recruit/vcAutoRecruitMessageBuilder", () => {
  describe("formatInviteMessage", () => {
    it("全プレースホルダーを実値へ置換すること", () => {
      const result = formatInviteMessage(
        "{userMention} が {channelMention}（{channelName}）で通話開始！ by {userName} @ {serverName}",
        {
          userMention: "<@u1>",
          userName: "しゅん",
          channelMention: "<#vc1>",
          channelName: "雑談",
          serverName: "彩園",
        },
      );

      expect(result).toBe(
        "<@u1> が <#vc1>（雑談）で通話開始！ by しゅん @ 彩園",
      );
    });

    it("同一プレースホルダーが複数あってもすべて置換すること", () => {
      const result = formatInviteMessage("{userName}{userName}", {
        userMention: "<@u1>",
        userName: "X",
        channelMention: "<#vc1>",
        channelName: "vc",
        serverName: "s",
      });

      expect(result).toBe("XX");
    });
  });

  describe("buildInviteEmbed", () => {
    it("VC・開始者フィールドとサムネイルを持つ Embed を生成すること", () => {
      const embed = buildInviteEmbed(t, {
        voiceChannelId: "vc-1",
        starterUserId: "u-1",
        starterAvatarUrl: "https://example.com/a.png",
      });

      const data = embed.toJSON();
      expect(data.title).toBe("vcAutoRecruit:embed.title.invite");
      expect(data.thumbnail?.url).toBe("https://example.com/a.png");
      expect(data.fields).toEqual([
        {
          name: "vcAutoRecruit:embed.field.name.invite_channel",
          value: "<#vc-1>",
          inline: true,
        },
        {
          name: "vcAutoRecruit:embed.field.name.invite_starter",
          value: "<@u-1>",
          inline: true,
        },
      ]);
    });
  });

  describe("buildJoinComponents", () => {
    it("チャンネルジャンプ URL を持つ Link ボタンを生成すること", () => {
      const row = buildJoinComponents(t, "g-1", "vc-1").toJSON();
      const button = row.components[0] as {
        style: number;
        url?: string;
        label?: string;
      };

      expect(button.style).toBe(ButtonStyle.Link);
      expect(button.url).toBe("https://discord.com/channels/g-1/vc-1");
      expect(button.label).toBe("vcAutoRecruit:ui.button.join");
    });
  });

  describe("buildEndedComponents", () => {
    it("押下不可（disabled）の募集終了ボタンを生成すること", () => {
      const row = buildEndedComponents(t).toJSON();
      const button = row.components[0] as {
        style: number;
        disabled?: boolean;
        custom_id?: string;
        label?: string;
      };

      expect(button.style).toBe(ButtonStyle.Secondary);
      expect(button.disabled).toBe(true);
      expect(button.custom_id).toBe("vc-auto-recruit:ended");
      expect(button.label).toBe("vcAutoRecruit:ui.button.ended");
    });
  });
});
