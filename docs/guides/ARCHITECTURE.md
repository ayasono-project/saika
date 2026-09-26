# アーキテクチャガイド

> Architecture Guide - コード設計・モジュール構成・設計パターンの解説

最終更新: 2026年9月26日

---

> DB は **PostgreSQL（`@prisma/adapter-pg` 経由）**（テーブル名は `guild_*_settings`、列名はスネークケース、JSON 配列は jsonb。全テーブルが親テーブル `guilds` へ FK を張る）。ディレクトリ構成は `src/{bot,api,features,shared}/`。Fastify API 層（`src/api/`）は実装・本番稼働済み。プロジェクト全体方針は [infra/docs/PROJECT_ARCHITECTURE.md](../../../infra/docs/PROJECT_ARCHITECTURE.md) を参照。

---

## 概要

saika は **Discord サーバー管理 Bot** です。
Web UI は別リポジトリ（ayasono-web）に分離されており、本リポジトリは Bot プロセス本体と、web ダッシュボードから呼ばれる Fastify API サーバー（同一 Node プロセス内で起動）を担当します。

### このドキュメントのスコープ

- 扱う内容: システム全体の構成、依存方向、レイヤ境界、モジュール責務
- 扱わない内容: 関数分割手順、命名/コメント細則、実装時のチェックリスト
- 実装細則は [IMPLEMENTATION_GUIDELINES.md](IMPLEMENTATION_GUIDELINES.md) を参照

---

## プロセス構成

```mermaid
graph TD
    subgraph saika["saika プロセス（Bot + API 同一プロセス）"]
        Bot["Bot 層<br>src/main.ts + src/bot/<br>─────────────<br>Discord Bot<br>Gateway 接続"]
        Api["Fastify API 層<br>src/api/<br>─────────────<br>web ダッシュボード用<br>JWT 検証のみ"]
        Features["src/features/<br>機能ごとの実装<br>UI / サービス / リポジトリ"]
        Shared["src/shared/<br>横断ロジック<br>DB types / i18n / etc"]
        DB["PostgreSQL<br>@prisma/adapter-pg"]
    end
    Web["web BFF<br>（別リポ・別プロセス）<br>OAuth / JWT 発行"]
    Bot --> Features
    Api --> Features
    Features --> Shared
    Shared --> DB
    Web -. "Cookie JWT" .-> Api
```

