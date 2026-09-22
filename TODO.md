# saika - TODO

> タスク管理・進捗状況・残件リスト。web ダッシュボード・インフラ（VPS / Cloudflare / Coolify）は別リポジトリで管理。

最終更新: 2026年9月23日

**分類の基準**: 着手できるかどうかだけで分ける。①いま着手できる → ②完了待ち → ③未決（判断が要る）。**「いま着手できる」の並び順が実行順を兼ねる。** 実害の有無・依存関係・何を待っているかは各タスクの本文に書く。

---

## 進め方

2026-09-05 決定・2026-09-18 に順序の原則を機能単位へ改めた。目標は**メンテナンスが要らない状態にすること**。効くのは機能を減らすことで、掃除とリファクタは維持コストを下げるがゼロにはしない。

```
機能ごとに: 残すか決める → 削除 or（掃除 → リファクタ・改善）
全体:       決めた作業を「いま着手できる」の順に1件ずつ → 最後にマニュアル全面修正
```

**守る順序は機能単位。** 消す予定の機能を掃除・改善するのは丸ごと無駄なので、着手前に「その機能を残すか」が決まっているか必ず確認する。残す機能の中では掃除を改善より先にやる（同じファイルを二度開かない）。

**機能をまたぐ順序は 2026-09-23 に次の原則へ改めた。「いま着手できる」はこの並びになっている。**

```
パッケージ更新 → バグ改修 → 既存機能改修 → 新機能実装
```

**現状問題になっている部分から解決し、そのうえで新機能も落とさず実装する。** パッケージ更新が先頭なのは、prisma 系の更新が `docker build` ＋ `docker run` の実機検証を要するため、スキーマに触る作業と同時期に走らせると**問題が出たときに切り分けられなくなる**から。この区分自体は見出しにせず、並び順だけで表す（区分の見出しを作ると、どちらに入るか曖昧なタスクで分類に悩むため）。

**マニュアル（`docs/guides/USER_MANUAL.md`）は最後にまとめて1回。** 削除で全体の約30%が落ち（内訳は「マニュアル全面修正」）、掃除と改善でも仕様が変わるため、途中で直すと二度手間になる。削除する3機能は他鯖で使われていないので、その間マニュアルが実態と食い違っても実害はない。

**機能の要否は本番 DB の実測で判断し、2026-09-05 に削除対象を確定した。**「他 Bot にも同じ機能がある」「Discord 標準で代替できる」は削除の根拠にしない。彩加はオールインワンが看板で、代替可能性を根拠にすると製品コンセプトの否定になる。削除の根拠は①誰も使っていない②saika 内部で重複している③維持コストが機能価値に対して極端に高い、の3つだけ。2026-09-09 に VAC を削除対象へ追加したが 2026-09-17 に撤回（→ HISTORY.md「決定事項」）。

**残す機能**: guild-settings / afk / vac / vc-auto-recruit / member-log / unverified-kick / ticket / sticky-message / reaction-role / bump-reminder / ping / message-delete / about / help

---

## 残タスク サマリー

| 区分 | 残件 |
| --- | ---: |
| いま着手できる | 12 |
| 完了待ち | 6 |
| 未決（判断が要る） | 2 |
| **合計** | **20** |

> **着手順は「いま着手できる」の並び順そのもの**（1件＝1 PR）。番号付きの「次にやること」は 2026-09-20 に廃止。1件動くたびに本体・サマリー・リストの3箇所を直すことになり、番号も挿入のたびにずれるため。
>
> **v3.1.1 のリリースと告知は 2026-09-20 に完了**（→ HISTORY.md）。サポートサーバーへ1本出し、Ikoitter へは購読で流した。次のリリースの告知も同じ形（管理者向け詳細をサポートサーバー、利用者向けの短い版を自鯖）で出す。
>
> **2026-09-23 に未決を9件から2件へ減らした**（→ HISTORY.md）。残るのは「メッセージ出力機能の設計」と「変更履歴を作るか」の2件で、どちらも新機能の番が来るまで止めておける。決着に伴い、`deleteAllSettings` のレジストリ化（親テーブルで不要）とドキュメント整理（役割が HISTORY.md へ移行）を取り下げ、パッケージ更新・bump ポーリング化・メンバーログの join/leave 分離が着手可能になった。

---

## いま着手できる

依存なし。上から順に1件ずつ着手する（1件＝1 PR）。並び順が実行順を兼ねるので、順番を変えたいときはこのセクション内で移動する。

### パッケージ更新 【保守・中】

**依存なし。2026-09-23 に「スキーマ整備より先にやる」と決めて先頭へ移した。** 2026-09-20 に棚卸し。

**スキーマ整備より先にやる理由**: prisma 系は Dockerfile 内で `prisma generate` が走るため `docker build` ＋ `docker run` の実機検証が要る。13テーブルに FK を張る PR と同時期に走らせると、問題が出たときに**どちらが原因か切り分けられない**。依存を先に最新化して本番で安定を確認してから、スキーマに触る。

**「掃除の完了待ち」だった理由は解消済み。** vitest 5 を待っていたのは「3機能の削除も coverage 閾値を動かすので調整が2回発生する」ためだったが、**その3機能の削除は 2026-09-20 に完了している**（→ HISTORY.md）。typescript 7 は「急ぐ理由が無い」だけでブロックではない。

- [ ] **vitest 4 → 5 ＋ @vitest/coverage-istanbul 4 → 5**（必ず同時）。vitest 5 は coverage の include/exclude をプロジェクトルート相対の厳密マッチに変える。`vitest.config.ts` の `src/bot/features/**` 系は該当ディレクトリが無く既に死んでいるので、厳密マッチ化で分母が動く。**閾値の再調整はこの PR で1回だけ済む**
- [ ] **typescript 6 → 7**。TS 7 が削除した `baseUrl` / `target:es5` / `moduleResolution:node10` はどれも未使用、`erasableSyntaxOnly` と `isolatedDeclarations` は「TS 7 対応」として有効化済み。残るコストは新規に出る型エラーの修正だけ
- [ ] ランタイムの minor / patch を1 PR（fastify / prisma 3点は必ず同時 / discord.js / pg / jose / i18next / zod / node-cron / @fastify/cookie / @fastify/cors）。discord.js 14.27.0 は undici の厳密固定を緩め `pnpm audit` のノイズが減る。prisma 系は Dockerfile 内で `prisma generate` が走るので `docker build` ＋ `docker run` の実機検証が要る
- [ ] dev 依存を1 PR（biome / commitlint 2点 / lint-staged / tsx / @types/pg）。Dockerfile の runner が `--prod` で落とすので本番イメージは1バイトも変わらない。biome は `biome.json` が `"recommended": false` で有効ルールを明示列挙しており、パッチ更新で新ルールが既存コードに発火しない
- [ ] **`@types/node` を 25 系から 24 系（24.13.6）へ引き下げる。** Node 25 は 2026-06-01 に EOL、実行環境は Node 24 LTS（`node:24-slim` / `engines >=24`）で、型定義だけ死んだ系列を指している。26 に上げると逆に Node 24 に無い API の型が通る
- [ ] dotenv 17 → 18（単独 PR）。削除されたのは `node -r` プリロードと .env.vault で、使っている `"dotenv/config"` サブパスは v18 にも残る。使用箇所は `env.ts` と `prisma.config.ts` の2ファイル。major かつランタイムなので他と混ぜない。**着手前に CHANGELOG を1度確認する**（未検証）

