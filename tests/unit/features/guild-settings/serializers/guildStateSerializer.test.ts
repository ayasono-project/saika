// tests/unit/shared/database/repositories/serializers/guildStateSerializer.test.ts
import {
  fromOpenTicketExport,
  fromReactionRolePanelExport,
  fromStickyMessageExport,
  fromTicketSettingsExport,
  mergeVacCreatedChannels,
  toOpenTicketExport,
  toReactionRolePanelExport,
  toStickyMessageExport,
  toTicketSettingsExport,
} from "@/features/guild-settings/serializers/guildStateSerializer";
import type {
  GuildReactionRolePanel,
  GuildTicketSettings,
  StickyMessage,
  Ticket,
  VacChannelPair,
} from "@/shared/database/types";

// stateful データの DB ↔ export 間変換ロジックを検証する
describe("shared/database/repositories/serializers/guildStateSerializer", () => {
  // ── GuildTicketSettings ────────────────────────────────
  describe("toTicketSettingsExport / fromTicketSettingsExport", () => {
    const dbConfig: GuildTicketSettings = {
      guildId: "guild-1",
      categoryId: "cat-1",
      enabled: true,
      staffRoleIds: '["role-1","role-2"]',
      panelChannelId: "ch-1",
      panelMessageId: "msg-1",
      panelTitle: "サポート",
      panelDescription: "説明",
      panelColor: "#00A8F3",
      autoDeleteDays: 7,
      maxTicketsPerUser: 1,
      ticketCounter: 12,
    };

    it("toTicketSettingsExport が staffRoleIds をパースして guildId を除外すること", () => {
      const result = toTicketSettingsExport(dbConfig);
      expect(result).toEqual({
        categoryId: "cat-1",
        enabled: true,
        staffRoleIds: ["role-1", "role-2"],
        panelChannelId: "ch-1",
        panelMessageId: "msg-1",
        panelTitle: "サポート",
        panelDescription: "説明",
        panelColor: "#00A8F3",
        autoDeleteDays: 7,
        maxTicketsPerUser: 1,
        ticketCounter: 12,
      });
    });

    it("fromTicketSettingsExport が staffRoleIds を再シリアライズして guildId を付与すること", () => {
      const exportData = toTicketSettingsExport(dbConfig);
      const result = fromTicketSettingsExport("guild-1", exportData);
      expect(result).toEqual(dbConfig);
    });

    it("toTicketSettingsExport が空配列 staffRoleIds を扱えること", () => {
      const config = { ...dbConfig, staffRoleIds: "[]" };
      expect(toTicketSettingsExport(config).staffRoleIds).toEqual([]);
    });
  });

  // ── Ticket (open) ────────────────────────────────────
  describe("toOpenTicketExport / fromOpenTicketExport", () => {
    const dbTicket: Ticket = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "cat-1",
      channelId: "ch-1",
      userId: "user-1",
      ticketNumber: 5,
      subject: "テスト",
      status: "open",
      elapsedDeleteMs: 0,
      closedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("toOpenTicketExport が id/createdAt/updatedAt/status/guildId/closedAt を除外すること", () => {
      const result = toOpenTicketExport(dbTicket);
      expect(result).toEqual({
        categoryId: "cat-1",
        channelId: "ch-1",
        userId: "user-1",
        ticketNumber: 5,
        subject: "テスト",
        elapsedDeleteMs: 0,
      });
    });

    it("fromOpenTicketExport が status='open' と closedAt=null を付与すること", () => {
      const exportData = toOpenTicketExport(dbTicket);
      const result = fromOpenTicketExport("guild-1", exportData);
      expect(result).toEqual({
        guildId: "guild-1",
        categoryId: "cat-1",
        channelId: "ch-1",
        userId: "user-1",
        ticketNumber: 5,
        subject: "テスト",
        status: "open",
        elapsedDeleteMs: 0,
        closedAt: null,
      });
    });
  });

  // ── StickyMessage ────────────────────────────────────
  describe("toStickyMessageExport / fromStickyMessageExport", () => {
    const dbSticky: StickyMessage = {
      id: "sticky-1",
      guildId: "guild-1",
      channelId: "ch-1",
      content: "ルール",
      embedData: '{"title":"test"}',
      updatedBy: "user-1",
      lastMessageId: "msg-99",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("toStickyMessageExport が embedData を JSON 文字列のまま透過すること", () => {
      const result = toStickyMessageExport(dbSticky);
      expect(result).toEqual({
        channelId: "ch-1",
        content: "ルール",
        embedData: '{"title":"test"}',
        updatedBy: "user-1",
        lastMessageId: "msg-99",
      });
    });

    it("toStickyMessageExport が embedData=null をそのまま透過すること", () => {
      const sticky = { ...dbSticky, embedData: null };
      expect(toStickyMessageExport(sticky).embedData).toBeNull();
    });

    it("fromStickyMessageExport が guildId を付与すること", () => {
      const exportData = toStickyMessageExport(dbSticky);
      const result = fromStickyMessageExport("guild-1", exportData);
      expect(result).toEqual({
        guildId: "guild-1",
        channelId: "ch-1",
        content: "ルール",
        embedData: '{"title":"test"}',
        updatedBy: "user-1",
        lastMessageId: "msg-99",
      });
    });
  });

  // ── GuildReactionRolePanel ───────────────────────────
  describe("toReactionRolePanelExport / fromReactionRolePanelExport", () => {
    const buttonsRaw = [
      {
        buttonId: 1,
        label: "通知",
        emoji: "",
        style: "Primary",
        roleIds: ["role-1"],
      },
    ];
    const dbPanel: GuildReactionRolePanel = {
      id: "panel-1",
      guildId: "guild-1",
      channelId: "ch-1",
      messageId: "msg-1",
      mode: "toggle",
      title: "ロール選択",
      description: "説明",
      color: "#00A8F3",
      buttons: JSON.stringify(buttonsRaw),
      buttonCounter: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it("toReactionRolePanelExport が buttons をパースすること", () => {
      const result = toReactionRolePanelExport(dbPanel);
      expect(result.buttons).toEqual(buttonsRaw);
      expect(result).not.toHaveProperty("id");
      expect(result).not.toHaveProperty("guildId");
    });

    it("fromReactionRolePanelExport が buttons を再シリアライズすること", () => {
      const exportData = toReactionRolePanelExport(dbPanel);
      const result = fromReactionRolePanelExport("guild-1", exportData);
      expect(result.buttons).toBe(JSON.stringify(buttonsRaw));
      expect(result.guildId).toBe("guild-1");
    });

    it("round-trip で内容が一致すること", () => {
      const exportData = toReactionRolePanelExport(dbPanel);
      const result = fromReactionRolePanelExport("guild-1", exportData);
      expect(result).toEqual({
        guildId: "guild-1",
        channelId: dbPanel.channelId,
        messageId: dbPanel.messageId,
        mode: dbPanel.mode,
        title: dbPanel.title,
        description: dbPanel.description,
        color: dbPanel.color,
        buttons: dbPanel.buttons,
        buttonCounter: dbPanel.buttonCounter,
      });
    });
  });

  // ── VAC createdChannels マージ ───────────────────────
  describe("mergeVacCreatedChannels", () => {
    const existing: VacChannelPair[] = [
      { voiceChannelId: "vc-1", ownerId: "user-1", createdAt: 100 },
    ];

    it("既存にない voiceChannelId だけを追加すること", () => {
      const incoming: VacChannelPair[] = [
        { voiceChannelId: "vc-1", ownerId: "user-X", createdAt: 999 },
        { voiceChannelId: "vc-2", ownerId: "user-2", createdAt: 200 },
      ];
      const result = mergeVacCreatedChannels(existing, incoming);
      expect(result).toEqual([
        { voiceChannelId: "vc-1", ownerId: "user-1", createdAt: 100 },
        { voiceChannelId: "vc-2", ownerId: "user-2", createdAt: 200 },
      ]);
    });

    it("既存値は変更しないこと（同一 voiceChannelId は incoming を無視）", () => {
      const incoming: VacChannelPair[] = [
        { voiceChannelId: "vc-1", ownerId: "user-X", createdAt: 999 },
      ];
      const result = mergeVacCreatedChannels(existing, incoming);
      expect(result).toEqual(existing);
    });

    it("空配列同士をマージしても空配列が返ること", () => {
      expect(mergeVacCreatedChannels([], [])).toEqual([]);
    });
  });
});