`src/main.ts` が Bot ログイン後に同一プロセス内で Fastify API を起動する（`API_ENABLED=false` で無効化可能）。両層とも `src/features/` のサービス・リポジトリを共有し、Discord UI と HTTP の薄い境界がそれぞれ呼び出す。詳細は [API 層（web ダッシュボード）](#api-層web-ダッシュボード) を参照。

**起動コマンド**:

```bash
# 開発
pnpm dev

# 本番
pnpm start
```

---

## ディレクトリ構成

```
src/
├── main.ts                    # エントリーポイント（Bot 起動）
│
├── bot/                       # Discord プラグイン層（Gateway・コマンド/イベントの配線）
│   ├── client.ts              # BotClient クラス（discord.js Client 拡張）
│   ├── commands/              # スラッシュコマンド定義（自動スキャン）
│   ├── events/                # Discord イベントハンドラ（自動スキャン）
│   ├── handlers/interactionCreate/  # インタラクション振り分け
│   ├── shared/                # Bot 層内の複数機能で共用するユーティリティ
│   ├── errors/                # インタラクションエラーハンドリング
│   ├── types/                 # Command 型など Bot 層の型
│   ├── utils/                 # Bot用ユーティリティ（commandLoader / eventLoader 等）
│   └── services/
│       └── botCompositionRoot.ts  # Composition Root（全サービスの初期化・DI）
│
├── features/<feature>/        # 機能ごとの実装（Discord UI〜設定サービス〜リポジトリを集約）
│   ├── commands/              #   コマンド実行ロジック
│   ├── handlers/              #   イベント境界・起動処理
│   │   └── ui/                #   Button/Select/Modal などUI境界
│   ├── services/              #   機能固有のビジネスロジック
│   ├── repositories/          #   機能固有のランタイムデータリポジトリ
│   ├── constants/             #   共通定数・CustomID 定義
│   ├── <feature>SettingsService.ts     # 設定サービス
│   ├── <feature>SettingsDefaults.ts    # デフォルト設定・正規化
│   └── <feature>SettingsRepository.ts  # 設定リポジトリ（シングルトンゲッター内包）
│   # 例外: guild-settings は guildCore/guildSettingsAggregate リポジトリ + persistence/serializers/usecases を内包
│
├── api/                       # Fastify API 層（web ダッシュボード用・Bot と同一プロセスで起動）
│   ├── server.ts              #   buildApiServer/startApiServer（cookie→cors→rate-limit→routes。認証は decorate）
│   ├── auth/                  #   JWT 検証（authenticate）・guildId 認可（guildAccess）。発行/refresh は持たない
│   ├── routes/                #   ルート定義（guilds / settings / sticky / reactionRoles / tickets / bot）
│   ├── features/<f>Resource.ts #  domain↔contract マッパー + create*Resource（純粋関数）
│   └── lib/                   #   httpError / discordMappers / time（date-fns ja）/ request / botGuild
│
└── shared/                    # Bot・features・Web で再利用する横断コード（逆依存しない）
    ├── config/                # 環境変数定義（Zod バリデーション）
    ├── database/types/        # ドメイン型・リポジトリインターフェース定義（実装は各 features/<f>/ に分散）
    ├── errors/                # エラーユーティリティ・グローバルハンドラ（BaseError 階層は @ayasono/shared/core）
    ├── locale/                # i18n（i18next）
    ├── scheduler/             # JobScheduler（cron + setTimeout。saika 固有だが横断利用のため維持）
    ├── constants/             # 横断定数（embedColors 等）
    └── utils/                 # logger（@ayasono/shared/core の createLogger を wiring）, prisma, serviceFactory 等
```

### 設計原則

依存方向は `src/main.ts` → `src/bot/` → `src/features/` → `src/shared/`（一方向）。

| ルール                                                          | 理由                                 |
| --------------------------------------------------------------- | ------------------------------------ |
| `src/bot/` → `src/features/` → `src/shared/` の一方向依存のみ許可 | レイヤの疎結合を維持                 |
| `src/shared/` は `bot` / `features` に依存しない                | 横断コードの独立性を保証             |
| `src/features/` は `src/bot/` に依存しない                      | Bot 層と API 層の双方から再利用（Discord 非依存の設定サービス・リポジトリ） |
| 機能の実装は `src/features/<機能名>/` に集約                    | UI・ロジック・データ層を機能単位で凝集 |

命名規則・ディレクトリテンプレート・import 規約の詳細は [IMPLEMENTATION_GUIDELINES.md](IMPLEMENTATION_GUIDELINES.md) を参照してください。

---

## Discord Bot 設計

### Gateway Intents

```typescript
// src/bot/client.ts
intents: [
  GatewayIntentBits.Guilds, // サーバー情報・チャンネル情報
  GatewayIntentBits.MessageContent, // メッセージ本文の読み取り（Bump検知に必須）
  GatewayIntentBits.GuildMessages, // サーバー内メッセージイベント
  GatewayIntentBits.GuildMembers, // メンバー参加・退出イベント（MemberLog 用）
  GatewayIntentBits.GuildVoiceStates, // VC 参加・退出イベント（AFK移動・VAC 用）
];
```

> **注意**: `MessageContent` と `GuildMembers` は Discord Developer Portal での **Privileged Intents 有効化**が必要です。

### Bot パーミッション

Bot の招待時は **Administrator は要求せず、最小権限セット**を付与します。招待リンクの権限は [`INVITE_PERMISSIONS`](../../src/api/routes/bot.ts) で定義し、各機能の実 API 呼び出しに必要な個別権限のみを列挙します（ViewChannel / SendMessages / EmbedLinks / ReadMessageHistory / ManageMessages / ManageChannels / ManageRoles / MoveMembers / Connect / KickMembers / ManageGuild / ManageThreads / SendMessagesInThreads の13権限）。`MentionEveryone` は最小権限維持のため含めない（@everyone/@here 等の通知は飛ばないがメッセージ投稿自体は成功する）。

> `SendMessagesInThreads` が必要なのは **Bump 検知だけ**。インタラクション応答（reply / editReply / followUp）は interaction トークン経由のためチャンネルの送信権限を要求せず、スレッド内でコマンドを実行しても応答は返る。Bump 検知は messageCreate 起点の `channel.send()` なので、この権限が無いとスレッド内の Bump で予約パネルとリマインドが送れない。
>
> 一方、ticket / reaction-role のパネルは**スレッドへ設置させない**（[`rejectThreadChannel`](../../src/bot/shared/channelGuards.ts) で拒否）。権限の問題ではなく、スレッドはアーカイブされるとチャンネル一覧から消えるため、恒久設置物を置くと管理者が見失うという設計判断。

> チャンネル作成時の overwrite には昇格権限ビット（ManageChannels / ManageRoles）を含めない。Administrator を持たない Bot が overwrite で昇格ビットを付与しようとすると `403 Missing Permissions` になるため、これらはギルド全体の権限で保持する。

### イベントハンドラ

| イベント          | 用途                                                         |
| ----------------- | ------------------------------------------------------------ |
| clientReady       | Bot 起動時の初期化処理                                       |
| interactionCreate | スラッシュコマンド・ボタン・モーダル等のインタラクション処理 |
| messageCreate     | Bump 検知・Sticky Message 再送信                             |
| messageDelete     | チケットパネル・リアクションロールパネルの自己修復           |
| voiceStateUpdate  | VC自動募集・VAC の同期処理（VC自動募集を先に await する）    |
| guildMemberAdd    | メンバー参加ログ通知                                         |
| guildMemberRemove | メンバー退出ログ・退出ユーザーの記録削除                     |
| guildMemberUpdate | 未承認自動キックの対象ロール解除の検知                       |
| channelDelete     | 削除チャンネル関連設定のクリーンアップ（チケットチャンネルならチケットの記録と自動削除タイマーも消す） |
| roleDelete        | 削除ロールの Bump リマインダー設定除去                       |
| guildCreate       | 参加ログ・**親レコード（`guilds`）の作成と削除予約の取り消し**・稼働サーバー数のプレゼンス更新・**チケットの同期**（止めていた自動削除タイマーの組み直しと、不在中に消されたチャンネルのチケットの片付け。Bot が扱えないチケットのチャンネルがあれば、エラー通知チャンネルに1回知らせる）・**オーナーへの導入／再導入 DM**（日英併記・送信失敗は握りつぶす。チケットの同期の後に送り、扱えないチケットをエラー通知チャンネルへ知らせられなかったときは、その件数と付け直す手順を再導入 DM に載せる。→ [Bot がチケットのチャンネルを扱えないとき](#bot-がチケットのチャンネルを扱えないとき入れ直した後の古いチケット)） |
| guildDelete       | Bot 退出時のジョブ停止（`stopGuildJobsUsecase` 経由。Bump リマインダーの予約は DB でも `cancelled` にする）＋**猶予後のデータ削除の予約** |
| guildAvailable    | 再接続（再 IDENTIFY）でギルドが戻ったときの**チケットの同期**（`syncGuildTicketsOnAvailable`）。`src/bot/events/` ではなく、`clientReady` の処理の中で起動時のチケット同期（`syncTicketsOnStartup`）の後に登録する（起動時の各ギルドの `guildAvailable` は `clientReady` より前に出て、起動時の同期が済ませるため） |

### BotClient クラス

`discord.js` の `Client` を拡張し、以下を追加しています：

```typescript
class BotClient extends Client {
  commands: Collection<string, Command>; // 登録済みコマンド
  cooldownManager: CooldownManager; // クールダウン管理
}
```

### コマンド・イベントの自動ロード

`src/bot/commands/` と `src/bot/events/` 内のファイルは、**バレルファイルなし**で自動ロードされます。

| ローダー                         | スキャン対象            | 判定条件                  |
| -------------------------------- | ----------------------- | ------------------------- |
| `src/bot/utils/commandLoader.ts` | `src/bot/commands/*.ts` | `data` + `execute` を持つ |
| `src/bot/utils/eventLoader.ts`   | `src/bot/events/*.ts`   | `name` + `execute` を持つ |

**コマンド追加手順**: `src/bot/commands/<name>.ts` に `Command` 型を満たすオブジェクトをエクスポートするだけで、配列への手動追加は不要です。

> **tsup `splitting` と `import.meta.dirname` の注意点**
>
> tsup の `splitting: true` が有効なとき、複数エントリーから参照される関数は `dist/chunk-XXXXXXXX.js` のような共有チャンクに移動する。この場合、関数内の `import.meta.dirname` はチャンクの置き場所（`dist/` 直下）を返すため、ローダー内でパスを解決すると実際のディレクトリ（`dist/bot/commands/`）とずれる。
>
> これを防ぐため、`loadCommands()` と `loadEvents()` は **ディレクトリパスを引数で受け取る**設計になっている。エントリの `main.ts`（`dist/main.js` にコンパイルされるため `import.meta.dirname` が確実に `dist/` を返す）から、`bot/commands` / `bot/events` を付けた正しいパスを渡す：
>
> ```typescript
> // src/main.ts
> const commands = await loadCommands(resolve(import.meta.dirname, "bot/commands")); // → dist/bot/commands/
> const events = await loadEvents(resolve(import.meta.dirname, "bot/events")); // → dist/bot/events/
> ```
>
> ローダー関数内で `import.meta.dirname` を使ってパスを解決してはいけない。将来新しいローダーを追加する場合も同様に呼び出し元からパスを渡すこと。

```typescript
// src/bot/commands/hello.ts
export const helloCommand: Command = {
  data: new SlashCommandBuilder().setName("hello").setDescription("..."),
  async execute(interaction) { ... },
};
```

### コマンドの型インターフェース

```typescript
interface Command {
  data: SharedSlashCommand;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
  cooldown?: number; // 秒単位（省略時はクールダウンなし）
}
```

---

## API 層（web ダッシュボード）

`src/api/` は web ダッシュボード（`saika-dash.sonozaki.net`）の **per-guild バックエンド**となる Fastify API。Bot と同一プロセスで起動し（`src/main.ts` が Bot ログイン後に `startApiServer` を呼ぶ・`API_ENABLED=false` で無効化可能）、`src/features/` の設定サービス・リポジトリを Bot 層と共有する。

### 認証（web BFF 集約・saika は検証のみ）

認証は **web BFF**（web リポの別プロセス）に集約し、saika は **JWT 検証のみ**を行う。saika は Discord を呼ばず、OAuth も refresh トークンも持たない。

- **JWT_SECRET を web BFF と共有**（HMAC-SHA256）。web BFF がログイン時に発行する Cookie のセッション JWT を saika が検証する。
- `auth/authenticate.ts`: Cookie の JWT を検証して `request.authUser`（`SessionClaims`）を確立。失効時は **401**（refresh はしない＝BFF 側の責務）。
- `auth/guildAccess.ts`: 対象 `guildId` が `claims.guilds`（ユーザーが管理可能なギルド ID 配列）に含まれるかを判定し、無ければ **403**。続けて Bot がそのギルドに参加しているか（ゲートウェイのキャッシュ）を判定し、居なければ **404**（`lib/botGuild.ts` の `requireBotGuild`）。`claims.guilds` には Bot 未参加のギルドも入るため、これが無いと親行の無いギルドへの書き込みが FK 違反の 500 になり、退出後の猶予中のギルドには効かない設定を書けてしまう。判定は権限が先（逆にすると管理権限の無いギルドの参加有無が 403/404 の違いで漏れる）。
- 一覧（Bot 未参加ギルドの名前/アイコン）は Discord を呼べないため **web BFF へ移管**。saika は per-guild ルート + `GET /api/guilds/joined`（参加ギルド ID の照会）のみ。

### レイヤ構成

| 層 | 役割 |
| --- | --- |
| `routes/*.ts` | HTTP 境界（薄い）。認可デコレータを適用し、Resource とサービスを呼ぶ |
| `features/<f>Resource.ts` | domain ↔ API contract の純粋マッパー + `create*Resource`。アダプタは Composition Root の getter を各メソッド内で遅延取得 |
| `src/features/<f>` | Bot 層と共有する設定サービス・リポジトリ（Discord 非依存） |
| `lib/` | `httpError`（`ApiHttpError` + `toErrorResponse`）/ `discordMappers` / `time`（date-fns ja）/ `request` / `botGuild`（`requireBotGuild`: Bot 未参加なら 404） |

サーバー構築は `server.ts` の `buildApiServer`（テストは `app.inject()` で直接叩ける）。プラグインの登録順は cookie → cors → rate-limit → `apiRoutes`(`/api`) で、リクエストのフックもこの順に走る。認証（`authenticate` / `requireGuildAccess`）はミドルウェアではなく `decorate` で生やし、各ルートが `preHandler` として使う。

`trustProxy` は `true` ではなく、**信頼する直前ホップのアドレス範囲**（`src/api/constants.ts` の `TRUSTED_PROXY_RANGES`）で指定する。`true` だと `X-Forwarded-For` の最左、つまり攻撃者が送った値が `request.ip` になり、レート制限をすり抜けられる。範囲の根拠と経路は [DEPLOYMENT.md](DEPLOYMENT.md#web-api-の到達経路) を参照。**クライアント IP は `request.ip` だけを使い、`X-Forwarded-For` / `CF-Connecting-IP` を直接読まない**（取得口を1つに保つ）。この挙動は `tests/unit/api/server.test.ts` の回帰テストで固定している。

### エンドポイント概要

機能別設定 7 種（config / afk / vac / member-log / bump / vc-auto-recruit / unverified-kick）の CRUD、コレクション 3 種（sticky / reaction-role / ticket・パネル投稿副作用つき）、ギルド概要（overview）・Discord リソース（channels / roles / members）・`GET /api/bot`・`GET /api/guilds/joined`・全設定リセット `POST /api/guilds/:id/reset-all`。

### 関連環境変数

`API_ENABLED` / `API_HOST` / `API_PORT` / `WEB_ORIGIN`（CORS 許可オリジン・カンマ区切り）/ `JWT_SECRET`（本番必須・BFF と共有）。

> 認証・CORS の横断方針は [PROJECT_ARCHITECTURE.md](../../../infra/docs/PROJECT_ARCHITECTURE.md)、本番デプロイ手順・知見（SSL / Tunnel / Coolify compose / ポート）は [web/docs/DEPLOYMENT.md](../../../web/docs/DEPLOYMENT.md) を参照。

---

## データベース設計

### 接続管理

`setPrismaClient()` / `getPrismaClient()` / `requirePrismaClient()` をモジュールレベルで管理します。
`global` 変数を使わず、モジュールスコープの変数で Prisma Client を保持します。

```typescript
// 起動時に一度だけ登録
setPrismaClient(prisma);

// 利用側（必ず存在する前提）
const prisma = requirePrismaClient(); // 存在しない場合は Error をスロー

// 利用側（存在しない可能性あり）
const prisma = getPrismaClient(); // null の場合あり
```

### スキーマ構成

機能ごとに独立したテーブルを持ちます。`GuildSettings` テーブルは共通設定（locale 等）のみを保持し、機能設定は専用テーブルに分離されています。`Guild` が全テーブルの親で、機能テーブルは例外なくここへ FK を張ります。

| テーブル                  | 用途                                       |
| ------------------------- | ------------------------------------------ |
| `Guild`                     | ギルドの親レコード（導入日時・削除予定日時）。全機能テーブルの FK 先 |
| `GuildSettings`             | ギルド共通設定（locale 等）                |
| `GuildAfkSettings`          | AFK 機能設定                               |
| `GuildBumpReminderSettings` | Bump リマインダー設定                      |
| `GuildMemberLogSettings`    | メンバーログ設定                           |
| `GuildVacSettings`          | VC 自動作成設定                            |
| `GuildVcAutoRecruitSettings` | VC 自動募集設定                            |
| `GuildUnverifiedKickSettings` | 未承認ユーザー自動キック設定             |
| `GuildUnverifiedKickWarn` | 未承認キックの警告記録（guildId + userId 複合PK） |
| `BumpReminder`            | Bump リマインダー記録（スケジュールデータ） |
| `StickyMessage`           | 固定メッセージ記録                         |
| `GuildTicketSettings`       | チケット機能設定（カテゴリ・スタッフロール・パネル情報） |
| `Ticket`                  | チケットレコード（ステータス・作成者・自動削除タイマー） |
| `GuildReactionRolePanel`  | リアクションロールパネル設定（ボタン・モード・表示設定） |

JSON 配列・オブジェクトフィールド（`mentionUserIds`, `triggerChannelIds`, `buttons`, `staffRoleIds`, `embedData` 等）は PostgreSQL の `jsonb` 型でネイティブに保存し、Prisma が配列・オブジェクトのまま読み書きします（`JSON.parse`/`stringify` による変換は不要）。

### 退出時データのライフサイクル

Bot をサーバーから外しても、データはその場では消えません。**猶予30日**を置いてから削除します。「Bot の再招待は破壊的操作ではない」という利用者の期待に実装を合わせるためです（2026-09-23 決定・猶予日数は `GUILD_DELETION_GRACE_DAYS`）。

| タイミング | 処理 |
| --- | --- |
| `guildDelete` | ジョブを即停止し、`guilds.scheduled_deletion_at` に30日後を書く。**データは消さない**（Bump リマインダーの予約行だけは `cancelled` にする） |
| `guildCreate` | 親行を作り、削除予約を取り消す。猶予内の再導入なら設定はそのまま復活し、退出時に止めたチケットの自動削除タイマーも組み直す |
| 起動時（`clientReady`） | 照合を1回実行し、日次ジョブを登録する |
| 再 IDENTIFY の後（`ShardReady`） | 照合を実行する（切断中に起きた導入・退出を日次ジョブまで待たない） |
| 再接続でギルドが戻ったとき（`guildAvailable`） | そのギルドのチケットを同期する（切断中に消されたチャンネルのチケットの片付けと、自動削除タイマーの組み直し）。切断中に再導入されたギルドは `guildCreate` ではなくこちらになるので、タイマーもここで戻る |
| 日次ジョブ（毎日 4 時 JST） | 照合を実行する（`GUILD_DELETION_JOB_ID`） |

**照合**（`reconcileGuildsUsecase`）は、DB の `guilds` と Bot の参加状況（**REST の `GET /users/@me/guilds` で取得**）を突き合わせて予約を正しい状態へ揃えます。

1. 参加中のギルドの親行を補完する
2. 参加中のギルドの削除予約を取り消す
3. 参加していないのに予約の無いギルドへ30日後の削除を予約する（既存の予約は延ばさない）
4. 猶予切れのギルドを削除する

> **ジョブの停止だけは遅らせない。** 参加していないギルドのタイマーが生きていると、投稿・削除を試み続けてエラーログを吐くため。遅らせるのはデータの削除だけです。
>
> **予約をイベントだけで管理しない。** `guildCreate` / `guildDelete` は Bot の停止中・切断中に起きた参加・退出では飛ばないため、イベントだけに頼ると「参加中のギルドのデータを消す」か「退出したギルドのデータが永久に残る」のどちらかになります。イベントは即時反映の近道で、正しさは照合で担保します。
>
> **照合では「予約の取り消し」を「削除」より必ず先に行う。** 順序を逆にすると、停止中に外されて入れ直されたギルドのデータを期限切れとして消してしまいます。
>
> **参加状況はゲートウェイのキャッシュではなく REST で取る。** discord.js は再 IDENTIFY 後の READY で消えたギルドをキャッシュから取り除かないため、キャッシュを使うと切断中に外されたギルドが参加中に見え続け、再起動するまで削除予約が入りません。
>
> **参加ギルドが0件のときは予約を入れない。** 0件は設定ミス（ギルドに参加していない別アプリのトークンで本番 DB に繋いだ等）の可能性が高く、全ギルドを一斉に予約してしまうのを避けるためです（API の失敗は例外になり、照合そのものが中止されます）。
>
> **削除の直前にもう一度ジョブを止める。** 猶予中に Bot を再起動すると `restoreBumpRemindersOnStartup` が pending レコードからタイマーを組み直すため、「タイマー解除 → DB 削除」の順序を保つ必要があります。
>
> **既知の制限。**
>
> - Bot の停止中・切断中に導入・再導入されたギルドのオーナーには導入時／再導入時 DM が届きません（照合は親行と予約を黙って直すだけ。照合から DM を送ると、初回リリースで設定の無い既存ギルドにも親行が作られ、一斉送信になるため送らない）。
> - 猶予内に再導入しても、退出時点で予約中だった Bump リマインダーは戻りません。退出時に DB でも取り消しているためで、次の Bump で再予約されます。その予約の「リマインドが通知されます」のパネルは、退出中は Bot が消せないためチャンネルに残ります（次の Bump の前回パネル削除も pending の行しか見ないので、このパネルは消えません）。

即時削除が要るときは `/guild-settings reset-all`（`purgeGuildDataUsecase`）を使います。この経路は猶予を挟みません。

### Repository パターン

データベースへのアクセスはすべて Repository クラスを経由します。
テスト時は Repository インターフェースをモック注入することで DB 依存を排除できます。

**設定リポジトリ（`src/features/<feature>/<feature>SettingsRepository.ts`、guild-settings は `src/features/guild-settings/`）**:

機能ごとの設定テーブルに対応するスタンドアロンリポジトリです（インターフェース定義は `src/shared/database/types/` に集約）。各リポジトリは個別のインターフェースを実装し、シングルトンゲッター（例: `getAfkSettingsRepository(prisma)`）で取得します。

```
GuildCoreRepository              ← ギルド設定コアCRUD（IGuildCoreRepository）
GuildRegistryRepository          ← ギルド親レコードの登録（IGuildRegistryRepository）
GuildSettingsAggregateRepository   ← 全設定の一括削除（IGuildSettingsAggregateRepository）
AfkSettingsRepository              ← AFK設定（IAfkSettingsRepository）
BumpReminderSettingsRepository     ← Bumpリマインダー設定（IBumpReminderSettingsRepository）
MemberLogSettingsRepository        ← メンバーログ設定（IMemberLogSettingsRepository）
VacSettingsRepository              ← VAC設定（IVacSettingsRepository）
VcAutoRecruitSettingsRepository    ← VC自動募集設定（IVcAutoRecruitSettingsRepository）
UnverifiedKickSettingsRepository   ← 未承認自動キック設定（IUnverifiedKickSettingsRepository）
UnverifiedKickWarnRepository       ← 未承認キック警告記録（IUnverifiedKickWarnRepository）
TicketSettingsRepository           ← チケット機能設定（IGuildTicketSettingsRepository）
ReactionRolePanelRepository      ← リアクションロールパネル（IReactionRolePanelRepository）
```

> **親テーブル `Guild` と外部キー制約**（2026-09-24 導入）。`guildId` を持つ13モデルはすべて `Guild` へ `@relation(onDelete: Cascade)` を張っています。狙いは2つで、①Bot が把握しているギルド（参加中か猶予中）を `guilds` の1テーブルで列挙でき、ギルド単位の状態（導入日時・削除予約）を置ける場所を作ること ②ギルド単位の後始末を「親行を1つ消す」に集約することです。
>
> **`guild_settings` 行の欠落は親テーブルでは解消しません。** この行は `/guild-settings set-locale` か `set-error-channel` を実行したときだけ作られ、実測でデータを持つギルドの67%に行がありませんでした。親テーブル導入後も同じなので、`guild_settings` 行の有無を「ギルドの有無」の代わりに使わないでください（使うべきは `guilds` 行）。**「設定の有無」はどちらの行でも分かりません。** `guilds` 行は参加中の全ギルドに設定の有無と関係なく作るためで、設定の有無は各機能テーブルを見て判断します。
>
> FK があるため、**親行が無いギルドではどの機能の設定も保存できません**（FK 違反になる）。親行は `GuildRegistryRepository` の2経路で担保します。`handleGuildCreate`（参加時）と、起動時・日次の照合（Bot 停止中に追加されたギルドは `guildCreate` が飛ばないため。→ [退出時データのライフサイクル](#退出時データのライフサイクル)）。
>
> `/guild-settings reset-all` の `deleteAllSettings()` も、テーブルを個別に列挙する実装をやめて**親行を消して同じ `joinedAt`・削除予約で作り直す**形にしています（Bot はまだ参加しているため、登録そのものは残す必要がある）。新しいギルド単位テーブルは FK を張るだけで自動的に削除対象になります。

**ランタイムデータリポジトリ（`src/features/<feature>/repositories/`）**:

設定以外のランタイムデータ（レコード・状態管理）を扱うリポジトリです。

```
BumpReminderRepository   ← BumpReminder テーブルの CRUD
StickyMessageRepository  ← StickyMessage テーブルの CRUD
TicketRepository         ← Ticket テーブルの CRUD
```

### Composition Root と DI

`src/bot/services/botCompositionRoot.ts` がすべてのサービス・リポジトリを初期化します。
各サービスは `createBotServiceAccessor<T>()` で生成した getter/setter ペアでモジュールレベルに保持されます。

```typescript
// 起動時に一度だけ初期化
initializeBotCompositionRoot(prisma);

// 利用側（ハンドラーから呼び出す）
const service = getBotBumpReminderSettingsService();
```

未初期化状態で getter を呼ぶと即座に `Error` がスローされるため、初期化漏れを起動時に検出できます。

---

## スケジューラー設計

`JobScheduler` は2種類のジョブをサポートします。

| 種別           | メソッド          | 仕組み                  | 用途                |
| -------------- | ----------------- | ----------------------- | ------------------- |
| 繰り返しジョブ | `addJob()`        | node-cron               | 定期実行タスク      |
| 1回限りジョブ  | `addOneTimeJob()` | setTimeout + `.unref()` | Bump リマインダー等 |

`setTimeout` に `.unref()` を呼び出しているため、**タイマーが残っていても Node.js プロセスは正常終了**できます。

**約24.8日を超える遅延は区切って待ちます。** `setTimeout` 1回で待てる上限は 2^31-1 ms（約24.8日・`MAX_TIMEOUT_DELAY_MS`、`src/shared/scheduler/jobScheduler.constants.ts`）で、これを超える値を渡すと Node は遅延を 1ms に切り詰めて即座に発火させます（チケットの自動削除日数を25日以上にすると、クローズ直後に会話ごと消えていた）。`addOneTimeJob()` は上限ずつ待ち、発火のたびに残りを同じジョブ ID のまま張り直します（debug ログ `system:scheduler.job_rearmed`）。

- 張り直しでは管理マップの同じ ID のハンドルを差し替えるので、`hasJob` / `removeJob` / `stopAll` / 同 ID の置き換えは待機のどの区間でも効く。張り直した区間のタイマーも `.unref()` する
- 残りは時計（`Date.now`）ではなく区間の長さを差し引いて求める。`setTimeout` は単調時計で動き、区間ごとに指定より早くは発火しないので、合計の待ち時間は必ず指定の遅延以上になる（システム時刻を進めても早まらない）
- `NaN`・`±Infinity` の遅延は登録を拒否し、エラーログ（`system:scheduler.invalid_delay`）を出す。同じ ID の既存ジョブにも触れない。0 以下の有限値は従来どおり即時実行する（起動時の復元で期限切れの分をすぐ処理する前提のため）
- タイマーはメモリ上にしか無いので、再起動したら各機能が DB から予約を組み直す点は変わらない

`clientReady` で登録される繰り返しジョブは以下の2本です。

| ジョブ ID | 頻度 | 用途 |
| --- | --- | --- |
| `unverified-kick:daily-check` | 毎時 0 分 | 未承認ユーザー自動キック（per-guild の timezone / runHour で絞り込み） |
| `guild-settings:deletion-sweep` | 毎日 4 時（Asia/Tokyo） | ギルド登録の照合と猶予切れギルドのデータ削除（→ [退出時データのライフサイクル](#退出時データのライフサイクル)） |

`BumpReminderManager` は `JobScheduler` をラップし、リマインダーの DB 永続化と再起動時の復元を担います。

```
Bot 起動
  └─ clientReady イベント
       └─ BumpReminderManager.restorePendingReminders()
            ├─ DB から status=pending のリマインダーを取得
            ├─ scheduledAt が過去 → 即時実行
            └─ scheduledAt が未来 → setTimeout で再スケジュール
```

リマインダーはメモリ上の `Map` に **`"guildId:serviceName"` の複合キー**で登録されます（同一ギルドで Disboard / Dissoku が独立して共存できるようにするため）。したがってギルド単位でまとめて解除する場合は、完全一致で引く `cancelReminder(guildId)` ではなく **`BumpReminderManager.cancelAllForGuild(guildId)`** を使う必要があります。前者は複合キーにヒットしません。キーを guildId とサービス名に分けるときは `parseBumpReminderKey`（`toBumpReminderKey` の逆変換）を使います。リマインドのタスクが終わって `Map` から外すのは、エントリの `reminderId`（DB の行 ID）が自分のものと一致するときだけです。実行中に同じキーで次の予約が入ることがあり、無条件に外すと次の予約まで取り消せなくなるためです（ジョブ ID はキーから決まり前後で同じなので、区別には使えない）。

ギルド単位の取り消しは、パネルメッセージ（「〜にリマインドが通知されます」）も消すかどうかで2つを使い分けます。

| 経路 | 使うもの | パネル |
| --- | --- | --- |
| 無効化（`/bump-reminder-settings disable`・ダッシュボードで無効のまま保存）・リセット・全設定リセット（`purgeGuildDataUsecase`。`/guild-settings reset-all`・Web API `POST /:guildId/reset-all`） | `handlers/usecases/cancelGuildBumpReminders(client, guildId)` | 消す |
| Bot の退出（`stopGuildJobsUsecase`） | `BumpReminderManager.cancelAllForGuild(guildId)` | 触れない（退出後は Bot がチャンネルにアクセスできず、消せない） |

- `cancelGuildBumpReminders` は、先に `IBumpReminderRepository.findPendingByGuild` でパネルの場所を控え、次にタイマーと DB を取り消し（`cancelAllForGuild`）、最後にパネルを消す。取り消すと pending の行から外れてパネルを引けなくなり、次の Bump の前回パネル削除（pending の行しか見ない）でも消えなくなるため。`BumpReminderManager` は Discord に依存させないので、パネルを消す処理はハンドラー層の usecase に置く
- リセットはコマンドとダッシュボードの両方が `handlers/usecases/resetBumpReminderSettings` を通す（初期値 `createDefaultBumpReminderSettings`＝有効・全チャンネルで検知・メンションなしを保存してから、予約とパネルを取り消す）。経路によって結果が変わらないようにするため
- 無効化・リセットは「設定を保存 → 予約を取り消す」の順。逆にすると、その間に検知した Bump がまだ有効の設定を読んで新しい予約を作り、残ってしまう
- それでも、保存より前に設定を読み終えていた検知（前回パネルの削除・新パネルの送信を待っている間に、保存と取り消しが両方済んだもの）の予約は、取り消しの時点でまだ無いので拾えない。そこで検知側（`handleBumpDetected`）は**予約を登録した後に設定を読み直し**、無効なら今回の予約（`cancelReminder(guildId, serviceName)`）とパネルを取り消す。無効化側は「保存 → 取り消し」、検知側は「登録 → 読み直し」の順なので、登録が取り消しより前なら取り消し側が、後なら読み直しが拾う。リセットは有効に戻すので、リセットと同時に検知した Bump の予約はそのまま残る（リセット後の Bump として扱う）
- 保険として、発火時に無効だった予約（`sendBumpReminder`）も、送らずに抜ける前にパネルを消す。この予約は発火済み（`sent`）になり、無効化の取り消しや次の Bump の前回パネル削除（どちらも pending の行しか見ない）では拾えなくなるため
- パネルの削除は `handlers/usecases/deleteBumpPanel.deleteBumpPanelMessage` に共通化している（リマインドの送信後・発火時に無効だったとき・次の Bump の検知時・検知直後に無効化を見つけたとき・予約の取り消し時）

### チケットの自動削除タイマー

チケットの自動削除は `jobScheduler.addOneTimeJob` の one-time ジョブで、残り時間は `computeAutoDeleteRemainingMs`（自動削除日数 − クローズしていた時間の累計 `elapsedDeleteMs` − 今回クローズしてからの経過）で求めます。

- **発火時に記録と設定を読み直す。** 記録が無いかクローズ済みでなければ何もしない（予約の後に削除・再オープンされた場合）。カテゴリの設定が無ければ削除せず保留する（再試行はせず、パネルの再設置で再開する。次の箇条）。Bot がチャンネルを削除できない（`TICKET_CHANNEL_BOT_DELETE_PERMISSIONS` で判定する。下の「Bot がチケットのチャンネルを扱えないとき」）か、ギルドを取得できなければ、記録を消さずに保留し、1時間後（`TICKET_AUTO_DELETE_HOLD_RETRY_MS`）に再試行する（扱えるようになるまで1時間ごと）。ログは最初の保留だけ warn、再試行での保留は debug
- **設定（パネル）が無いカテゴリのチケットは凍結する。** パネル設置チャンネル・パネルメッセージの削除や Web API の `DELETE /tickets/:id` では設定だけを消し、チケットのチャンネルと記録は残す。設定が無いとスタッフロールも自動削除日数も分からないので、Bot からのクローズ・再オープン・削除は `ticketGuards.findTicketConfigOrReply` で理由を返して止め、自動削除も保留する。パネル削除と同時にチケットを消す案は、パネル設置チャンネルを誤って消しただけで会話履歴が全部消えるため採らない。出口は2つで、同じカテゴリにパネルを作り直す（`/ticket-settings setup` の完了時と Web API の `POST /tickets` で `resumeAutoDeleteForCategory` が予約し直す。期限を過ぎていればすぐ削除）か、チャンネルを直接消す（`channelDelete` で記録も片付く）
- **組み直しは `restoreAutoDeleteTimersForGuild` に集約する。** 起動時・猶予内の再導入・再接続（`guildAvailable`）・パネルの再設置から呼ぶ。起動時・再導入・再接続では、既に予約があるチケットは組み直さない（再接続のたびに同じ予約を張り直して scheduler の warn が大量に出るのを防ぐ）。パネルの再設置（`resumeAutoDeleteForCategory`）だけは `replaceExisting` で既存の予約も置き換え、作り直した設定の日数と closedAt から計算し直す（置き換えの warn は quiet で抑える）。残っている予約は作り直す前の日数で計算されており、そのままにすると途中の再起動の有無で消える時期が変わるため
- **経過時間の累計は保存時に int4 の上限（2^31-1 ms）で切り詰める**（`TicketRepository.create` / `update`。約24.8日を超えてクローズしていたチケットの再オープンで更新が失敗しないように）。切り詰めた分だけ次のクローズ後の自動削除は遅くなるが、早まることはない

### Bot がチケットのチャンネルを扱えないとき（入れ直した後の古いチケット）

`createTicketChannel` は、@everyone の「チャンネルを見る」を拒否し、Bot 自身へのメンバーの上書きで `TICKET_CHANNEL_BOT_PERMISSIONS`（ViewChannel / SendMessages / ReadMessageHistory / EmbedLinks）を許可する。**Bot をキックすると Discord はこの上書きを消す**ので、30日以内に入れ直すと（データは残る）、Administrator の無い Bot は、それ以前に作ったチケットのチャンネルを見られない（2026-09-26 実機で確認: キック前に作ったチャンネルの上書きに Bot の ID が無い）。見えないチャンネルの上書きは Bot 自身では直せない（ViewChannel が無いと他の権限もすべて無い扱い）ので、管理者が付け直すしかない。カテゴリの上書きは同期していないチャンネルには効かないため、付け直しはチャンネルごとになる。同じ理由で、エラー通知チャンネルやログなど、管理者が Bot 用に権限を付けていた非公開チャンネルもキックで上書きが消え、付け直しが要る。

判定に使う権限は2組ある。クローズ・再オープンは `TICKET_CHANNEL_BOT_PERMISSIONS` の4つ、削除（削除ボタン・`/ticket delete`・自動削除・撤去）はそれに ManageChannels を加えた `TICKET_CHANNEL_BOT_DELETE_PERMISSIONS`（以下「削除用の組」）。ManageChannels は昇格ビットなのでチャンネルの上書きには含めず、ギルド全体の権限（ロール）で持つ（→ [Bot パーミッション](#bot-パーミッション)）。招待リンクの権限に含まれるので入れ直せば戻るが、招待時に外されたり、Bot のロールから外されたり、チャンネルの上書きで拒否されたりすると欠ける。

以前は、この状態で再オープンすると「タイマーを取り消す → 上書きの変更に黙って失敗 → 記録をオープンにする → 通知の送信が 50001 Missing Access で失敗」となり、**記録はオープン・タイマーは取り消し済み・チャンネルはクローズのまま**の食い違いが残った。これを次の4点で防ぐ。

- **判定は `ticketChannelAccess` に集約する。** `getTicketChannelAccess` が `guild.channels.fetch(id)` と `permissionsFor(me)` で `handleable` / `missing` / `inaccessible` を返す。求める権限は引数で渡し（省略時は `TICKET_CHANNEL_BOT_PERMISSIONS`、削除の経路は削除用の組）、`inaccessible` には理由を付ける。扱う4つのどれかが欠ける（または確かめられない）なら `channel_permissions`、4つはあって ManageChannels だけが欠けるなら `manage_channels`（4つが欠けていれば、ManageChannels を足しても扱えないので先にそちらを案内する）。取得の失敗は、Discord が Unknown Channel（10003）を返したときだけ `missing` とし、それ以外（Missing Access・一時的な失敗）は `inaccessible` にする（無いと誤判定して記録を消さないため）。Bot 自身のメンバーが取れないときも `inaccessible`
- **操作の前に確かめる。** クローズ・再オープン・削除のコマンド（`/ticket close|open|delete`）とボタン（close / open / delete / delete-confirm）は、操作者の権限を確かめた（`ticketGuards.canOperateTicketOrReply`。作成者はクローズ・再オープンだけ、スタッフロールか管理者権限を持つメンバーは削除も）後に `ticketGuards.findHandleableTicketChannelOrReply` を呼び、扱えなければ「Bot権限不足」で理由と対処（付け直す4つの権限）を本人にだけ返して、何も変えない。削除（delete / delete-confirm と `/ticket delete`）は削除用の組で確かめ、理由が `manage_channels` のときは、付け直しではなく「Bot のロールに『チャンネルの管理』を付けるか、このチャンネルの権限設定で拒否していないか確認する」よう案内する（キックとは関係なく起きるため。案内のキーは `toBotChannelAccessMessageKey` が理由から選ぶ）。`closeTicket` / `reopenTicket` / `deleteTicket` 自身も、状態を変える前に同じ確認をして `ValidationError` で止める（呼び出し元の確認をすり抜けても食い違いを残さないため）。`deleteTicket` はチャンネルが無いと確定したとき（`missing`）だけ、記録とタイマーの片付けに進む
- **クローズ・再オープンは、チャンネルの操作を先に行う。** 「通知を送る → 記録を更新する（失敗したら送った通知を消す。`sendNotificationThenUpdate`）→ タイマーを予約／取り消す → 作成者・スタッフの送信の上書きを変える → 前回の通知を消す」の順。失敗しやすいのはチャンネルの操作なので、そこで失敗すれば何も変わっていない。タイマーは記録を変えた後に触る（再オープンで先に取り消すと、記録の更新に失敗したときにクローズのまま自動削除されなくなる）
- **自動削除と撤去は、扱えないチャンネルを残して記録だけ消すことをしない。** どちらも削除用の組で判定する（ManageChannels だけが欠ける場合も同じ扱い）。`executeAutoDelete` は `inaccessible`（とギルドを取得できないとき）には記録を消さずに保留し、同じジョブ ID で1時間後（`TICKET_AUTO_DELETE_HOLD_RETRY_MS`）に予約し直す（扱えるようになるまで1時間ごと）。単発のジョブは発火時にスケジューラーから消えるので、予約し直さないと、管理者が付け直しても次の再起動・再接続・再導入まで消えないため。管理者が付け直すと、期限を過ぎていたクローズ済みチケットは1時間以内に消える（再試行の時刻は付け直した時刻と関係ないため、残したければチャンネルごとに付け直してすぐ再オープンする）。再起動や退出で再試行の予約が消えても、起動時・再導入の組み直し（`restoreAutoDeleteTimersForGuild`）が予約し直す（期限を過ぎていればすぐ発火し、扱えなければまた保留する）。保留のログは、最初だけ warn（`ticket:log.auto_delete_held_channel_inaccessible`）で、再試行での保留と、再試行の予約（スケジューラーの `job_scheduled`、`scheduledLogLevel: "debug"`）は debug にする（扱えないまま1時間ごとにログが並ばないように）。カテゴリの設定が無いときの保留は、今までどおり再試行しない（パネルの再設置で `resumeAutoDeleteForCategory` が再開する）。撤去（`cleanupTicketSettings`）は、扱えないチャンネルのチケットを飛ばして warn を残す（撤去全体は止めない。記録は `deleteByCategory` で消え、チャンネルは管理者が消す）

**入れ直したときに管理者へ知らせる。** `syncGuildTickets` の突き合わせ（`reconcileTicketChannels`）は、`guild.channels.fetch()`（閲覧権限に関係なく全チャンネルと上書きを返す）と `permissionsFor` で、存在するが Bot が扱えないチケットを集めて warn を出す。`guildCreate`（再導入）のときだけ `notifyInaccessibleChannels` を立て、エラー通知チャンネルへ `notifyWarnChannel` で1回まとめて知らせる（対象のチャンネルは先頭の `TICKET_LIST_MAX_DISPLAY` 件と残りの件数、付け直す手順。文面はサーバーの言語）。

- **同期はオーナー宛 DM より前に行う。** エラー通知チャンネルへ送れたかどうかで DM の中身を決めるため。未設定か、Bot がそこへ送れなかったときは、扱えないチケットの件数と付け直す手順を再導入 DM（日英併記）に載せる。管理者専用のエラー通知チャンネルは、キックで Bot への上書きも消えているため送れないことが多く、チャンネルへの通知だけでは管理者に届かないため。どちらの文面にも、エラー通知チャンネルやログなど Bot 用に権限を付けていた非公開チャンネルも付け直しが要ることを書く
- **`notifyWarnChannel` / `notifyErrorChannel` の送信失敗は warn で残す。** 送れない状態（上書きが消えたエラー通知チャンネル等）にログで気づけるようにするため
- **起動時・再接続（`guildAvailable`）では通知も DM も出さず、ログだけにする**（毎回出ると騒がしいため）。このため、Bot の停止中に再導入された場合（起動時の同期で拾う）と、切断中に再導入されて `guildCreate` ではなく `guildAvailable` で戻った場合は管理者に知らせない（ログと、クローズ・再オープン・削除を押したときの返信で分かる）

### ギルド単位の後始末

ギルドのデータを消す経路は2つあり（`/guild-settings reset-all` / Web API `POST /:guildId/reset-all`）、いずれも **`purgeGuildDataUsecase`**（`src/features/guild-settings/usecases/purgeGuildDataUsecase.ts`）に集約されています。

`guildDelete`（Bot の退出・キック・BAN）は**データを消しません**。`stopGuildJobsUsecase` を呼んでインメモリのタイマー（チケット自動削除ジョブ・Bump リマインダー）を止め、削除予約（`guilds.scheduled_deletion_at`）を書きます。DB への書き込みはこの予約と、`cancelAllForGuild` が Bump リマインダーの予約行を `cancelled` にすることだけで、設定・チケットなどのデータには触れません（Bump の予約を DB でも取り消すので、猶予内に再導入しても退出前の予約は戻らない）。Bot を外しただけで不可逆に設定が消えるのは「再招待は破壊的操作ではない」という利用者の期待に反するため、2026-09-23（v3.1.3）に即時削除をやめました。

```
purgeGuildDataUsecase(deps, guildId)
  ├─ 0. Bump の予約パネルの片付けと予約の取り消し（cancelGuildBumpReminders：
  │      pending 行からパネルの場所を控える → cancelAllForGuild → パネル削除）
  ├─ 1. チケット自動削除ジョブの解除（jobScheduler.removeJob）
  ├─ 2. Bump リマインダーの解除（cancelAllForGuild。0 で取り消し済みなので通常は何もしない）
  └─ 3. DB 一括削除（deleteAllSettings）
```

> **順序に意味があります。** DB 行を先に消すとインメモリタイマーが生き残って投稿が実行され、その後の `updateStatus` が P2025 で失敗してログが荒れます。**タイマー解除 → DB 削除**の順を必ず守ってください。Bump の予約パネルの場所も pending 行からしか引けないため、手順0も DB 削除より前に行います（後ろへ動かすと、reset-all の後に「リマインドが通知されます」のパネルがチャンネルに残ります）。

`GuildSettingsService` は cross-feature 依存を持たない設計のため、この usecase は依存を引数で受け取り、呼び出し側が composition root のゲッターから解決します。ただし手順0の `cancelGuildBumpReminders` は無効化・リセットと共用の関数で、中で composition root のゲッター（`getBotBumpReminderManager`・`getBotBumpReminderRepository`）を直接引きます（`deps.bumpReminderManager` は使わない）。呼び出し側は、パネルの削除に使う `client` を `deps` に入れて渡します。

---

## エラーハンドリング設計

### カスタムエラークラス一覧

`BaseError` 階層は `@ayasono/shared/core` から提供されます（全 ayasono アプリ共通）。すべて `BaseError` を継承しています。

| クラス               | statusCode | 用途                     |
| -------------------- | ---------- | ------------------------ |
| `ValidationError`    | 400        | 入力値バリデーション失敗 |
| `PermissionError`    | 403        | 権限不足                 |
| `NotFoundError`      | 404        | リソースが見つからない   |
| `TimeoutError`       | 408        | タイムアウト             |
| `RateLimitError`     | 429        | レート制限               |
| `ConfigurationError` | 500        | 設定ミス（環境変数等）   |
| `DatabaseError`      | 500        | DB 操作失敗              |
| `DiscordApiError`    | 500        | Discord API エラー       |

### `isOperational` フラグ

`BaseError` は `isOperational: boolean` を持ちます。

| 値                  | 意味                                       | ログレベル |
| ------------------- | ------------------------------------------ | ---------- |
| `true` (デフォルト) | 想定済みの運用エラー（ユーザー操作ミス等） | `warn`     |
| `false`             | プログラミングエラー・バグ                 | `error`    |

`isOperational: false` のエラーはバグの可能性があるため、本番環境ではユーザーに詳細を返しません。

### グローバルエラーハンドラ

`setupGlobalErrorHandlers()` を起動時に呼び出すと、以下がキャッチされます。

```
process.on('unhandledRejection') → ログ出力
process.on('uncaughtException')  → ログ出力 + process.exit(1)
process.on('warning')            → ログ出力
```

`setupGracefulShutdown()` で `SIGTERM` / `SIGINT` 時に Prisma 切断 + Botログアウトを行います。

---

## BUMP_REMINDER_TEST_MODE フラグ

`BUMP_REMINDER_TEST_MODE=true` を設定すると、Bump リマインダーの待機時間が **120分 → 1分** に短縮されます。
本番環境での動作確認や E2E テストに使用します。

```bash
# .env
BUMP_REMINDER_TEST_MODE=true
```

```typescript
// src/features/bump-reminder/constants/bumpReminderConstants.ts
const REMINDER_DELAY_MINUTES = 120;
const TEST_MODE_REMINDER_DELAY_MINUTES = 1;

export function getReminderDelayMinutes(): number {
  return env.BUMP_REMINDER_TEST_MODE
    ? TEST_MODE_REMINDER_DELAY_MINUTES
    : REMINDER_DELAY_MINUTES;
}
```

> **注意**: `BUMP_REMINDER_TEST_MODE=true` は本番環境では使用しないでください。

---

## 関連ドキュメント

- [DEPLOYMENT.md](DEPLOYMENT.md) - Coolify デプロイフロー
- [I18N_GUIDE.md](I18N_GUIDE.md) - 多言語対応
- [TESTING_GUIDELINES.md](TESTING_GUIDELINES.md) - テスト方針
- [PROJECT_ARCHITECTURE.md](../../../infra/docs/PROJECT_ARCHITECTURE.md) - プロジェクト全体構成・認証/CORS 横断方針
- [web/docs/DEPLOYMENT.md](../../../web/docs/DEPLOYMENT.md) - ダッシュボード本番デプロイ手順・知見