**期日が外部で決まるもの**（この2件だけは着手できない）

- [ ] **Node 24 → 26**。26 の LTS 入りは **2026-10-28** で、それまで上げない。`.node-version`（CI 2ワークフローと mise が参照）・Dockerfile の2箇所・`engines`・`@types/node` を1 PR にまとめ、`docker build` ＋ `docker run` でフル起動まで確認する
- [ ] **prisma 8**。最新は `8.0.0-rc.15` で RC。本番稼働中の Bot に RC は入れない。GA は2026年10月予定。`prisma` / `@prisma/client` / `@prisma/adapter-pg` を必ず3点同時に

> **Coolify のビルドは1本ずつ。** develop に複数 PR を積んでも、main へのリリースは1回にまとめる。
> **`@fastify/rate-limit` は 2026-09-20 に 11.2.0 へ上げ済み**（→ HISTORY.md「Web API のレート制限すり抜けの恒久対応」）。このタスクの対象外。

### `/bump-reminder-settings disable` が予約をキャンセルできていない 【実装・小・バグ】

**依存なし。最小。** 2026-08-20 の棚卸しで発見（既存の記載なし）。

> **要件は「disable したら予約が消えること」**であって、`cancelAllForGuild` に差し替えることではない。実装手段はポーリング化の前後で変わるが、要件は変わらない（下記 ⚠️）。

`handleBumpReminderSettingsDisable`（`src/features/bump-reminder/commands/bumpReminderSettingsCommand.disable.ts:29`）が `cancelReminder(guildId)` を呼んでいるが、実リマインダーは常に複合キー `"guildId:serviceName"` で登録される（`scheduleBumpReminder` は `serviceName` を必須引数で受け取る）。`toBumpReminderKey(guildId, undefined)` は素の `guildId` を返すため**完全一致照合が1件もヒットせず、タイマーが解除されない**。`f79d703` で reset 系3経路（reset-all / guildDelete / Web API）は `cancelAllForGuild` に差し替えたが、**disable だけ取り残されている。** 「ギルド単位の後始末では必ず本メソッドを使うこと」と明記した `cancelAllForGuild` の JSDoc に違反している唯一の呼び出し元。

**影響範囲**: 送信直前に `sendBumpReminder` が最新設定を再取得して `enabled=false` なら抑止するため、**無効化したまま誤送信されることはない**。実害が出るのは **disable → 予定時刻より前に enable し直した場合**で、解除されなかった旧タイマーがそのまま発火し、無効化前の bump に対するリマインダーが送られる。

- [ ] `cancelReminder(guildId)` → `cancelAllForGuild(guildId)` に差し替え（`cancelAllForGuild` はメモリ解除と DB の `status=cancelled` を両方やるので、これ1本で足りる）
- [ ] 回帰テストは **「disable 後にそのギルドの pending が残っていないこと」** を見る（メモリ上の Map を直接覗かない。ポーリング化で Map ごと消えてもテストが生き残る形にする）

> ⚠️ **ポーリング化しても自動的には消えないバグ。** 消えるのは*メカニズム*（複合キー照合のすれ違い）だけ。ポーリング後は「`status=pending` かつ `scheduledAt <= now`」で拾う形になるため、**disable が pending 行を cancelled にしなければ、disable → 予定時刻前に enable で同じ症状が再現する。** その DB 側キャンセルこそ `bumpReminderRepository.cancelByGuild()` で、ポーリング化タスクで「デッドコードだから消す」候補に入っているもの。**消すと決める前に、この経路の受け皿になるかを必ず確認すること。**

### Embed デフォルト値の日本語ベタ書き 【実装・小・i18n 違反】

**依存なし。最小。** 2026-09-23 にスキーマ棚卸しで発見。

`prisma/schema.prisma` の DB デフォルト値に日本語が直接書かれており、**en 設定のギルドにも日本語が入る**。実装ガイドラインの「生文字列のハードコード禁止・すべて i18n 経由」違反。

| テーブル | 列 | 現在の既定値 |
| --- | --- | --- |
| `guild_ticket_settings` | `panel_title` | `"サポート"` |
| `guild_ticket_settings` | `panel_description` | `"サポートが必要な場合は下のボタンからチケットを作成してください。"` |
| `guild_reaction_role_panels` | `title` | `"ロール選択"` |
| `guild_reaction_role_panels` | `description` | `"ボタンを押してロールを取得・解除できます。"` |

- [ ] DB デフォルトを外し、未設定時はアプリ層で i18n から入れる形にする（**既存行の値は保持する**）
- [ ] ja/en ロケールキー・テスト

> **スキーマ整備の PR には混ぜない。** あちらは「挙動を変えない」ことが価値なので、文言が変わる変更を同じ PR に入れると切り分けられなくなる。

### 未承認キックのログチャンネル必須化 【実装・中】

**依存なし。着手前提だった本番 DB の実測は 2026-09-23 に完了。** 2026-09-18 決定。DM 通知トグル化と「メンバーログ: Bot の除外 ＋ 彩加によるキックの退出ログ抑止」の前提。

**現状はサイレントキックが成立する。** `enable` は認証ロールと Bot の `KickMembers` しか見ないため（`unverifiedKickSettingsCommand.simple.ts:289-311`）`logChannelId` 未設定でも有効化でき、日次実行は「チャンネルが不正なら当該通知のみスキップ・キックは継続」の設計（`unverifiedKickRunner.ts:509`）。ログチャンネルが無いギルドではキックまとめがどこにも出ず、メンバーログが有効でも「退出」としか見えない。

**通知チャンネルは任意のまま。** 予告 DM は通知チャンネルと無関係に必ず送る設計で（`unverifiedKickRunner.ts:577-579`）メンバー側のベースラインは既にあり、「DM だけでいい」サーバーの選択も残す。ただし「DM 通知トグル化」で DM を切れるようにする時点で通知チャンネルも必須にする（DM-only 禁止の原則はあちら）。

