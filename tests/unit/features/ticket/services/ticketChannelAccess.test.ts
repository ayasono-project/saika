// Bot がチケットのチャンネルを扱えるか（チャンネルでの Bot の権限）の確認のテスト

import { ValidationError } from "@ayasono/shared/core";
import {
  DiscordAPIError,
  PermissionsBitField,
  type PermissionsString,
  RESTJSONErrorCodes,
} from "discord.js";
import { TICKET_CHANNEL_BOT_DELETE_PERMISSIONS } from "@/features/ticket/commands/ticketCommand.constants";
import {
  canBotHandleTicketChannel,
  getTicketChannelAccess,
  requireHandleableTicketChannel,
  resolveBotMember,
  toBotChannelAccessMessageKey,
} from "@/features/ticket/services/ticketChannelAccess";

/** createTicketChannel が Bot 自身の上書きで許可する4つの権限（入れ直す前に作ったチャンネルでは消えている） */
const BOT_OVERWRITE_PERMISSIONS: PermissionsString[] = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "EmbedLinks",
];

/** 削除に要る権限をそろえた Bot の権限（4つの権限と、ロールで持つ「チャンネルの管理」） */
const BOT_DELETE_PERMISSIONS: PermissionsString[] = [
  ...BOT_OVERWRITE_PERMISSIONS,
  "ManageChannels",
];

/** Bot 自身のメンバー */
const ME = { id: "bot-user-1" };

/**
 * permissionsFor(me) が指定の権限を返すチャンネルのモックを作る
 * @param permissions チャンネルでの Bot の権限
 * @returns チャンネルのモック
 */
function makeChannel(permissions: PermissionsString[]) {
  return {
    id: "ch-1",
    permissionsFor: vi.fn(() => new PermissionsBitField(permissions)),
  };
}

/**
 * channels.fetch と members を持つギルドのモックを作る
 * @param fetchResult channels.fetch の結果（Error なら reject する）
 * @param me members.me（null ならキャッシュに無い）
 * @returns ギルドのモック
 */
function makeGuild(fetchResult: unknown, me: unknown = ME) {
  return {
    id: "guild-1",
    channels: {
      fetch:
        fetchResult instanceof Error
          ? vi.fn().mockRejectedValue(fetchResult)
          : vi.fn().mockResolvedValue(fetchResult),
    },
    members: {
      me,
      fetchMe: vi.fn().mockRejectedValue(new Error("fetchMe failed")),
    },
  };
}

/**
 * Discord API のエラーを作る
 * @param code Discord のエラーコード
 * @param status HTTP ステータス
 * @returns DiscordAPIError
 */
function makeApiError(code: number, status: number): DiscordAPIError {
  return new DiscordAPIError(
    { code, message: "api error" },
    code,
    status,
    "GET",
    "/channels/ch-1",
    {},
  );
}

