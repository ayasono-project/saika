// チケット操作の前提確認（設定が無い・操作者の権限・作成上限・Bot がチャンネルを扱えない）のテスト

/** 翻訳の差し替え先。null の間はキー（と引数）をそのまま返し、実際の文面を確かめるテストでだけ本物を入れる */
const translation = vi.hoisted(() => ({
  actual: null as
    | ((
        locale: string,
        key: string,
        params?: Record<string, unknown>,
      ) => string)
    | null,
}));

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (
    locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => {
    if (translation.actual) return translation.actual(locale, key, params);
    return params ? `${key}:${JSON.stringify(params)}` : key;
  },
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: vi.fn((description: string) => ({
    type: "error",
    description,
  })),
}));

import { MessageFlags, PermissionsBitField } from "discord.js";
import { createErrorEmbed } from "@/bot/utils/messageResponse";
import { TICKET_CHANNEL_BOT_DELETE_PERMISSIONS } from "@/features/ticket/commands/ticketCommand.constants";
import {
  canOperateTicket,
  canOperateTicketOrReply,
  findCreatableTicketConfigOrReply,
  findHandleableTicketChannelOrReply,
  findTicketConfigOrReply,
  type TicketOperation,
} from "@/features/ticket/services/ticketGuards";
import { ticket as enTicket } from "@/shared/locale/locales/en/features/ticket";
import { ticket as jaTicket } from "@/shared/locale/locales/ja/features/ticket";
import { logger } from "@/shared/utils/logger";

/** カテゴリの設定 */
const CONFIG = {
  guildId: "guild-1",
  categoryId: "cat-1",
  staffRoleIds: ["role-staff"],
  maxTicketsPerUser: 2,
};

/** 操作対象のチケット */
const TICKET = {
  id: "t-1",
  guildId: "guild-1",
  categoryId: "cat-1",
  channelId: "ch-1",
  userId: "user-1",
  status: "open",
};

/**
 * 返信を記録するインタラクションのモックを作る
 * @returns インタラクションのモック
 */