**やること**（既存の実行時無効化 `disableAndNotify` → `disableInvalid` を流用するので小さい）

- [x] ~~**本番 DB で「enabled かつ `logChannelId` が null」の件数を実測する。**~~ → **2026-09-23 実測: 0件**。設定レコード自体が1件のみで、ログ・通知チャンネルとも設定済み。**誰にも見えない変更として入れられる**（リリースノートの記載も不要）。`notifyChannelId` が null の有効ギルドも0件なので、後続の「DM 通知トグル化」で通知チャンネルを必須にするときも無風
- [ ] `enable` 時に `logChannelId` 未設定なら ValidationError（認証ロール未設定と同じ扱い）
- [ ] 日次実行時にログチャンネルが解決できなければ、認証ロール消失などと同じ `disableAndNotify` で無効化する。既存ギルドは次回実行で自動的にこの経路に乗るので migration も `disabledReason` の永続化も要らない
- [ ] **無効化通知のフォールバック。** `disableAndNotify` は今ログチャンネルにしか送らず（`unverifiedKickRunner.ts:416-417`）、無い時は黙って止まる。guild-settings のエラーチャンネル（`notifyWarnChannel`）→ システムチャンネルの順で落とす。既存の「認証ロール消失で無効化」にも同じ穴があるので一緒に塞がる
- [ ] `clear-log-channel` は有効中なら拒否して「先に disable」と返す
- [ ] web の PATCH で `enabled=true` の検証を揃える。**`logChannelId` と `verifiedRoleId` の両方を必須にする**（2026-09-23 決定）。現状 `unverifiedKickResource.ts` の `patch` は**検証ゼロ**で、ダッシュボードから素通しで有効化できる。Bot の権限チェックは API 側では行わない
- [ ] ja/en ロケール・テスト

> **取り下げたもの（2026-09-18）**: 非アクティブキックとの対称化（片側が消える）／`notifyChannelId` / `logChannelId` の分離（未承認側は分離済み）／`disabledReason` 列の追加（既存の無効化通知と `view` の enabled 表示で足りる）／`set-notify-channel` リネーム（非アクティブ側の話だった）。旧設計は Notion「Saika バグ修正〜キック機能整理〜マニュアル修正 実行計画（2026-07-29 アーカイブ）」。

### 退出時データの遅延削除 ＋ スキーマ整備 【実装・大】

**依存なし。設計は 2026-09-23 に全部確定した**（根拠と実測値は → HISTORY.md「退出時データの遅延削除を採用する」）。**これを最優先にしたのは、`guildDelete` が即削除で、外す前のバックアップ手段である export が壊れているため。**

`guildDelete` 時に即削除せず**30日後**に削除する。「Bot の再招待は破壊的操作ではない」というユーザーの期待に実装を合わせる。合わせて、削除漏れが構造的に起きないスキーマへ直す。

**本番実測（2026-09-23）**: データを持つギルド6件 ／ うち `guild_settings` 行が無いのは**4件**（export はこの4件で失敗する）／ 孤児4件 ／ 全テーブル1〜7行（`bump_reminders` のみ570行）。

**この順に上から実装する（1つ = 1 PR）**

**スキーマ整備**（挙動は変わらない）

- [ ] `guilds` テーブルを新設（`guild_id` PK ／ `scheduled_deletion_at` ／ 導入日時）
- [ ] 既存13テーブルに `guild Guild @relation(...)` を1行ずつ追加し、FK を張る（`onDelete: Cascade`）
- [ ] **列名のスネークケース統一（11列）**。`guild_settings`（`guildId` / `createdAt` / `updatedAt`）と `bump_reminders`（`guildId` / `channelId` / `messageId` / `panelMessageId` / `serviceName` / `scheduledAt` / `createdAt` / `updatedAt`）に `@map` を足す。**Prisma のフィールド名は変えないのでアプリコードは1行も変わらない**
- [ ] マイグレーション: `guilds` 作成 → 既存6ギルドをバックフィル → FK 追加 → 列名リネーム11本。**`guild_settings.id` は Prisma 側で cuid を生成する設計で DB デフォルトが無い**点に注意
- [ ] **`guildCreate` で親行を作る。** `handleGuildCreate` は現在 `void` を返す同期関数なので async 化が要る。**これを入れないと、FK 導入後に追加されたギルドで全機能が FK 違反で落ちる**
- [ ] **起動時に親行が無いギルドを補完する**（Bot が落ちている間に追加されたケース）
- [ ] テスト

> **これは挙動を変えないので単独で本番に出せる。** FK 導入の見落としで設定の書き込みが落ちるのが最悪シナリオなので、削除ロジックの変更と同時に出さず、切り分けられる形にする。

**遅延削除の本体**

- [ ] `guildDelete` を「即削除」から「`scheduled_deletion_at` に30日後を書く」へ変更
- [ ] **ジョブは即停止する。** 猶予中 Bot はそのギルドに居ないので、ジョブが生きているとエラーログを吐き続ける。**データの削除だけを遅らせ、実行中ジョブの停止は遅らせない**
- [ ] `guildCreate` で予約をクリアする（再導入で復活）。クリアしないと、生きている設定が期限後に消える
- [ ] 猶予切れを拾う日次ジョブ ＋ 起動時スイープ（Bot 停止中に期限が来たケース）。削除は**親行を1つ消すだけ**
- [ ] `deleteAllSettings` を親行削除に置き換える。`purgeGuildDataUsecase` は reset-all 経路で**残る**（即時削除の経路は消えない）
- [ ] テスト

**導入時／再導入時 DM ＋ プライバシーポリシー**

- [ ] env に `PRIVACY_POLICY_URL` / `SUPPORT_SERVER_URL` を追加（既存3 URL と同じく optional）。**公開ページが未作成のため、プライバシーポリシーはユーザーマニュアルと同じく GitHub のファイル URL を指す**
- [ ] **導入時 DM** — お礼／`/help`・マニュアル・ダッシュボードの導線／**30日保持の告知**／プライバシーポリシー／サポートサーバー。役割は告知した事実を作ることなので**凝りすぎないこと**
- [ ] **再導入時 DM** — 「設定は残っています」＋**実際の削除予定日時**。**価値の重心はここ**
- [ ] **ロケールは `guild.preferredLocale` で選ぶ。** 導入直後はそのギルドのロケール設定が存在せず、`tGuild` だと英語圏サーバーにも日本語 DM が飛ぶ
- [ ] 送信先は **DM のみ・チャンネルには送らない**（`systemChannel` が null のサーバーで当てずっぽうのチャンネルに長文が出るため）。宛先解決はその場で行い **userId を永続化しない**
- [ ] DM 送信失敗（オーナーが DM を閉じている = 50007）は**ログのみで握りつぶす**。導入処理自体は成功扱い
- [ ] プライバシーポリシーに保持期間30日を明記
- [ ] ja/en ロケール・テスト