// Bot の権限の判定と、チャンネルの状態（扱える・無い・扱えない）の見分けを検証
describe("features/ticket/services/ticketChannelAccess", () => {
  // 各テストでモックの呼び出し記録を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canBotHandleTicketChannel", () => {
    it("Bot の上書きで許可していた4つの権限がそろっていれば true", () => {
      const channel = makeChannel(BOT_OVERWRITE_PERMISSIONS);

      expect(canBotHandleTicketChannel(channel as never, ME as never)).toBe(
        true,
      );
      expect(channel.permissionsFor).toHaveBeenCalledWith(ME);
    });

    it.each(BOT_OVERWRITE_PERMISSIONS)(
      "%s が欠けていれば false（入れ直した後の古いチケットでは「チャンネルを見る」が欠ける）",
      (missing) => {
        const channel = makeChannel(
          BOT_OVERWRITE_PERMISSIONS.filter((p) => p !== missing),
        );

        expect(canBotHandleTicketChannel(channel as never, ME as never)).toBe(
          false,
        );
      },
    );

    it("Administrator があれば、上書きが無くても true", () => {
      const channel = makeChannel(["Administrator"]);

      expect(canBotHandleTicketChannel(channel as never, ME as never)).toBe(
        true,
      );
    });

    it("permissionsFor が null（メンバーを解決できない）なら false", () => {
      const channel = { permissionsFor: vi.fn(() => null) };

      expect(canBotHandleTicketChannel(channel as never, ME as never)).toBe(
        false,
      );
    });

    it("必要な権限を渡すとそれで判定する（削除では「チャンネルの管理」も要る）", () => {
      const channel = makeChannel(BOT_OVERWRITE_PERMISSIONS);

      expect(
        canBotHandleTicketChannel(
          channel as never,
          ME as never,
          TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
        ),
      ).toBe(false);
      expect(
        canBotHandleTicketChannel(
          makeChannel(BOT_DELETE_PERMISSIONS) as never,
          ME as never,
          TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
        ),
      ).toBe(true);
    });
  });

  describe("resolveBotMember", () => {
    it("キャッシュにあればそれを返し、取りに行かない", async () => {
      const guild = makeGuild(null);

      await expect(resolveBotMember(guild as never)).resolves.toBe(ME);
      expect(guild.members.fetchMe).not.toHaveBeenCalled();
    });

    it("キャッシュに無ければ取りに行き、失敗したら null", async () => {
      const guild = makeGuild(null, null);

      await expect(resolveBotMember(guild as never)).resolves.toBeNull();
      expect(guild.members.fetchMe).toHaveBeenCalled();
    });
  });

  describe("getTicketChannelAccess", () => {
    it("チャンネルがあり権限がそろっていれば handleable でチャンネルを返す", async () => {
      const channel = makeChannel(BOT_OVERWRITE_PERMISSIONS);
      const guild = makeGuild(channel);

      const access = await getTicketChannelAccess(guild as never, "ch-1");

      expect(access).toEqual({ status: "handleable", channel });
      expect(guild.channels.fetch).toHaveBeenCalledWith("ch-1");
    });

    it("Bot の上書きが消えて「チャンネルを見る」が無ければ inaccessible", async () => {
      const guild = makeGuild(
        makeChannel(["SendMessages", "ReadMessageHistory", "EmbedLinks"]),
      );

      await expect(
        getTicketChannelAccess(guild as never, "ch-1"),
      ).resolves.toEqual({
        status: "inaccessible",
        reason: "channel_permissions",
      });
    });

    it("Bot 自身のメンバーを取れなければ、扱えるか確かめられないので inaccessible", async () => {
      const guild = makeGuild(makeChannel(BOT_OVERWRITE_PERMISSIONS), null);

      await expect(
        getTicketChannelAccess(guild as never, "ch-1"),
      ).resolves.toEqual({
        status: "inaccessible",
        reason: "channel_permissions",
      });
    });

    it("Discord が Unknown Channel を返したら missing（チャンネルが無いと確定）", async () => {
      const guild = makeGuild(
        makeApiError(RESTJSONErrorCodes.UnknownChannel, 404),
      );

      await expect(
        getTicketChannelAccess(guild as never, "ch-1"),
      ).resolves.toEqual({ status: "missing" });
    });

    it("Missing Access など他のエラーは、無いと誤判定しないよう inaccessible", async () => {
      const guild = makeGuild(
        makeApiError(RESTJSONErrorCodes.MissingAccess, 403),
      );

      await expect(
        getTicketChannelAccess(guild as never, "ch-1"),
      ).resolves.toEqual({
        status: "inaccessible",
        reason: "channel_permissions",
      });
    });

    it("一時的な失敗（API エラー以外）も inaccessible", async () => {
      const guild = makeGuild(new Error("network error"));

      await expect(
        getTicketChannelAccess(guild as never, "ch-1"),
      ).resolves.toEqual({
        status: "inaccessible",
        reason: "channel_permissions",
      });
    });

    it("fetch が null を返したら missing", async () => {
      const guild = makeGuild(null);

      await expect(
        getTicketChannelAccess(guild as never, "ch-1"),
      ).resolves.toEqual({ status: "missing" });
    });

    it("削除の権限で確かめると、4つの権限はあるが「チャンネルの管理」だけが無いときは、理由を manage_channels にする", async () => {
      const guild = makeGuild(makeChannel(BOT_OVERWRITE_PERMISSIONS));

      await expect(
        getTicketChannelAccess(
          guild as never,
          "ch-1",
          TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
        ),
      ).resolves.toEqual({ status: "inaccessible", reason: "manage_channels" });
    });

    it("削除の権限で確かめても、4つの権限のどれかが欠けていれば、先に付け直してもらうため理由は channel_permissions にする", async () => {
      const guild = makeGuild(makeChannel(["ManageChannels", "SendMessages"]));

      await expect(
        getTicketChannelAccess(
          guild as never,
          "ch-1",
          TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
        ),
      ).resolves.toEqual({
        status: "inaccessible",
        reason: "channel_permissions",
      });
    });

    it("削除の権限がそろっていれば handleable", async () => {
      const channel = makeChannel(BOT_DELETE_PERMISSIONS);
      const guild = makeGuild(channel);

      await expect(
        getTicketChannelAccess(
          guild as never,
          "ch-1",
          TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
        ),
      ).resolves.toEqual({ status: "handleable", channel });
    });

    it("省略時は4つの権限で確かめる（クローズ・再オープンは「チャンネルの管理」が無くても扱える）", async () => {
      const channel = makeChannel(BOT_OVERWRITE_PERMISSIONS);
      const guild = makeGuild(channel);

      await expect(
        getTicketChannelAccess(guild as never, "ch-1"),
      ).resolves.toEqual({ status: "handleable", channel });
    });
  });

  describe("toBotChannelAccessMessageKey", () => {
    it.each([
      [
        "扱う権限が無い",
        { status: "inaccessible", reason: "channel_permissions" },
        "ticket:user-response.bot_channel_access_missing",
      ],
      [
        "「チャンネルの管理」だけが無い",
        { status: "inaccessible", reason: "manage_channels" },
        "ticket:user-response.bot_manage_channels_missing",
      ],
      [
        "チャンネルが無い",
        { status: "missing" },
        "ticket:user-response.bot_channel_access_missing",
      ],
    ] as const)("%sときの案内のキーを選ぶ", (_label, access, expected) => {
      expect(toBotChannelAccessMessageKey(access)).toBe(expected);
    });
  });

  describe("requireHandleableTicketChannel", () => {
    it("扱えればチャンネルを返す", async () => {
      const channel = makeChannel(BOT_OVERWRITE_PERMISSIONS);
      const guild = makeGuild(channel);

      await expect(
        requireHandleableTicketChannel(
          guild as never,
          {
            channelId: "ch-1",
          } as never,
        ),
      ).resolves.toBe(channel);
    });

    it.each([
      ["Bot が扱えない", makeChannel(["SendMessages"])],
      ["チャンネルが無い", null],
    ])(
      "%sときは bot_channel_access_missing の ValidationError を投げる",
      async (_label, fetchResult) => {
        const guild = makeGuild(fetchResult);

        const error = await requireHandleableTicketChannel(
          guild as never,
          {
            channelId: "ch-1",
          } as never,
        ).catch((e: unknown) => e);

        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).messageKey).toBe(
          "ticket:user-response.bot_channel_access_missing",
        );
      },
    );
  });
});