function createInteraction() {
  return {
    locale: "ja",
    user: { id: "user-1" },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * 操作者（ロール・管理者権限を指定）のインタラクションのモックを作る
 * @param options 操作者の指定
 * @param options.userId 操作者のユーザーID（既定は作成者ではない user-2）
 * @param options.roleIds 操作者のロールID
 * @param options.permissions 操作者の権限（interaction.memberPermissions）
 * @param options.locale 操作者の言語
 * @returns インタラクションのモック
 */
function createOperatorInteraction({
  userId = "user-2",
  roleIds = [],
  permissions = [],
  locale = "ja",
}: {
  userId?: string;
  roleIds?: string[];
  permissions?: ConstructorParameters<typeof PermissionsBitField>[0];
  locale?: string;
} = {}) {
  return {
    locale,
    user: { id: userId },
    member: {
      roles: { cache: new Map(roleIds.map((roleId) => [roleId, {}])) },
    },
    memberPermissions: new PermissionsBitField(permissions),
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * チケットのチャンネル（Bot の権限を指定）を返すギルドのモックを作る
 * @param channel channels.fetch が返すチャンネル（null ならチャンネルが無い）
 * @returns ギルドのモック
 */
function createGuild(channel: unknown) {
  return {
    id: "guild-1",
    channels: { fetch: vi.fn().mockResolvedValue(channel) },
    members: { me: { id: "bot-user-1" }, fetchMe: vi.fn() },
  };
}

/**
 * Bot の権限を指定したチャンネルのモックを作る
 * @param permissions チャンネルでの Bot の権限
 * @returns チャンネルのモック
 */
function createChannel(
  permissions: ConstructorParameters<typeof PermissionsBitField>[0],
) {
  return {
    id: "ch-1",
    permissionsFor: vi.fn(() => new PermissionsBitField(permissions)),
  };
}

/**
 * findByGuildAndCategory が config を返す設定サービスのモックを作る
 * @param config 返す設定
 * @returns 設定サービスのモック
 */
function createSettingsService(config: unknown) {
  return { findByGuildAndCategory: vi.fn().mockResolvedValue(config) };
}

// 設定が無いチケットを操作させないこと・操作者の権限の確認・作成時の上限の確認を検証
describe("features/ticket/services/ticketGuards", () => {
  // 各テストでモックの呼び出し記録を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("findTicketConfigOrReply", () => {
    it("設定があれば返信せずに設定を返す", async () => {
      const interaction = createInteraction();
      const settingsService = createSettingsService(CONFIG);

      const result = await findTicketConfigOrReply(
        interaction as never,
        TICKET as never,
        settingsService as never,
      );

      expect(result).toBe(CONFIG);
      expect(settingsService.findByGuildAndCategory).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
      );
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("設定が無い（パネルが削除された）ときは、操作できない理由と出口を本人にだけ返信して null を返す", async () => {
      const interaction = createInteraction();

      const result = await findTicketConfigOrReply(
        interaction as never,
        TICKET as never,
        createSettingsService(null) as never,
      );

      expect(result).toBeNull();
      expect(interaction.reply).toHaveBeenCalledWith({
        embeds: [
          {
            type: "error",
            description: "ticket:user-response.ticket_config_missing",
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    });

    it("返信の文面（ja/en）は、設置し直すとクローズから自動削除の日数を過ぎたチケットが削除されることを伝え、自動削除が止まっているとは言わない（止まっている間もクローズからの経過は数えるため）", () => {
      const ja = jaTicket["user-response.ticket_config_missing"];
      const en = enTicket["user-response.ticket_config_missing"];

      expect(ja).toContain(
        "クローズしてから自動削除の日数を過ぎているチケットは、設置し直した時点で削除されます",
      );
      expect(ja).not.toContain("止まっています");
      expect(en).toContain("are deleted as soon as the panel is set up again");
      expect(en).not.toContain("paused");
    });
  });

  // 操作ごとに誰が操作できるか（管理者権限・スタッフロール・作成者）の判定を検証
  describe("canOperateTicket", () => {
    it.each<{
      who: string;
      operator: { userId: string; roleIds: string[]; isAdministrator: boolean };
      closeOpen: boolean;
      remove: boolean;
    }>([
      {
        who: "管理者権限を持つメンバー（スタッフロールも無く、作成者でもない）",
        operator: { userId: "user-2", roleIds: [], isAdministrator: true },
        closeOpen: true,
        remove: true,
      },
      {
        who: "スタッフロールを持つメンバー",
        operator: {
          userId: "user-2",
          roleIds: ["role-other", "role-staff"],
          isAdministrator: false,
        },
        closeOpen: true,
        remove: true,
      },
      {
        who: "チケットの作成者（スタッフロールも管理者権限も無い）",
        operator: { userId: "user-1", roleIds: [], isAdministrator: false },
        closeOpen: true,
        remove: false,
      },
      {
        who: "作成者でもスタッフでも管理者でもないメンバー",
        operator: {
          userId: "user-2",
          roleIds: ["role-other"],
          isAdministrator: false,
        },
        closeOpen: false,
        remove: false,
      },
    ])(
      "$who: クローズ・再オープンは $closeOpen、削除は $remove",
      ({ operator, closeOpen, remove }) => {
        expect(
          canOperateTicket(
            TICKET as never,
            operator,
            CONFIG.staffRoleIds,
            "close_open",
          ),
        ).toBe(closeOpen);
        expect(
          canOperateTicket(
            TICKET as never,
            operator,
            CONFIG.staffRoleIds,
            "delete",
          ),
        ).toBe(remove);
      },
    );

    it("スタッフロールが1つも無い設定でも、管理者権限を持つメンバーは削除でき、それ以外は削除できない", () => {
      const admin = { userId: "user-2", roleIds: [], isAdministrator: true };
      const creator = { userId: "user-1", roleIds: [], isAdministrator: false };

      expect(canOperateTicket(TICKET as never, admin, [], "delete")).toBe(true);
      expect(canOperateTicket(TICKET as never, creator, [], "delete")).toBe(
        false,
      );
    });
  });

  // 操作者の権限が足りないときに、誰が操作できるかを本人にだけ返し、足りていれば何も返さないことを検証
  describe("canOperateTicketOrReply", () => {
    it.each<TicketOperation>(["close_open", "delete"])(
      "%s: 管理者権限（Administrator）を持っていれば、スタッフロールが無く作成者でなくても、返信せずに true を返す",
      async (operation) => {
        const interaction = createOperatorInteraction({
          permissions: ["Administrator"],
        });

        const result = await canOperateTicketOrReply(
          interaction as never,
          TICKET as never,
          CONFIG as never,
          operation,
        );

        expect(result).toBe(true);
        expect(interaction.reply).not.toHaveBeenCalled();
      },
    );

    it.each<TicketOperation>(["close_open", "delete"])(
      "%s: スタッフロールを持っていれば、返信せずに true を返す",
      async (operation) => {
        const interaction = createOperatorInteraction({
          roleIds: ["role-staff"],
        });

        const result = await canOperateTicketOrReply(
          interaction as never,
          TICKET as never,
          CONFIG as never,
          operation,
        );

        expect(result).toBe(true);
        expect(interaction.reply).not.toHaveBeenCalled();
      },
    );

    it("作成者はクローズ・再オープンでは返信せずに true を返す", async () => {
      const interaction = createOperatorInteraction({ userId: "user-1" });

      const result = await canOperateTicketOrReply(
        interaction as never,
        TICKET as never,
        CONFIG as never,
        "close_open",
      );

      expect(result).toBe(true);
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("作成者でも、スタッフロールも管理者権限も無ければ、削除では誰が削除できるか（スタッフロールのメンション入り）を 権限不足 のタイトルで本人にだけ返信して false を返す", async () => {
      const interaction = createOperatorInteraction({
        userId: "user-1",
        permissions: ["ManageMessages"],
      });

      const result = await canOperateTicketOrReply(
        interaction as never,
        TICKET as never,
        CONFIG as never,
        "delete",
      );

      expect(result).toBe(false);
      expect(createErrorEmbed).toHaveBeenCalledWith(
        'ticket:user-response.not_authorized_delete:{"staffRoles":"<@&role-staff>"}',
        { locale: "ja", title: "common:title_permission_denied" },
      );
      expect(interaction.reply).toHaveBeenCalledTimes(1);
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ flags: MessageFlags.Ephemeral }),
      );
    });

    it("作成者でもスタッフでも管理者でもなければ、クローズ・再オープンでは誰が操作できるか（スタッフロールのメンション入り）を返信して false を返す", async () => {
      const interaction = createOperatorInteraction({
        roleIds: ["role-other"],
      });

      const result = await canOperateTicketOrReply(
        interaction as never,
        TICKET as never,
        CONFIG as never,
        "close_open",
      );

      expect(result).toBe(false);
      expect(createErrorEmbed).toHaveBeenCalledWith(
        'ticket:user-response.not_authorized_close_open:{"staffRoles":"<@&role-staff>"}',
        { locale: "ja", title: "common:title_permission_denied" },
      );
      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });

    it.each([
      { member: null, memberPermissions: null, label: "member が null" },
      {
        member: { roles: ["role-staff"] },
        memberPermissions: null,
        label: "roles にキャッシュが無い（API から来たメンバー）",
      },
    ])(
      "$label のときは、ロールも管理者権限も無いものとして扱う（作成者でなければ操作できない）",
      async ({ member, memberPermissions }) => {
        const interaction = {
          ...createOperatorInteraction(),
          member,
          memberPermissions,
        };

        const result = await canOperateTicketOrReply(
          interaction as never,
          TICKET as never,
          CONFIG as never,
          "close_open",
        );

        expect(result).toBe(false);
        expect(interaction.reply).toHaveBeenCalledTimes(1);
      },
    );

    // 実際の文面（ja/en）で、スタッフロールのメンションが括弧の中に自然な区切りで並ぶことを検証
    describe("権限が足りないときの案内（実際の文面）", () => {
      // このファイルでは翻訳をモックしているので、本物のロケールを読み込んで使う
      beforeAll(async () => {
        const { localeManager, tInteraction } = await vi.importActual<
          typeof import("@/shared/locale/localeManager")
        >("@/shared/locale/localeManager");
        await localeManager.initialize();
        translation.actual = tInteraction as NonNullable<
          typeof translation.actual
        >;
      });

      // 他のテストはキーで確かめるので、翻訳のモックを元に戻す
      afterAll(() => {
        translation.actual = null;
      });

      /**
       * スタッフでも作成者でも管理者でもない操作者で権限を確かめ、返信した embed の本文とタイトルを返す
       * @param locale 操作者の言語
       * @param operation 操作の種類
       * @param staffRoleIds カテゴリのスタッフロールID
       * @returns 返信した embed の本文とタイトル
       */
      async function replyTextOf(
        locale: string,
        operation: TicketOperation,
        staffRoleIds: string[],
      ) {
        await canOperateTicketOrReply(
          createOperatorInteraction({
            locale,
            roleIds: ["role-other"],
          }) as never,
          TICKET as never,
          { ...CONFIG, staffRoleIds } as never,
          operation,
        );
        const [description, options] = vi.mocked(createErrorEmbed).mock
          .calls[0] as [string, { title?: string }];
        return { description, title: options.title };
      }

      it("ja: 削除は、スタッフロールを「、」で区切ったメンションと管理者権限を案内し、タイトルは「権限不足」", async () => {
        const { description, title } = await replyTextOf("ja", "delete", [
          "role-a",
          "role-b",
        ]);

        expect(description).toBe(
          "チケットを削除できるのは、スタッフロール（<@&role-a>、<@&role-b>）を持つメンバーと、管理者権限を持つメンバーだけです。",
        );
        expect(title).toBe("権限不足");
      });

      it("ja: クローズ・再オープンは、作成者・スタッフロール・管理者権限を案内する", async () => {
        const { description } = await replyTextOf("ja", "close_open", [
          "role-a",
          "role-b",
        ]);

        expect(description).toBe(
          "チケットをクローズ・再オープンできるのは、チケットを作ったメンバー、スタッフロール（<@&role-a>、<@&role-b>）を持つメンバー、管理者権限を持つメンバーだけです。",
        );
      });

      it("en: 削除は、スタッフロールを「, 」で区切ったメンションと管理者権限を案内し、タイトルは Insufficient Permissions", async () => {
        const { description, title } = await replyTextOf("en-US", "delete", [
          "role-a",
          "role-b",
        ]);

        expect(description).toBe(
          "Tickets can only be deleted by members with a staff role (<@&role-a>, <@&role-b>) or members with the Administrator permission.",
        );
        expect(title).toBe("Insufficient Permissions");
      });

      it("en: クローズ・再オープンは、作成者・スタッフロール・管理者権限を案内する", async () => {
        const { description } = await replyTextOf("en-US", "close_open", [
          "role-a",
          "role-b",
        ]);

        expect(description).toBe(
          "Tickets can only be closed or reopened by the member who created the ticket, members with a staff role (<@&role-a>, <@&role-b>), or members with the Administrator permission.",
        );
      });

      it.each([
        { locale: "ja", expected: "スタッフロール（未設定）" },
        { locale: "en-US", expected: "a staff role (none set)" },
      ])(
        "$locale: スタッフロールが1つも無い設定では、括弧の中を空にせず「未設定」と示す",
        async ({ locale, expected }) => {
          const { description } = await replyTextOf(locale, "delete", []);

          expect(description).toContain(expected);
        },
      );
    });
  });

  describe("findHandleableTicketChannelOrReply", () => {
    it("Bot がチャンネルを扱えれば、返信せずにチャンネルを返す", async () => {
      const interaction = createInteraction();
      const channel = createChannel([
        "ViewChannel",
        "SendMessages",
        "ReadMessageHistory",
        "EmbedLinks",
      ]);
      const guild = createGuild(channel);

      const result = await findHandleableTicketChannelOrReply(
        interaction as never,
        guild as never,
        TICKET as never,
      );

      expect(result).toBe(channel);
      expect(guild.channels.fetch).toHaveBeenCalledWith("ch-1");
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("Bot を外して入れ直す前に作ったチケット（Bot の上書きが消え「チャンネルを見る」が無い）では、理由と対処を Bot権限不足 のタイトルで本人にだけ返信し、warn を出して null を返す", async () => {
      const interaction = createInteraction();
      const guild = createGuild(
        createChannel(["SendMessages", "ReadMessageHistory", "EmbedLinks"]),
      );

      const result = await findHandleableTicketChannelOrReply(
        interaction as never,
        guild as never,
        TICKET as never,
      );

      expect(result).toBeNull();
      expect(interaction.reply).toHaveBeenCalledWith({
        embeds: [
          {
            type: "error",
            description: "ticket:user-response.bot_channel_access_missing",
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
      expect(createErrorEmbed).toHaveBeenCalledWith(
        "ticket:user-response.bot_channel_access_missing",
        { locale: "ja", title: "common:title_bot_permission_denied" },
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_channel_access_missing"),
      );
    });

    it("チャンネルが取れないときも、同じ理由を返信して null を返す", async () => {
      const interaction = createInteraction();

      const result = await findHandleableTicketChannelOrReply(
        interaction as never,
        createGuild(null) as never,
        TICKET as never,
      );

      expect(result).toBeNull();
      expect(interaction.reply).toHaveBeenCalledTimes(1);
    });

    it("削除の経路（削除の権限を渡す）で、4つの権限はあるが「チャンネルの管理」だけが無いときは、ロールかチャンネルの権限設定を見直す案内を返信して null を返す", async () => {
      const interaction = createInteraction();
      const guild = createGuild(
        createChannel([
          "ViewChannel",
          "SendMessages",
          "ReadMessageHistory",
          "EmbedLinks",
        ]),
      );

      const result = await findHandleableTicketChannelOrReply(
        interaction as never,
        guild as never,
        TICKET as never,
        TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
      );

      expect(result).toBeNull();
      expect(createErrorEmbed).toHaveBeenCalledWith(
        "ticket:user-response.bot_manage_channels_missing",
        { locale: "ja", title: "common:title_bot_permission_denied" },
      );
      expect(interaction.reply).toHaveBeenCalledTimes(1);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_channel_access_missing"),
      );
    });

    it("削除の経路で4つの権限も欠けているときは、先にチャンネルへ付け直してもらう案内を返す", async () => {
      const interaction = createInteraction();
      const guild = createGuild(
        createChannel(["SendMessages", "ReadMessageHistory", "EmbedLinks"]),
      );

      await findHandleableTicketChannelOrReply(
        interaction as never,
        guild as never,
        TICKET as never,
        TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
      );

      expect(createErrorEmbed).toHaveBeenCalledWith(
        "ticket:user-response.bot_channel_access_missing",
        expect.anything(),
      );
    });

    it("クローズ・再オープンの経路（権限を渡さない）では「チャンネルの管理」を求めず、4つの権限があれば返信せずにチャンネルを返す", async () => {
      const interaction = createInteraction();
      const channel = createChannel([
        "ViewChannel",
        "SendMessages",
        "ReadMessageHistory",
        "EmbedLinks",
      ]);

      const result = await findHandleableTicketChannelOrReply(
        interaction as never,
        createGuild(channel) as never,
        TICKET as never,
      );

      expect(result).toBe(channel);
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("削除の経路で「チャンネルの管理」もあれば、返信せずにチャンネルを返す", async () => {
      const interaction = createInteraction();
      const channel = createChannel([
        "ViewChannel",
        "SendMessages",
        "ReadMessageHistory",
        "EmbedLinks",
        "ManageChannels",
      ]);

      const result = await findHandleableTicketChannelOrReply(
        interaction as never,
        createGuild(channel) as never,
        TICKET as never,
        TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
      );

      expect(result).toBe(channel);
      expect(interaction.reply).not.toHaveBeenCalled();
    });

    it("「チャンネルの管理」が無いときの文面（ja/en）は、何も変えていないこと・削除できないこと・ロールとチャンネルの権限設定の見直しを伝える", () => {
      const ja = jaTicket["user-response.bot_manage_channels_missing"];
      const en = enTicket["user-response.bot_manage_channels_missing"];

      expect(ja).toContain("何も変更していません");
      expect(ja).toContain("削除できません");
      expect(ja).toContain("Bot のロールに「チャンネルの管理」を付ける");
      expect(ja).toContain("このチャンネルの権限設定");
      expect(en).toContain("nothing was changed");
      expect(en).toContain("can't be deleted");
      expect(en).toContain("Give the bot's role Manage Channels");
      expect(en).toContain("this channel's permission settings");
    });

    it("返信の文面（ja/en）は、何も変えていないこと・入れ直しが原因になること・付け直す4つの権限を伝える", () => {
      const ja = jaTicket["user-response.bot_channel_access_missing"];
      const en = enTicket["user-response.bot_channel_access_missing"];

      expect(ja).toContain("何も変更していません");
      expect(ja).toContain("入れ直す");
      for (const name of [
        "「チャンネルを見る」",
        "「メッセージを送信」",
        "「埋め込みリンク」",
        "「メッセージ履歴を読む」",
      ]) {
        expect(ja).toContain(name);
      }
      expect(en).toContain("nothing was changed");
      expect(en).toContain("added back");
      for (const name of [
        "View Channel",
        "Send Messages",
        "Embed Links",
        "Read Message History",
      ]) {
        expect(en).toContain(name);
      }
    });
  });

  describe("findCreatableTicketConfigOrReply", () => {
    it("パネルの設定が無ければ panel_not_found を返信して null を返し、上限は数えない", async () => {
      const interaction = createInteraction();
      const ticketRepository = { findOpenByUserAndCategory: vi.fn() };

      const result = await findCreatableTicketConfigOrReply(
        interaction as never,
        "guild-1",
        "cat-1",
        createSettingsService(null) as never,
        ticketRepository as never,
      );

      expect(result).toBeNull();
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [
            {
              type: "error",
              description: "ticket:user-response.panel_not_found",
            },
          ],
        }),
      );
      expect(ticketRepository.findOpenByUserAndCategory).not.toHaveBeenCalled();
    });

    it("操作者のオープン中のチケットが上限に達していれば、上限の値を埋めて返信し null を返す", async () => {
      const interaction = createInteraction();
      const ticketRepository = {
        findOpenByUserAndCategory: vi.fn().mockResolvedValue([{}, {}]),
      };

      const result = await findCreatableTicketConfigOrReply(
        interaction as never,
        "guild-1",
        "cat-1",
        createSettingsService(CONFIG) as never,
        ticketRepository as never,
      );

      expect(result).toBeNull();
      expect(ticketRepository.findOpenByUserAndCategory).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
        "user-1",
      );
      expect(interaction.reply).toHaveBeenCalledWith({
        embeds: [
          {
            type: "error",
            description: 'ticket:user-response.max_tickets_reached:{"max":2}',
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    });

    it("上限未満なら返信せずに設定を返す", async () => {
      const interaction = createInteraction();
      const ticketRepository = {
        findOpenByUserAndCategory: vi.fn().mockResolvedValue([{}]),
      };

      const result = await findCreatableTicketConfigOrReply(
        interaction as never,
        "guild-1",
        "cat-1",
        createSettingsService(CONFIG) as never,
        ticketRepository as never,
      );

      expect(result).toBe(CONFIG);
      expect(interaction.reply).not.toHaveBeenCalled();
    });
  });
});