> **DM の宛先は `guild.ownerId` で確定。** `INVITE_PERMISSIONS`（`src/api/routes/bot.ts:29`）に `ViewAuditLog` が**無い**ことを 2026-08-19 に確認済みで、監査ログの BOT_ADD から導入者は特定できない。最小権限方針を維持する以上オーナー宛が整合する。
>
> **退出時 DM は送らない**（→ HISTORY.md「取り下げ済み」）。`guildDelete` 時点で共通サーバーが無く 50007 になるため、告知は導入時に前倒しする。

この3つが終わってから「export / import の削除」へ進む。

### タイマー / スケジューラ実装の整理 【実装・小〜中・リファクタ】

**依存なし。** 2026-08-20 に棚卸し。**2026-09-23 に「動作を変えない構造の作り直しはこれだけやる」と確定した** — `messageDeleteService.ts` 589行の分割・`/vc` 削除後の共通ヘルパー588行を `/afk` へ畳む件・`vcAutoRecruitSettingsService.updatePartial` の lost update 対策は**いずれも見送り**。判断軸は「将来触る必要が出るか」で、今後いじらないコードは汚くても維持コストを生まない。タイマーだけは3通りの書き方が散っており**次に何か直すとき必ず引っかかる**ため残した。

時間で動くコードが `jobScheduler` と生 `setTimeout` に散り、同じ「キー付きタイマー」を3通りの書き方で持っている。

| 用途 | 実装 | 場所 |
| --- | --- | --- |
| 定期スイープ（cron） | `jobScheduler.addJob` | 未承認キックの毎時スイープ |
| 予約実行（起動時復元あり） | `addOneTimeJob` のみ | チケット自動削除（`ticketAutoDeleteService.ts`） |
| 予約実行（起動時復元あり） | `addOneTimeJob` ＋ **独自 Map** | bump-reminder（`bumpReminderScheduleHelper.ts`） |
| デバウンス | 生 `setTimeout` ＋ module-level Map | スティッキー再送（`stickyMessageResendService.ts`） |
| TTL 付きエントリ | 生 `setTimeout` ＋ 二重 Map | `cooldownManager.ts` / `shared/utils/ttlMap.ts` |
| UI タイムアウト | 共通関数（13箇所で使用） | `bot/shared/disableComponentsAfterTimeout.ts` |
| フェーズ中断 | `setTimeout` ＋ `AbortController` | message-delete（性質が違うので対象外） |

**やること**

- [x] ~~**vc-recruit の手書き無効化2箇所を `disableComponentsAfterTimeout` に寄せる。**~~ → **VC募集機能の削除で消滅**（2026-09-20 削除完了）。共通関数の引数型を `ButtonInteraction` / `StringSelectMenuInteraction` へ広げる話も、手書き箇所が無くなったため不要
- [ ] **`jobScheduler.stopAll()` を graceful shutdown に接続する。** 定義とテストだけで本番から呼ばれていない（`main.ts` の shutdown は `apiServer.close()` → `client.shutdown()` → `prisma.$disconnect()` のみ）。全ジョブが `unref()` 済みなのでプロセス終了は妨げないが、**シャットダウン中にジョブが発火しうる**
- [ ] **スティッキー再送のデバウンスを `jobScheduler.addOneTimeJob` へ寄せる。** 同 ID を `replaceExistingJob` で置き換えるのでデバウンスそのものになる。**warn 抑止オプション（`{ quiet: true }`）は 2026-09-20 に実装済み**なので、そのまま寄せられる

**判断が要るもの**

- **bump-reminder の独自 Map 廃止はポーリング化に含める**（→「bump-reminder のポーリング化」）。Map が持つのは `jobId` と `reminderId` だけで、`jobId` は `toBumpReminderJobId(guildId, serviceName)` で決定的に再計算でき、`reminderId` は DB から引ける。**チケット自動削除は実際にこの形（決定的 jobId のみ・Map なし）で成立している。** 先に ticket 方式へ寄せることもできるが、二重作業を避けるためポーリング化の一部として扱う
- **`cooldownManager` と `TtlMap` の統合は見送り寄り。** どちらも「キー付き TTL エントリ」だが、`cooldownManager` は `commandName × userId` の二段 Map ＋ `expiresAt` 一致チェック（古いタイマーによる誤削除防止）を持ち、`TtlMap` に押し込むと機能が落ちる。やるなら `TtlMap` 側の拡張になるので**別タスク**

### bump-reminder のポーリング化 【実装】

**依存なし。止まっていた上限値は 2026-09-23 に「予定時刻から2時間」で確定した。**

動機はバグ修正ではなく**構造の単純化とメンテナンス性**。復元まわりは調査の結果ちゃんと作られており、本来の目的は「キャンセルが2つある」構造上の問題の解消。

**やること**: ①一定間隔で回るジョブを1本立てる ②`now - 2時間 < scheduledAt <= now` かつ `status=pending` を拾う ③送信する ④status を sent にする

**上限を2時間にした理由**: bump のクールタイムが2時間なので、**予定時刻から2時間過ぎた時点で次のクールタイムに入っている可能性がある**（新しい bump と新しい予約が入っているはず）。古い pending を掘り起こして送る事故を防ぐのが目的で、UX のためではない。

> ⚠️ **上限を過ぎた pending は「送らない」だけでなく `status` を必ず更新する**（`expired` 等）。`pending` のまま残すと毎回のポーリングで拾い続ける。

**消えるもの**: メモリ上の `Map<string, ScheduledReminderRef>` / `restorePendingReminders` / `cancelScheduledReminder` / `cancelReminder` と `cancelByGuild` の使い分け

> **独自 Map の廃止は「タイマー / スケジューラ実装の整理」から切り出してここに寄せた。** bump-reminder だけが `jobScheduler` に独自 Map を重ねており、チケット自動削除は決定的 jobId のみで同じことを実現できている。ポーリング化を採らない判断になっても**ticket 方式へ寄せるだけで Map は消せる**（その場合は整理タスク側へ戻す）。
>
> **`findAllPending()` の絞り込み**（起動時復元を参加中ギルドのみに限定するか）は、`restorePendingReminders` ごと消えるため**論点が消滅する**。2026-09-23 に未決から落とした。

**移行時に落としてはいけないもの**

