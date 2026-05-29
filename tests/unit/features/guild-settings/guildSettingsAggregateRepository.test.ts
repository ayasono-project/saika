// tests/unit/shared/database/repositories/guildSettingsAggregateRepository.test.ts
// GuildSettingsAggregateRepository の stateful 拡張（getFullSettings / importFullSettings / planImportMerge）を検証

import type { Mock } from "vitest";
import { GuildSettingsAggregateRepository } from "@/features/guild-settings/guildSettingsAggregateRepository";
import type {
  FullGuildSettings,
  GuildReactionRolePanel,
  GuildTicketSettings,
  StickyMessage,
  Ticket,
  VacChannelPair,
} from "@/shared/database/types";

// 各リポジトリ依存をモック化したシンプルな単体テスト
describe("shared/database/repositories/guildSettingsAggregateRepository", () => {
  let coreRepo: {
    getSettings: Mock;
    updateSettings: Mock;
  };
  let afkRepo: { getAfkSettings: Mock; updateAfkSettings: Mock };
  let bumpReminderRepo: {
    getBumpReminderSettings: Mock;
    updateBumpReminderSettings: Mock;
  };
  let vacRepo: { getVacSettings: Mock; updateVacSettings: Mock };
  let memberLogRepo: {
    getMemberLogSettings: Mock;
    updateMemberLogSettings: Mock;
  };
  let vcRecruitRepo: {
    getVcRecruitSettings: Mock;
    updateVcRecruitSettings: Mock;
  };
  let stickyMessageRepo: { findAllByGuild: Mock };
  let reactionRolePanelRepo: { findAllByGuild: Mock };
  let ticketSettingsRepo: { findAllByGuild: Mock };
  let ticketRepo: { findAllOpenByGuild: Mock };
  let prismaTx: Record<string, Record<string, Mock>>;
  let prisma: { $transaction: Mock };
  let repo: GuildSettingsAggregateRepository;

  beforeEach(() => {
    coreRepo = {
      getSettings: vi.fn(),
      updateSettings: vi.fn(),
    };
    afkRepo = { getAfkSettings: vi.fn(), updateAfkSettings: vi.fn() };
    bumpReminderRepo = {
      getBumpReminderSettings: vi.fn(),
      updateBumpReminderSettings: vi.fn(),
    };
    vacRepo = { getVacSettings: vi.fn(), updateVacSettings: vi.fn() };
    memberLogRepo = {
      getMemberLogSettings: vi.fn(),
      updateMemberLogSettings: vi.fn(),
    };
    vcRecruitRepo = {
      getVcRecruitSettings: vi.fn(),
      updateVcRecruitSettings: vi.fn(),
    };
    stickyMessageRepo = { findAllByGuild: vi.fn() };
    reactionRolePanelRepo = { findAllByGuild: vi.fn() };
    ticketSettingsRepo = { findAllByGuild: vi.fn() };
    ticketRepo = { findAllOpenByGuild: vi.fn() };

    prismaTx = {
      guildSettings: { update: vi.fn() },
      guildAfkSettings: { upsert: vi.fn() },
      guildBumpReminderSettings: { upsert: vi.fn() },
      guildMemberLogSettings: { upsert: vi.fn() },
      guildVcRecruitSettings: { upsert: vi.fn() },
      guildVacSettings: { upsert: vi.fn(), findUnique: vi.fn() },
      guildTicketSettings: { findUnique: vi.fn(), create: vi.fn() },
      ticket: { findFirst: vi.fn(), create: vi.fn() },
      stickyMessage: { findUnique: vi.fn(), create: vi.fn() },
      guildReactionRolePanel: { findFirst: vi.fn(), create: vi.fn() },
    };
    prisma = {
      $transaction: vi.fn(async (arg: unknown) => {
        // 関数形式 → tx を渡してコールバックを実行
        if (typeof arg === "function") {
          return (arg as (tx: typeof prismaTx) => Promise<unknown>)(prismaTx);
        }
        return Promise.resolve();
      }),
    };

    repo = new GuildSettingsAggregateRepository(
      coreRepo as never,
      afkRepo as never,
      bumpReminderRepo as never,
      vacRepo as never,
      memberLogRepo as never,
      vcRecruitRepo as never,
      stickyMessageRepo as never,
      reactionRolePanelRepo as never,
      ticketSettingsRepo as never,
      ticketRepo as never,
      prisma as never,
    );
  });

  // ── getFullSettings ────────────────────────────────────
  describe("getFullSettings", () => {
    it("ギルド設定が存在しない場合は null を返すこと", async () => {
      coreRepo.getSettings.mockResolvedValue(null);
      await expect(repo.getFullSettings("g1")).resolves.toBeNull();
    });

    it("stateful データを含む全件を取得して state に詰めること", async () => {
      coreRepo.getSettings.mockResolvedValue({
        guildId: "g1",
        locale: "ja",
        errorChannelId: "ch-err",
      });
      afkRepo.getAfkSettings.mockResolvedValue(null);
      bumpReminderRepo.getBumpReminderSettings.mockResolvedValue(null);
      vacRepo.getVacSettings.mockResolvedValue({
        enabled: true,
        triggerChannelIds: ["trig-1"],
        createdChannels: [
          {
            voiceChannelId: "vc-1",
            ownerId: "user-1",
            createdAt: 100,
          } satisfies VacChannelPair,
        ],
      });
      memberLogRepo.getMemberLogSettings.mockResolvedValue(null);
      vcRecruitRepo.getVcRecruitSettings.mockResolvedValue(null);
      ticketSettingsRepo.findAllByGuild.mockResolvedValue([
        {
          guildId: "g1",
          categoryId: "cat-1",
          enabled: true,
          staffRoleIds: '["r-1"]',
          panelChannelId: "pch-1",
          panelMessageId: "pm-1",
          panelTitle: "T",
          panelDescription: "D",
          panelColor: "#000",
          autoDeleteDays: 7,
          maxTicketsPerUser: 1,
          ticketCounter: 3,
        } satisfies GuildTicketSettings,
      ]);
      ticketRepo.findAllOpenByGuild.mockResolvedValue([
        {
          id: "tid-1",
          guildId: "g1",
          categoryId: "cat-1",
          channelId: "tch-1",
          userId: "u-1",
          ticketNumber: 3,
          subject: "subj",
          status: "open",
          elapsedDeleteMs: 0,
          closedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies Ticket,
      ]);
      stickyMessageRepo.findAllByGuild.mockResolvedValue([
        {
          id: "sid-1",
          guildId: "g1",
          channelId: "sch-1",
          content: "stk",
          embedData: '{"x":1}',
          updatedBy: null,
          lastMessageId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies StickyMessage,
      ]);
      reactionRolePanelRepo.findAllByGuild.mockResolvedValue([
        {
          id: "pid-1",
          guildId: "g1",
          channelId: "rch-1",
          messageId: "rm-1",
          mode: "toggle",
          title: "RR",
          description: "desc",
          color: "#000",
          buttons:
            '[{"buttonId":1,"label":"L","emoji":"","style":"Primary","roleIds":["r-1"]}]',
          buttonCounter: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies GuildReactionRolePanel,
      ]);

      const result = await repo.getFullSettings("g1");

      expect(result?.locale).toBe("ja");
      expect(result?.vac).toEqual({
        enabled: true,
        triggerChannelIds: ["trig-1"],
      });
      expect(result?.state).toEqual({
        ticketSettings: [
          {
            categoryId: "cat-1",
            enabled: true,
            staffRoleIds: ["r-1"],
            panelChannelId: "pch-1",
            panelMessageId: "pm-1",
            panelTitle: "T",
            panelDescription: "D",
            panelColor: "#000",
            autoDeleteDays: 7,
            maxTicketsPerUser: 1,
            ticketCounter: 3,
          },
        ],
        openTickets: [
          {
            categoryId: "cat-1",
            channelId: "tch-1",
            userId: "u-1",
            ticketNumber: 3,
            subject: "subj",
            elapsedDeleteMs: 0,
          },
        ],
        stickyMessages: [
          {
            channelId: "sch-1",
            content: "stk",
            embedData: '{"x":1}',
            updatedBy: null,
            lastMessageId: null,
          },
        ],
        reactionRolePanels: [
          {
            channelId: "rch-1",
            messageId: "rm-1",
            mode: "toggle",
            title: "RR",
            description: "desc",
            color: "#000",
            buttons: [
              {
                buttonId: 1,
                label: "L",
                emoji: "",
                style: "Primary",
                roleIds: ["r-1"],
              },
            ],
            buttonCounter: 1,
          },
        ],
        vacCreatedChannels: [
          { voiceChannelId: "vc-1", ownerId: "user-1", createdAt: 100 },
        ],
      });
    });

    it("StickyMessage.embedData が JSON 文字列のまま保持されること", async () => {
      coreRepo.getSettings.mockResolvedValue({ guildId: "g1", locale: "ja" });
      afkRepo.getAfkSettings.mockResolvedValue(null);
      bumpReminderRepo.getBumpReminderSettings.mockResolvedValue(null);
      vacRepo.getVacSettings.mockResolvedValue(null);
      memberLogRepo.getMemberLogSettings.mockResolvedValue(null);
      vcRecruitRepo.getVcRecruitSettings.mockResolvedValue(null);
      ticketSettingsRepo.findAllByGuild.mockResolvedValue([]);
      ticketRepo.findAllOpenByGuild.mockResolvedValue([]);
      stickyMessageRepo.findAllByGuild.mockResolvedValue([
        {
          id: "sid",
          guildId: "g1",
          channelId: "ch-1",
          content: "c",
          embedData: '{"complex":{"nested":true}}',
          updatedBy: null,
          lastMessageId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        } satisfies StickyMessage,
      ]);
      reactionRolePanelRepo.findAllByGuild.mockResolvedValue([]);

      const result = await repo.getFullSettings("g1");
      expect(result?.state?.stickyMessages[0]?.embedData).toBe(
        '{"complex":{"nested":true}}',
      );
    });

    it("VcRecruitSettings.setups[].createdVoiceChannelIds が export から除外されること", async () => {
      coreRepo.getSettings.mockResolvedValue({ guildId: "g1", locale: "ja" });
      afkRepo.getAfkSettings.mockResolvedValue(null);
      bumpReminderRepo.getBumpReminderSettings.mockResolvedValue(null);
      vacRepo.getVacSettings.mockResolvedValue(null);
      memberLogRepo.getMemberLogSettings.mockResolvedValue(null);
      vcRecruitRepo.getVcRecruitSettings.mockResolvedValue({
        enabled: true,
        mentionRoleIds: [],
        setups: [
          {
            categoryId: "cat-1",
            panelChannelId: "p-1",
            postChannelId: "post-1",
            panelMessageId: "m-1",
            threadArchiveDuration: 1440,
            createdVoiceChannelIds: ["should-be-stripped"],
          },
        ],
      });
      ticketSettingsRepo.findAllByGuild.mockResolvedValue([]);
      ticketRepo.findAllOpenByGuild.mockResolvedValue([]);
      stickyMessageRepo.findAllByGuild.mockResolvedValue([]);
      reactionRolePanelRepo.findAllByGuild.mockResolvedValue([]);

      const result = await repo.getFullSettings("g1");
      expect(result?.vcRecruit?.setups[0]?.createdVoiceChannelIds).toEqual([]);
    });
  });

  // ── planImportMerge ──────────────────────────────────
  describe("planImportMerge", () => {
    it("state が無い場合は全カウント 0 を返すこと", async () => {
      const data: FullGuildSettings = { locale: "ja" };
      await expect(repo.planImportMerge("g1", data)).resolves.toEqual({
        ticketSettingsToInsert: 0,
        openTicketsToInsert: 0,
        stickyMessagesToInsert: 0,
        reactionRolePanelsToInsert: 0,
        vacCreatedChannelsToInsert: 0,
      });
    });

    it("マージキーで既存判定し、不在のものだけカウントすること", async () => {
      ticketSettingsRepo.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-existing" },
      ]);
      ticketRepo.findAllOpenByGuild.mockResolvedValue([
        { channelId: "ch-existing-ticket" },
      ]);
      stickyMessageRepo.findAllByGuild.mockResolvedValue([
        { channelId: "ch-existing-sticky" },
      ]);
      reactionRolePanelRepo.findAllByGuild.mockResolvedValue([
        { channelId: "rch-1", messageId: "rm-1" },
      ]);
      vacRepo.getVacSettings.mockResolvedValue({
        enabled: true,
        triggerChannelIds: [],
        createdChannels: [{ voiceChannelId: "vc-existing" }],
      });

      const data: FullGuildSettings = {
        locale: "ja",
        state: {
          ticketSettings: [
            { categoryId: "cat-existing" },
            { categoryId: "cat-new" },
          ] as never,
          openTickets: [
            { channelId: "ch-existing-ticket" },
            { channelId: "ch-new-ticket" },
          ] as never,
          stickyMessages: [{ channelId: "ch-new-sticky" }] as never,
          reactionRolePanels: [
            { channelId: "rch-1", messageId: "rm-1" }, // existing
            { channelId: "rch-1", messageId: "rm-2" }, // new (異なる messageId)
          ] as never,
          vacCreatedChannels: [
            { voiceChannelId: "vc-existing" },
            { voiceChannelId: "vc-new" },
          ] as never,
        },
      };

      const plan = await repo.planImportMerge("g1", data);
      expect(plan).toEqual({
        ticketSettingsToInsert: 1,
        openTicketsToInsert: 1,
        stickyMessagesToInsert: 1,
        reactionRolePanelsToInsert: 1,
        vacCreatedChannelsToInsert: 1,
      });
    });
  });

  // ── importFullSettings ─────────────────────────────────
  describe("importFullSettings", () => {
    it("単一トランザクションでラップされること", async () => {
      const data: FullGuildSettings = { locale: "ja" };
      await repo.importFullSettings("g1", data);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it("設定系（locale / errorChannelId）が GuildSettings.update で上書きされること", async () => {
      const data: FullGuildSettings = {
        locale: "en",
        errorChannelId: "ch-new",
      };
      await repo.importFullSettings("g1", data);
      expect(prismaTx.guildSettings?.update).toHaveBeenCalledWith({
        where: { guildId: "g1" },
        data: { locale: "en", errorChannelId: "ch-new" },
      });
    });

    it("stateful: 既存があれば create を呼ばないこと（ticketSettings スキップ）", async () => {
      prismaTx.guildTicketSettings?.findUnique?.mockResolvedValue({
        guildId: "g1",
        categoryId: "cat-1",
      });

      const data: FullGuildSettings = {
        locale: "ja",
        state: {
          ticketSettings: [
            {
              categoryId: "cat-1",
              enabled: true,
              staffRoleIds: ["r-1"],
              panelChannelId: "p-1",
              panelMessageId: "m-1",
              panelTitle: "T",
              panelDescription: "D",
              panelColor: "#000",
              autoDeleteDays: 7,
              maxTicketsPerUser: 1,
              ticketCounter: 0,
            },
          ],
          openTickets: [],
          stickyMessages: [],
          reactionRolePanels: [],
          vacCreatedChannels: [],
        },
      };

      await repo.importFullSettings("g1", data);
      expect(prismaTx.guildTicketSettings?.create).not.toHaveBeenCalled();
    });

    it("stateful: 不在なら create を呼ぶこと（ticketSettings insert）", async () => {
      prismaTx.guildTicketSettings?.findUnique?.mockResolvedValue(null);

      const data: FullGuildSettings = {
        locale: "ja",
        state: {
          ticketSettings: [
            {
              categoryId: "cat-1",
              enabled: true,
              staffRoleIds: ["r-1"],
              panelChannelId: "p-1",
              panelMessageId: "m-1",
              panelTitle: "T",
              panelDescription: "D",
              panelColor: "#000",
              autoDeleteDays: 7,
              maxTicketsPerUser: 1,
              ticketCounter: 5,
            },
          ],
          openTickets: [],
          stickyMessages: [],
          reactionRolePanels: [],
          vacCreatedChannels: [],
        },
      };

      await repo.importFullSettings("g1", data);
      expect(prismaTx.guildTicketSettings?.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          guildId: "g1",
          categoryId: "cat-1",
          staffRoleIds: '["r-1"]',
          ticketCounter: 5,
        }),
      });
    });

    it("stateful: openTickets が既存スキップ / 新規 insert で振り分けられること", async () => {
      prismaTx.ticket?.findFirst?.mockImplementation(
        (args: { where: { channelId: string } }) => {
          return args.where.channelId === "ch-existing"
            ? Promise.resolve({ id: "exists" })
            : Promise.resolve(null);
        },
      );

      const data: FullGuildSettings = {
        locale: "ja",
        state: {
          ticketSettings: [],
          openTickets: [
            {
              categoryId: "cat-1",
              channelId: "ch-existing",
              userId: "u-1",
              ticketNumber: 1,
              subject: "s",
              elapsedDeleteMs: 0,
            },
            {
              categoryId: "cat-1",
              channelId: "ch-new",
              userId: "u-2",
              ticketNumber: 2,
              subject: "s2",
              elapsedDeleteMs: 0,
            },
          ],
          stickyMessages: [],
          reactionRolePanels: [],
          vacCreatedChannels: [],
        },
      };

      await repo.importFullSettings("g1", data);
      expect(prismaTx.ticket?.create).toHaveBeenCalledTimes(1);
      expect(prismaTx.ticket?.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          channelId: "ch-new",
          status: "open",
        }),
      });
    });

    it("VcRecruit: setups[].createdVoiceChannelIds が空配列で書き込まれること", async () => {
      const data: FullGuildSettings = {
        locale: "ja",
        vcRecruit: {
          enabled: true,
          mentionRoleIds: ["r-1"],
          setups: [
            {
              categoryId: "cat-1",
              panelChannelId: "p-1",
              postChannelId: "post-1",
              panelMessageId: "m-1",
              threadArchiveDuration: 1440,
              createdVoiceChannelIds: ["should-not-persist"],
            },
          ],
        },
      };

      await repo.importFullSettings("g1", data);
      expect(prismaTx.guildVcRecruitSettings?.upsert).toHaveBeenCalled();
      const callArgs =
        prismaTx.guildVcRecruitSettings?.upsert?.mock.calls[0]?.[0];
      const setupsJson = JSON.parse(callArgs.create.setups) as {
        createdVoiceChannelIds: string[];
      }[];
      expect(setupsJson[0]?.createdVoiceChannelIds).toEqual([]);
    });

    it("VAC createdChannels: 既存配列に新規分だけ追加される（union マージ）", async () => {
      prismaTx.guildVacSettings?.findUnique?.mockResolvedValue({
        enabled: true,
        triggerChannelIds: '["trig-1"]',
        createdChannels:
          '[{"voiceChannelId":"vc-existing","ownerId":"u-1","createdAt":100}]',
      });

      const data: FullGuildSettings = {
        locale: "ja",
        vac: { enabled: true, triggerChannelIds: ["trig-1"] },
        state: {
          ticketSettings: [],
          openTickets: [],
          stickyMessages: [],
          reactionRolePanels: [],
          vacCreatedChannels: [
            // 既存
            { voiceChannelId: "vc-existing", ownerId: "X", createdAt: 999 },
            // 新規
            { voiceChannelId: "vc-new", ownerId: "u-2", createdAt: 200 },
          ],
        },
      };

      await repo.importFullSettings("g1", data);
      const upsertArgs = prismaTx.guildVacSettings?.upsert?.mock.calls[0]?.[0];
      const merged = JSON.parse(upsertArgs.create.createdChannels) as {
        voiceChannelId: string;
      }[];
      expect(merged).toHaveLength(2);
      expect(merged.map((c) => c.voiceChannelId).sort()).toEqual([
        "vc-existing",
        "vc-new",
      ]);
    });
  });
});