- 期限切れの即時実行 → クエリ条件が等価になる。楽
- **重複の正規化**（同一 guild+service の pending を最新1件に）→ 現在はメモリ上の Map が担保。**DB側で担保し直すのが最大の移行ポイント**（`serviceName` が nullable な点に注意）
- **送信失敗時の status 更新 → 新方式で新たに必要。**更新しないと永久に拾い続ける
- **disable / reset で予約をキャンセルすること** → メモリ解除が無くなる分、DB 側で `pending` → `cancelled` にしないと「無効化 → 予定時刻前に再有効化」で古い予約が発火する。「`/bump-reminder-settings disable` が予約をキャンセルできていない」を参照

**既にある資産**: schema の `@@index([status, scheduledAt])`（確認済み）、`jobScheduler`

**同時に棚卸しするデッドコード**（2026-08-19 確認）

- `bumpReminderRepository.cancelByGuild()` — 本番コードからの呼び出し**ゼロ**。`BumpReminderManager.cancelAllForGuild` は Manager 側の別物で、これを置き換えてはいない。⚠️ **ただし上記の「DB 側で pending を cancelled にする」受け皿がこのメソッドそのもの。消す前に要否を判断すること**
- `bumpReminderRepository.cancelByGuildAndChannel()` — **同じく呼び出しゼロ**
- 追従漏れバグ修正で新設した `cancelAllForGuild` もポーリング化で不要になりうる

### bump クールタイムを env に外出しし、サービスごとに分ける 【実装・小】

**依存なし。最小。隙間で潰せる。**

- 現状 `getReminderDelayMinutes()`（`bumpReminderConstants.ts:91`）は `env.BUMP_REMINDER_TEST_MODE ? 1 : 120` で**120分がハードコード**、かつサービス名を引数に取らないため Disboard / Dissoku 共通
- **env が持つのはクールタイムの分数だけ。サービスごとに独立して持つ**（Bot ID・コマンド名などはコード側の定数のまま）
- 予約時に絶対時刻を確定させる現在の形（`toScheduledAt`）は**維持する** → 設定値を変えても既存の予約は繰り上がらない
- env 名の付け方は実装時に決めてよい

### メンバーログの join/leave 出力先分離 【機能改善】

**依存なし。分離方式は 2026-09-23 に「それぞれ別に設定でき、既存ギルドには今のチャンネルを両方へ入れておく」で確定した**（旧案 A）。

現状 `GuildMemberLogSettings` は `channelId` 1本（`prisma/schema.prisma:77-85`）で、参加ログ（`guildMemberAddHandler.ts:31,37`）と退出ログ（`guildMemberRemoveHandler.ts:37,43`）が同じチャンネルへ出る。「参加は歓迎チャンネル・退出は管理ログ」のような分け方ができない。

**作業範囲**

- [ ] DB マイグレーション: `joinChannelId` / `leaveChannelId` を追加し、**既存 `channelId` の値を両方へバックフィル**してから `channelId` を廃止する。entities / defaults / `memberLogSettingsRepository.ts` も追従
- [ ] `memberLogSettingsService` のセッターを join / leave の2本にする（現状は `setChannelId` 1本・`resetChannel` 相当の `updatePartial(guildId, { channelId: undefined, enabled: false })` も要追従）
- [ ] コマンド: `set-channel` を join / leave 用の2サブコマンドへ置き換える。`enable` の必須チェック（`memberLogSettingsCommand.enable.ts:36`）と `view` の表示（`memberLogSettingsCommand.view.ts:81`）も追従
- [ ] ja/en ロケール
- [ ] shared の `MemberLogSettings`（`shared/src/api/types.ts:109`）を拡張して publish → saika / web の `#v1.3.0` 参照を更新
- [ ] web ダッシュボード `MemberLogPage.tsx` のチャンネル選択を追従
- [ ] USER_MANUAL.md

> キック機能の `notifyChannelId` / `logChannelId` と**同じ形にする必然性はない**。あちらは「宛先が違う2種類の通知」の分離、こちらは「同じ用途のイベント別出力先」で性質が異なる。

### `resetAll` の確認強化 【実装・小】

**依存なし。ただし遅延削除の完了後にやるほうが文面が確定する**（「即時削除である」ことを確認文に書けるため）。2026-09-23 に「`resetAll` は残す ＋ 確認を強化する」で確定。

`reset`（**`locale` と `errorChannelId` の2項目のみ**）と `reset-all`（全消し）の間が空白で、小さい目的のために過剰な手段を取らされる構造だが、**機能単位 reset の追加は見送り**、`resetAll` を残して確認を強くする方針にした。

- **遅延削除の採用で `resetAll` は即時削除の唯一の経路になる**（`guildDelete` からの即時削除が消えるため）
- **export/import 廃止で誤爆時の復旧手段が無くなる**ため、確認の強度が以前より重要になる

**やること**

- [ ] 確認ダイアログを強化する。**サーバー名の手入力**（GitHub のリポジトリ削除方式）を検討
- [ ] 日常設定コマンドからの隔離を検討する
- [ ] Web API の `POST /:guildId/reset-all`（3経路目）をどう扱うか決める。ダッシュボードからの削除に同じ強度の確認を付けるか
- [ ] ja/en ロケール・テスト

> **未確認**: `POST /:guildId/reset-all` にフロント側の確認ダイアログがあるか（web リポジトリ側）。

### VAC 作成 VC の募集ボタン（vc-auto-recruit の拡張） 【機能追加・小】

**依存なし。設計は確定済みで、あとは実装するだけ。** 2026-09-17 決定（→ HISTORY.md「決定事項」）。**2026-09-23 に「新機能より既存機能の改修を先にやる」方針でこの位置へ下げた。**

VAC が建てた VC は ID が毎回新しく allowlist に入らないので、vc-auto-recruit の自動投稿は発火しない。代わりに VC のチャット欄にボタンを置き、押した時だけ既存の募集投稿を1回叩く。募集終了は「追跡中の募集があれば enabled や allowlist に関係なく実行」（`vcAutoRecruitService.ts:219-240`）、channelDelete 同期・起動クリーンアップも既存なので、**投稿の発火以外は全部既存が面倒を見る**。

- [ ] `handleVacCreate` が VC を建てて移動させた直後、その VC のチャット欄にボタン付きメッセージを1つ送る。送れなければログだけ出して続行（VC 作成は成功扱い）。VC と一緒に消えるのでパネル管理は不要
- [ ] **ボタンを送るのは VC自動募集が `enabled` かつ投稿先チャンネル設定済みのギルドだけ**（2026-09-23 決定）。VAC しか使っていないサーバーに、押しても「投稿先が未設定」としか返せないボタンを出さないため。条件を満たさないギルドでは VAC の挙動は一切変わらない
- [ ] ボタン処理は vc-auto-recruit 側に置く。検査は2つだけ: **押した人がその VC に接続中か**（VC チャットは未接続でも見えるので必須）／**その VC の募集が `activeInvites` に無いか**（あれば ephemeral で「募集中」と返す）
- [ ] 通れば既存の投稿処理を「押した人＝`{userMention}`」で呼ぶ。`handleJoin` の投稿部分をメソッドに切り出して共用する。投稿先・文面・Embed・メンションは vc-auto-recruit の設定をそのまま使い、未設定なら ephemeral で「投稿先が未設定」
- [ ] customId は固定文字列。対象 VC は押された場所（`interaction.channelId`）から取る（customId に ID を埋めない運用ルール）
- [ ] ロケール ja/en（ボタンラベル・ephemeral 2種）・テスト

**やらない（必要になってから）**: 募集文のモーダル入力・別設定行・オーナー限定・募集専用クールダウン・mentionable 検査・roleDelete 追従・Bot の SendMessages を setup 時に検証。DB・shared・web は触らない。**常設 VC にボタンは出さない**（allowlist に登録すれば既存の自動投稿が動くため）。

> **「手動でメンションすれば足りる」という異論への回答**（2026-09-23・メンバーから出た意見）。既存の「VCに参加」は Link ボタン（`vcAutoRecruitMessageBuilder.ts:96-109`）なので、参加導線としては手動の `<#VC>` と等価。手動で再現できないのは①設定済みの文面・メンション・Embed が毎回そのまま出ること ②**VC が消えたときに募集が「募集終了」へ自動で差し替わること**（`closeInvite`）の2点。VAC の VC は使い捨てで必ず消えるため、手動だと終わった募集が残り続ける。この2点に価値を認めて実装する判断をした。1人用に立てた VC にボタンが出る点は、メッセージが VC と一緒に消えるので実害なしと判断。
>
> vc-auto-recruit の設定を流用してはいけない理由（プレースホルダの意味・ライフサイクル）は 09-09 の批評にあったが、流用した結果が既存の allowlist 投稿と同じ挙動になる以上、新しい問題を生まない。押す人が在室している前提なので「誰も入らなかった募集の死骸」も起きない。

### ダッシュボード 【UI層・web リポジトリ】

**索引のみ。詳細と実装範囲は [web/TODO.md](../web/TODO.md) 側**（web 単独で完結し saika のコアに影響しないため）。

- リアクションロール：ロール未設定で保存できる問題（バリデーション＋警告）
- カスタムメッセージのプレビュー機能
- プレースホルダーの説明表示
- 本文へのチャンネル挿入ボタン
- 共通 ChannelSelect コンポーネント

---

## 完了待ち

他タスクの完了・設計判断・外部条件のいずれかを待っているもの。**何を待っているかは各タスクの冒頭に書く。**

### export / import の削除 【実装】

**退出時データの遅延削除の完了待ち**（「いま着手できる」の先頭）。順序を逆にしないこと。

[決定事項](#exportimport-は廃止する2026-08-19-決定)に基づき削除する。**Bot コマンド専用で Web API からは使われていない**ため（2026-08-19 確認）、ダッシュボードには波及しない。

**削除対象**

- [ ] コマンド: `/guild-settings export` / `import`（`guildSettingsCommand.export.ts` / `.import.ts`）とサブコマンド定義・確認ダイアログの customId
- [ ] サービス層: `exportSettings` / `validateImportData` / `planImport` / `importSettings`
- [ ] リポジトリ層: `getFullSettings` / `importFullSettings` / `planImportMerge`（`repositories.ts:50-53` のインターフェース含む）
- [ ] 型: `GuildSettingsExportData` / `GuildSettingsExportSettings` / `FullGuildState` / `EXPORT_SCHEMA_VERSION`（`guildSettingsDefaults.ts` / `guildSettingsExportTypes.ts`）
- [ ] `serializers/guildStateSerializer.ts`（`guildSettingsAggregateRepository` からのみ参照。export 専用）
- [ ] locale キー ja/en（`import_guild_mismatch` / `import_unsupported_version` 等）
- [ ] 対応するテスト

**残すもの**: `serializers/guildSettingsSerializer.ts` は `guildSettingsCoreUsecases` から使われており export とは無関係。

**マニュアル**: 「設定をエクスポートする」「設定をインポートする」の削除と「⚠️ Bot をサーバーから除外する場合」の**遅延削除の説明への書き換え**は「マニュアル全面修正」でまとめて行う（ドキュメント修正で直した export 記述はここで消える）。

> **既知の未修正バグ（削除により解消）**: `getFullSettings` は `GuildSettings` 行が無いと即 `null` を返すため（`guildSettingsAggregateRepository.ts:84-85`）、`/guild-settings set-locale` も `set-error-channel` も未実行のギルドでは、他9機能が設定済みでも export が「設定がありません」で失敗する。**削除するため修正しない方針**だが、遅延削除までは「除外前に export 失敗 → 設定が無いと誤解 → そのまま Bot を外してデータ消失」の導線が残る。
>
> **2026-09-23 実測: データを持つ6ギルドのうち4ギルドが該当（67%）。** 想定より実害が大きかったため、遅延削除＋スキーマ整備を「いま着手できる」の上位へ引き上げた。**親テーブル導入で `guild_settings` 行が必ず存在するようになるので、この穴は export 削除を待たずに構造的に消える**（暫定修正は不要になった）。

### キック機能の DM 通知トグル化 【実装】

**未承認キックのログチャンネル必須化の完了待ち。** 指示書: Notion「Saika キック機能 DM通知トグル化 実装計画」

> ⚠️ **非アクティブ自動キックの削除（2026-09-20 完了）で作業量が半減した。** トグルは4本ではなく**未承認側の2本だけ**。未承認側は `sendWarnDms` が実装済みなのでトグルを被せるだけになる。**着手前に指示書の前提を読み直すこと**（指示書は両機能が残っている前提で書かれている）。

未承認キックに DM 通知の on/off トグルを追加する。事前通知のベースラインは**通知チャンネル（必須）**、DM は**到達率ブーストの上乗せオプション**。**DM-only 構成は許可しない**（DM は相手の設定次第で送信行為自体が成立せず、予告の基盤にできないため）。

> ⚠️ **着手前に前提を必ず確認すること。** 指示書は「`enabled=true` に `notifyChannelId` / `logChannelId` の両方必須」を前提としているが、必須化タスク（2026-09-18）で必須にするのは**ログチャンネルだけ**。通知チャンネルの必須化は**本タスクに含める**。**通知チャンネル必須のバリデーションが無いまま DM トグルを入れると、通知チャンネル未設定 + DM オフで「誰にも予告が届かないままキックされる」構成が作れてしまう。**

**この順に上から実装する**（1つ = 1 PR）

- [ ] **トグル2本の追加**（警告 DM / キック時 DM）。**デフォルトは現状の振る舞いを再現する値**にする（警告 DM のみ true、キック時 DM は false）。既定を変えると**アップデートした瞬間に既存サーバーで突然 DM が飛び始める**ため厳禁
- [ ] **DM 不達まとめログ**（logChannel へ日次集約 Embed）。現状 `catch(() => {})` で失敗を握りつぶしており**不達情報がコード上に存在しない**ため、収集する形に変えるところから
- [ ] **ja/en locale ・ マニュアル修正**

**落としてはいけない原則**

- **「送信試行 = 警告済み」**（DM の成否ではなく試行で警告済みを立てる）。**不達を検知できるようになっても変えないこと**（DM 拒否がキック回避策になる）
- 警告は**到達保証ではなくベストエフォート**。長い猶予期間が本来のセーフティネットで、警告は補助

> **export/import 削除との順序に注意。** 指示書は「エクスポートの3点セットを必ず更新」「バージョン互換を保て」と指示しているが、**export/import 削除が先に完了していればこの作業は丸ごと不要**。着手時点でどちらが済んでいるかを確認すること。

**詰め残しは 2026-09-23 に全部決着した**（未決から削除）

- **不達として扱うのは Discord API エラー 50007（DM 閉鎖）のみ。** 全送信失敗を含めると一時的な API エラーやレート制限まで「DM 拒否」として記録され、まとめログがノイズになる。50007 だけが「相手が DM を閉じている」という明確な状態で、管理者が取れる行動（別経路で伝える）に直結する
- **soft warning は入れない**（DM 有効かつ通知チャンネルが一般メンバー非公開の場合の警告）。通知チャンネルの公開範囲まで Bot が判断するのは踏み込みすぎで、誤検知したときに邪魔になる
- **不達0人のときはまとめログを出さない。** 毎日「不達0人」が出るとログチャンネルが埋まる。出すべきは異常時だけ
- 非アクティブ側 DM のテンプレートをどうするかは、非アクティブ自動キックの削除で `weekWarnMessage` / `finalWarnMessage` が消えたため**論点ごと消滅**

### メンバーログ: Bot の除外 ＋ 彩加によるキックの退出ログ抑止 【実装・小】

**未承認キックのログチャンネル必須化の完了待ち**（抑止を条件なしにするため）。Bot の除外だけなら依存は無いが、同じハンドラを触るので1 PR にまとめる。2026-09-17〜18 決定。

**Bot の除外（無条件・設定にしない）**

- [ ] `guildMemberAddHandler.ts` / `guildMemberRemoveHandler.ts` の冒頭で `member.user.bot` ならスキップ

> 今は Bot の参加・退出も全部出る。招待リンクは Bot が使わないので「不明」か同時に入った人間の招待を誤って拾い、アカウント年齢・滞在期間も Bot には無意味。Bot の追加・削除は管理者しかできず Discord の監査ログにも残る。トグルにすると DB 列・shared・web UI・サブコマンド・ロケールが要るので**2行のスキップで済ませる**。欲しいサーバーが出たら足す。他サーバーの挙動も変わるのでマニュアルとリリースノートに1行書く。

**彩加によるキックの退出ログ抑止**

- [ ] `bot/shared` に「彩加が今キックした人」を60秒ほど覚える `TtlMap`（キーは `guildId:userId`）を1つ置く
- [ ] 未承認キックの `processKicks` が `member.kick()` の直前に登録する（非アクティブキックは削除済みなので書き手はここだけ）
- [ ] メンバーログの退出ハンドラは載っていればスキップする
- [ ] テスト: 未承認キックで退出 Embed が出ない／通常退出では出る／60秒過ぎたら通常どおり

> 今は `member.kick()` のあと guildMemberRemove が来て、退出 Embed とキックまとめが両方出る。必須化でキックまとめが必ずログチャンネルに出るようになるので、退出 Embed 側を黙らせて1回にする。**必須化より先に入れる場合は「ログチャンネルが解決できた時だけ登録する」条件が要る**（無いと、ログチャンネル未設定のサーバーでキックがどこにも残らない）。

### メッセージ出力機能 【機能追加】

Bot 名義で任意のメッセージ（プレーンテキスト / embed）を指定チャンネルへ投稿する機能。**コマンドはモーダル入力、ダッシュボードからも投稿できるようにする。**

**既にある資産**

- Bot 側のモーダル入力は前例多数（`stickyMessageSet` / `reactionRoleSettingsSetup` / `vcAutoRecruitSettingsCommand.setMessage` 等）
- web 側は `components/embed/EmbedEditor.tsx` / `EmbedPreview.tsx` が sticky / tickets / reaction-roles の3ページで使用中。**embed 編集 UI は流用できる**

**未決**: 設計4件（→「未決（判断が要る）」）。決まるまで作業範囲を切れない。

### マニュアルの残り分の反映 【文書・中】

**未実装の機能の反映待ち。** **削除3機能と `/afk`・VC自動募集の反映は 2026-09-20 に完了**（→ HISTORY.md）。1741行 → 1226行になった。残っているのは、これから実装する機能ぶんだけ。

**やること**

- [ ] export / import のセクションを削除し「⚠️ Bot をサーバーから除外する場合」を**遅延削除の説明に書き換える**（→「export / import の削除」）
- [ ] 未承認キックのログチャンネル必須化を実施した場合はその差分（`enable` にログチャンネル必須・有効中の `clear-log-channel` 拒否・未設定時の自動無効化と通知先）。メンバーログの Bot 除外とキック時の退出ログ抑止も反映。**実装後のコードを実際に読んで確認してから書くこと**
- [ ] 「VAC 作成 VC の募集ボタン」を実装したら VC自動募集のセクションに追記する
- [ ] 冒頭の「最終更新」日付を更新

> **`/help` のコマンド一覧はコード側**なので各実装タスクで自動的に正しくなる。

### Bot 一般公開準備

- [ ] `/about` の充実（**LP 公開時に実施**）— 公式サイト（`OFFICIAL_URL`）に加え各種リンクを追加: ダッシュボード（`DASHBOARD_URL`）/ GitHub ソース（AGPL 公開リポ）/ ユーザーマニュアル（`USER_MANUAL_URL`）。LP 完成まで現状維持
- [ ] Discord Bot 認証申請（75 サーバー到達後）

> AGPL 化・`/about` 新設・help へのダッシュボードリンク・日本語ローカライズ復活は完了済み（HISTORY.md「完了済み」参照）。

---

## 未決（判断が要る）

着手前に方針を決める必要があるもの。**勝手に決めないこと。** ここが決まると「完了待ち」の該当タスクが動き出す。

### メッセージ出力機能の設計

**止まっているもの**: メッセージ出力機能（作業範囲を切れない）

- **機能拡張アイデアの「ユーザー embed 作成機能」との関係。** あちらは一般ユーザー向けで「投稿先チャンネルでのそのユーザーの送信権限で判定」という権限委譲設計が本体、こちらは管理者向けのお知らせ投稿。**別機能として並べるか1つに統合するかを先に決める**（統合するなら権限判定の設計はあちら側が一次情報源）
- 投稿後の**編集・再送**を持つか（持つなら投稿メッセージの所有権を DB に持つ）
- `@everyone` / role メンションの扱い（`allowedMentions` での抑止と、Mention Everyone 権限保持時のみ許可するか）
- ダッシュボードからの投稿を **OAuth ユーザーのギルド権限でどう判定するか**（現状の Web API は `guildId ∈ jwt.guilds` の粒度しか見ていない）

### 変更履歴を作るか

**止まっているもの**: なし（着手時期未定）

動機は「前どういう文面にしてたっけ？」で、**バックアップではなく変更履歴の需要**。有力案は `setting_change_log(guildId, feature, field, oldValue, newValue, changedBy, changedAt)` をリポジトリ層でフックし、対象を**文面フィールドだけに絞る**（7機能程度）。

> ⚠️ 「JSONで吐いて後から戻せるように」を足すと軽さの根拠が全部消えて **export/import に逆戻りする**。「見えるだけ」で不便ならUIで解決する（履歴をクリックで入力欄に流し込む。保存は従来通り管理者が押す）。
>
> **関連（2026-09-23 発見）**: 設定テーブル8つは `created_at` / `updated_at` を持たない（持っているのは `guild_settings` / `bump_reminders` / `sticky_messages` / `tickets` / `guild_reaction_role_panels` の5つだけ）。**「いつ変えたか」すら追えない**ので、変更履歴を作るならこの欠如をどう扱うかも一緒に決める。

---

## 機能拡張アイデア

- **`/ping` の ephemeral 化** — 現状は public 応答で、誰でも公開チャンネルに応答時間を出せる。実害が小さいため「実害か明確な需要があるものだけ足す」の基準では見送り。目障りになった時点で個別判断する（2026-09-23 に未決から移した）
- **Web API 認証の堅牢化（設定ミス耐性）** — 現状の多層防御は機能しており**実害なし**。設定ミス時の事故耐性を上げる2点: ①[jwt.ts](src/api/auth/jwt.ts) の `secretKey()` を fail-closed 化（本番相当環境で署名鍵が未設定なら起動アサーション任せにせず `secretKey()` 自体で throw）②同ファイルの `jwtVerify` でトークン寿命を強制し、検証側でも有効期限を担保する（`maxTokenAge` / `exp` 必須化）。背景・脅威モデルは公開 TODO に書かず別途管理
- **予約募集（イベント募集）機能** — **現状ほぼ実装予定なし。** 核だけ残す: 予約時に VC ＋ Discord Scheduled Event を作り、RSVP・リマインダー・開始通知は Discord 標準に任せる。旧骨子は `/vc rename` 流用と「setup は既存 VC 募集と同構成」を前提にしていたが、どちらも削除予定なので 2026-09-20 に破棄した。必要になった時点で詳細を一から詰める
- ~~**キック系ユーザーデータの削除対称性の整理（個別リセットの方針統一）**~~ — **非アクティブ自動キックの削除で論点ごと消える**（2026-09-05）。非対称の原因だった `MemberActivity` がテーブルごと無くなるため。残っていた非対称は「未承認キックの個別リセットが warn 記録を `deleteAllByGuild` で消すのに、非アクティブキックの個別リセットは `MemberActivity` を残す」点（`deleteAllSettings` への `guildUnverifiedKickWarn.deleteMany` 追加は 2026-08-19 に実施済み・HISTORY.md「完了済み」参照）。**エクスポートにユーザーデータを含めないのは現仕様維持で問題なし**（再有効化時の `enabledAt` フロアで安全・個人データ/サイズ観点でも除外が妥当）と確認済み
- **ユーザー embed 作成機能** — ユーザーが embed を作って bot 名義で投稿できる機能（Carl-bot 類似）。需要あり（お知らせ/ルール/ロールパネル説明）。**管理権限必須にはしない**方針で、①作成・プレビューは誰でも自由（ephemeral/DM）②投稿は「投稿先チャンネルでのそのユーザーの送信権限」で判定（bot＝ユーザーの代理・本来できる範囲を超えさせない）③`@everyone`/role メンションは Mention Everyone 権限保持時のみ許可（`allowedMentions` で抑止）④作成者 attribution ＋ 所有権（編集/削除は作成者＋管理者）⑤運営がロール許可をカスタム可能。Web ダッシュボードも OAuth ユーザーのギルド権限で同じ②判定が可能だが、管理設定エリアとは別の一般導線が要る。**詳細は後日決定**（コマンド版/Web 版どちらから着手するか・所有権の DB モデル等）
- 自動翻訳機能（DeepL API 等）
- 投票システム（グラフ化・レポート集計で Discord 標準との差別化）
- メトリクス収集 / アラート設定（運用規模拡大時）

---

## 未確認事項

タスクに紐づかないが、コードや実機を見れば分かるもの。

- `POST /:guildId/reset-all` にフロント側の確認ダイアログがあるか（web リポジトリ側）
- 変更履歴のフック対象となる各リポジトリの upsert 実装（member-log 以外は未確認）
- 遅延削除を入れたとき、Bot が居ないギルドの設定がダッシュボードでどう見えるか
- `vitest.config.ts` の `coverage.exclude` が旧パス（`src/bot/features/**`）を参照しており実質無効。コード側の修正が要る（2026-08-19 のドキュメント監査で発見・→「パッケージ更新」の vitest 5 で分母が動く）
- ja / en の翻訳キー突合を機械的に検証するテストが無い。ja だけ追加しても型・実行時とも検出されず、en 環境で日本語が出る（I18N_GUIDE に運用ルールとして明記済み・テスト化の余地あり）

---

## 記録

決定事項・取り下げ済み・完了済みは **[HISTORY.md](HISTORY.md)** に分離した（2026-09-20）。
タスクが完了したら、この TODO から該当セクションを HISTORY.md の「完了済み」へ移す。
