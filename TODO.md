# saika - TODO

> タスク管理・進捗状況・残件リスト

最終更新: 2026年8月19日

**優先度の基準**: ①本番のユーザーに実害が出ているか ②他のタスクをブロックしているか ③依存が無く単独で進められるか

> Phase 3〜6 の詳細な設計判断は Notion「Saika バグ修正〜キック機能整理〜マニュアル修正 実行計画（2026-07-29 アーカイブ）」に残っている。本ファイルで「Phase 3」等と書いた項目の中身はそちらを参照。
> web ダッシュボード・インフラ（VPS / Cloudflare / Coolify）は別リポジトリで管理。

---

## 残タスク サマリー

| セクション | 概要 | 残件 |
| --- | --- | ---: |
| 判断待ち | 案D猶予日数・Guild親テーブル・bump上限値 | 3 |
| リリース | Phase 1/2 を develop → main | 1 |
| 実装（依存なし） | Phase 3・bump クールタイム env 化 | 2 |
| 実装（依存あり） | 案D＋guildCreate・ポーリング化・export/import 削除・Phase 6-1・Phase 5 | 5 |
| 棚卸し・未決 | resetAll の要否・機能単位 reset・変更履歴・findAllPending | 4 |
| 機能改善 | メンバーログ出力先分離・メッセージ出力機能・ダッシュボード4件 | 3 |
| ドキュメント整理（spec 廃止・guides 集約） | 設計根拠を ARCHITECTURE.md 等へ追記 | 2 |
| Bot 一般公開準備 | `/about` 充実（LP 公開時）・Discord 認証申請（75 サーバー到達後） | 2 |
| **合計** | | **22** |

> 次は **リリース** → Phase 3（依存ゼロで最も価値が高い）。案D は猶予日数と Guild 親テーブルの判断待ち。

---

## 決定事項

### export / import は廃止する（2026-08-19 決定）

**案Dを採用し、その後 export / import を削除する。**

判断の根拠:

- **主用途が案Dで自動化される。** マニュアルが案内していた唯一の実用途は「Bot 除外前に export → 再招待後に import」であり、案D（退出後 N 日間データを保持し再導入で復活）がこれを自動で行う。手動の劣化版が残る形になる
- **維持コストが実バグを生み続けている。** 機能・カラムを追加するたびに「3点セット」（entities 型 / repository マッピング / import の列挙）を手で更新する構造で、更新漏れが必ず**サイレント故障**（復元できたように見えて壊れている）になる。実際に 1-3・`lastRunDate` 非対称・export 不能バグの3件が発生
- **使われている形跡がない。** 1-3 のバグは v2.2.0（2026-06-30）から存在し、round-trip した guild は「有効なのに投稿されない」状態で残るはずだが、本番調査（2026-08-19）で**該当0件**。export 不能バグも未報告

> ⚠️ **順序が重要。案Dを先に入れてから export/import を削除する。** 逆にすると、案D が入るまでの間ユーザーが退出時の保全手段を持たない期間ができる。

**「どうなったら要るか」の再検討条件**（これに該当しない限り再検討しない）:

1. 自己ホストへの移行需要が出たとき（AGPL。同一 guildId なので現行実装で通る唯一のシナリオ）
2. 案Dの猶予期間より長く Bot を外す運用が現れたとき
3. 設定を丸ごと複製したい要望が出たとき（現行実装では guildId チェックにより不可能なので、実質は別機能の新規開発）

「前どういう文面にしてたっけ」という需要は、export/import ではなく**変更履歴**（棚卸し・未決）のほうが正確かつ軽量に応える。

### 案D（遅延削除）を採用する（2026-08-19 決定）

`guildDelete` 時に即削除せず、猶予後に削除する。詳細はタスク 4。猶予日数と Guild 親テーブルの採否は未決（下記）。

---

## 判断待ち（着手前に決めるもの）

決まらないと下流のタスクが動かせないもの。**勝手に決めないこと。**

### 案D（遅延削除）の猶予日数

**ブロック中**: 案D の実装。

30日 / 7日 / それ以外。

- 猶予の意味は「バックアップの保持期間」ではなく「**うっかり外した人が気づいて入れ直すまでの猶予**」と確定済み
- この根拠に立つなら**短いほうがプライバシー的に正しい**
- **プライバシーポリシーへの保持期間明記が必須**になるため、値が決まらないと文面も書けない

### Guild 親テーブル ＋ カスケードにするか

**ブロック中**: 案D の実装量と、Phase 6-1 の要否。

緊急性は消えており（Phase 1 で削除漏れは塞いだ）、純粋な構造改善の判断。

- **利点**: Guild 行を1つ消せば全部消える → 案Dが「猶予後に Guild 行を削除」で済み実装が激減。新テーブル追加時にリレーション必須になり**同じ漏れが構造的に起きなくなる**。案D関連の保存項目（導入日時・削除予定日時）の置き場所にもなる
- **欠点**: マイグレーションが重い（バックフィル＋FK付与）。**現状スキーマに `@relation` は1つも無く、FK制約はゼロからの導入**。孤児レコードがあると FK 作成が失敗するため、事前に本番で孤児の有無を SELECT する必要がある（Phase 1 以前の削除漏れで孤児が存在する可能性が高い）
- **単独で着手する作業ではない。** 採用するなら案Dと1つの塊として設計する

### bump リマインダー「遅すぎる通知」の上限値

**ブロック中**: ポーリング化。

方針は「**送る。ただし上限を設ける**」で確定済み、値だけが空欄。

- 上限を設ける理由はUXではなく**事故防止**（古い pending を掘り起こして送らないため）
- 24時間程度が妥当かという話まで出ている
- 実装はポーリングのクエリ条件が範囲指定になるだけ（`now - 上限 < scheduledAt <= now`）

---

## タスク一覧（優先度順）

### 1. Phase 1 / 2 の本番リリース 【リリース作業】

**依存なし。最優先。** develop が main より3コミット先行（`f79d703` / `19dd72b` / `0eb4241`）で本番未反映。

Phase 1 には公開Bot全体に影響する安全性修正が入っている。

- `deleteAllSettings` の `guildUnverifiedKickWarn` 消し漏れ → reset-all 後の再有効化で**警告なしキックが起きうる**
- `message_count` 系のバックフィル漏れ → **誤キックが起きうる**

**やること**

- [ ] develop → main のリリース PR（タイトルは `release:` プレフィックス・merge commit）
- [x] バックフィル対象行数の事前 SELECT（2026-08-19 実施: 影響7行・単一ギルド・当該ギルドはキック機能無効）
- [x] Ikoitter 側の手作業の要否確認（`warn_stage` は7件すべて0のため**手作業不要**と確定）
- [x] 実機起動確認（テスト起動でモジュール解決・Web サーバー・スケジューラ登録まで到達）
- [ ] reset-all の実機確認（チケットタイマー解除＋DB削除＋Bump解除を1経路で通せる）
- [ ] VC自動募集の export → reset-all → import で `enabledChannelIds` が復元されることの実機確認

> ⚠️ バックフィルのマイグレーションは**不可逆**。本番は起動時に `prisma migrate deploy` が走るため、**main へのマージ＝実行**。実行後は「バックフィルされた行」と「本物の活動記録」を永久に区別できない。

### 2. Phase 3: キック機能のチャンネル分離・必須化・disabledReason 【実装】

**依存ゼロで着手できる中で最大かつ最も価値が高い。**

現状、非アクティブキックは `channelId` 1本でメンバー向け通知と管理者向けログを兼ねている。「管理者がログのつもりでプライベートchに設定 → 予告が本人に届かないままキックされる」が成立する。

- [ ] `notifyChannelId` / `logChannelId` に分離（未承認側は既に分離済み。**対称化が目的**）
- [ ] `enabled=true` に両チャンネルを必須化（DB制約ではなく実行時バリデーション）
- [ ] `disabledReason` の追加（TypeScript の union 型 ＋ DB は素の `String`。Prisma enum は使わない）
- [ ] `/inactive-kick-settings set-channel` → `set-notify-channel` にリネーム、`set-log-channel` を追加（**唯一の基本仕様変更・承認済み**）
- [ ] ja/en 両方の locale キーを揃える

### 3. bump クールタイムを env に外出しし、サービスごとに分ける 【実装・小】

**依存なし。最小。隙間で潰せる。**

- 現状 `getReminderDelayMinutes()`（`bumpReminderConstants.ts:91`）は `env.BUMP_REMINDER_TEST_MODE ? 1 : 120` で**120分がハードコード**、かつサービス名を引数に取らないため Disboard / Dissoku 共通
- **env が持つのはクールタイムの分数だけ。サービスごとに独立して持つ**（Bot ID・コマンド名などはコード側の定数のまま）
- 予約時に絶対時刻を確定させる現在の形（`toScheduledAt`）は**維持する** → 設定値を変えても既存の予約は繰り上がらない
- env 名の付け方は実装時に決めてよい

### 4. 案D（遅延削除）＋ guildCreate ハンドラ ＋ 導入時／再導入時の通知 【実装】

**判断待ち: 猶予日数・Guild 親テーブル。**

`guildDelete` 時に `deleteAllSettings()` を即実行せず、削除予約を入れて猶予後に実行する。「Botの再招待は破壊的操作ではない」というユーザーの当たり前の期待に実装を合わせる話。

**セットで必要になるもの**

- [ ] **guildCreate ハンドラの新設**（**現状存在しないことを確認済み**）。再導入時に予約をキャンセルしないと、生きている設定が期限後に消える
- [ ] プライバシーポリシーへの保持期間明記
- [ ] **導入時オンボーディングDM** — 「外した場合、設定はN日間保持されます」を含む。役割は「告知した事実を作ること」で期待値は低くていい。**凝りすぎないこと**
- [ ] **再導入時DM** — 「設定は残っています」。**価値の重心はここ。**「◯月◯日に消えます」と実際の日時を出す
- 送信先は **DM のみ。チャンネルには送らない**（`systemChannel` が null のサーバーで当てずっぽうのチャンネルに長文が出るため）
- DM の宛先解決はその場で行い、**userId を永続化しない**

> **DM の宛先は `guild.ownerId` で確定。** `INVITE_PERMISSIONS`（`src/api/routes/bot.ts:29`）に `ViewAuditLog` が**含まれていない**ことを 2026-08-19 に確認済みで、監査ログの BOT_ADD から導入者を特定する経路は使えない。最小権限方針を維持する以上、オーナー宛が整合する。

**設計上の罠**

> **案Dは「データの削除」を遅らせるが、「実行中のジョブの停止」は遅らせてはいけない。** 猶予期間中 Bot はそのギルドに居ないので、ジョブが生きていると送信に失敗してエラーログを吐き続ける。**退出時にジョブは即停止、データは猶予後に削除。**

**棚卸しへの影響**: `purgeGuildDataUsecase` は reset-all 経路で**残る**（即時削除は消えないため）。案Dで変わるのは「`guildDelete` から呼ぶ経路」だけ。

### 5. bump-reminder のポーリング化 【実装】

**判断待ち: 遅すぎる通知の上限値。**

動機はバグ修正ではなく**構造の単純化とメンテナンス性**。復元まわりは調査の結果ちゃんと作られていた。「キャンセルが2つある」構造上の問題の解消が本来の目的。

**やること**: ①一定間隔で回るジョブを1本立てる ②「status=pending かつ scheduledAt <= 今」を拾う（上限は判断待ちの値で範囲指定） ③送信する ④status を sent にする

**消えるもの**: メモリ上の `Map<string, ScheduledReminderRef>` / `restorePendingReminders` / `cancelScheduledReminder` / `cancelReminder` と `cancelByGuild` の使い分け

**移行時に落としてはいけないもの**

- 期限切れの即時実行 → クエリ条件が等価になる。楽
- **重複の正規化**（同一 guild+service の pending を最新1件に）→ 現在はメモリ上の Map が担保している。**DB側で担保し直す必要がある。最大の移行ポイント**（`serviceName` が nullable な点に注意）
- 遅すぎるものの扱い → 判断待ちの上限値
- **送信失敗時の status 更新 → 新方式で新たに必要。**更新しないと永久に拾い続ける

**既にある資産**: schema の `@@index([status, scheduledAt])`（確認済み）、`jobScheduler`

**同時に棚卸しするデッドコード**（2026-08-19 確認）

- `bumpReminderRepository.cancelByGuild()` — 本番コードからの呼び出し**ゼロ**。NEW-5 の `cancelAllForGuild` は Manager 側の別物で、これを置き換えてはいない
- `bumpReminderRepository.cancelByGuildAndChannel()` — **同じく呼び出しゼロ**
- NEW-5 で新設した `cancelAllForGuild` もポーリング化で不要になりうる

### 6. export / import の削除 【実装】

**タスク 4（案D）の完了待ち。** 順序を逆にしないこと。

[決定事項](#exportimport-は廃止する2026-08-19-決定)に基づき、export / import 機能を削除する。**Bot コマンド専用機能で Web API からは使われていない**ため（2026-08-19 確認）、削除範囲はダッシュボードに波及しない。

**削除対象**

- [ ] コマンド: `/guild-settings export` / `import`（`guildSettingsCommand.export.ts` / `.import.ts`）とサブコマンド定義・確認ダイアログの customId
- [ ] サービス層: `exportSettings` / `validateImportData` / `planImport` / `importSettings`
- [ ] リポジトリ層: `getFullSettings` / `importFullSettings` / `planImportMerge`（`repositories.ts:50-53` のインターフェース含む）
- [ ] 型: `GuildSettingsExportData` / `GuildSettingsExportSettings` / `FullGuildState` / `EXPORT_SCHEMA_VERSION`（`guildSettingsDefaults.ts` / `guildSettingsExportTypes.ts`）
- [ ] `serializers/guildStateSerializer.ts`（`guildSettingsAggregateRepository` からのみ参照。export 専用）
- [ ] locale キー ja/en（`import_guild_mismatch` / `import_unsupported_version` 等）
- [ ] 対応するテスト

**残すもの**: `serializers/guildSettingsSerializer.ts` は `guildSettingsCoreUsecases` から使われており export とは無関係。

**マニュアル**: 「設定をエクスポートする」「設定をインポートする」セクションを削除し、「⚠️ Bot をサーバーから除外する場合」を**案Dの説明に書き換える**（Phase 2 で直した export 記述はここで消える）。

> **既知の未修正バグ（削除により解消）**: `getFullSettings` は `GuildSettings` 行が無いと即 `null` を返すため（`guildSettingsAggregateRepository.ts:93-94`）、`/guild-settings set-locale` も `set-error-channel` も実行していないギルドでは、他9機能が設定済みでも export が「設定がありません」で失敗する。**削除するため修正しない方針**だが、案D 実装までの期間は「除外前に export しようとして失敗 → 設定が無いと誤解 → そのまま Bot を外してデータ消失」という導線が残る。案Dが長引く場合は暫定修正を検討する。

### 7. Phase 6-1: `deleteAllSettings` のレジストリ化 【実装・条件付き】

**判断待ち: Guild 親テーブル。カスケードを採るなら不要になる。**

`Prisma.TypeMap` から「`guildId` スカラーを持つモデル名」の union を導出し、後始末処理をその union の `Record` として保持する。意図的に削除しないモデルは列挙から外すのではなく `{ action: "skip", reason: "..." }` のようにレジストリの値として書く（外すと網羅性チェックが無意味になる）。

**検証**: レジストリからモデルを1つ意図的に削り、コンパイルエラーになることを確認する。

### 8. Phase 3 の差分をマニュアルに反映 【文書】

**タスク 2（Phase 3）の完了待ち。**

`set-notify-channel` へのリネームと `set-log-channel` の追加／両チャンネル必須である旨／同一チャンネルの兼用が可能である旨／`view` に自動無効化理由が表示される旨／冒頭の「最終更新」日付。**実装後のコードを実際に読んで確認してから書くこと。**

> export/import 廃止に伴うマニュアル修正は**タスク 6 に同梱**する（別タイミングで走るため分離）。

### 9. ドキュメント整理（spec 廃止・guides 集約）

`docs/specs/` の全ファイルを廃止し、維持すべき設計意図・非自明な境界条件・決定経緯を guides に集約する。

- [ ] 各 spec を精査し、guides に移す価値のある情報（設計根拠・非自明な境界条件・決定経緯）を特定する
- [ ] 特定した情報を適切なガイドに追記（ARCHITECTURE.md / IMPLEMENTATION_GUIDELINES.md 等）
- [x] `docs/specs/_TEMPLATE.md` とディレクトリ本体を削除（2026-08-19）— 仕様書作成テンプレートとして意図的に残されていたが、spec 廃止から約2ヶ月間一度も使われず、guides への一本化と衝突するため削除。必要になれば git history から復元できる
- [x] `docs/specs/` の他ファイルを削除（2026-06-29）
- [x] README.md 更新: 機能表の `spec` 列を削除・「仕様書」セクションを削除（2026-06-29）
- [x] TODO.md 更新: 完了済みセクション内の spec リンクを除去（2026-06-29）

### 10. Bot 一般公開準備

- [ ] `/about` の充実（**LP 公開時に実施**）— 公式サイト（`OFFICIAL_URL`）に加え各種リンクを追加: ダッシュボード（`DASHBOARD_URL`）/ GitHub ソース（AGPL 公開リポ）/ ユーザーマニュアル（`USER_MANUAL_URL`）。LP 完成まで現状維持
- [ ] Discord Bot 認証申請（75 サーバー到達後）
- [x] ライセンスを MIT → AGPL-3.0 に変更
- [x] help コマンドにダッシュボード URL リンク追加（2026-06-06 本番反映）
- [x] `/about` コマンド（2026-06-07 実装完了）
- [x] ディスカバリー審査通過後の日本語ローカライズ復活（2026-06-28 確認済み・commit `b32eb95`）

### 11. メンバーログの join/leave 出力先分離 【機能改善】

### 12. メッセージ出力機能 【機能追加】

### 13. ダッシュボード 【UI層・コアに影響しないので優先度低】

- リアクションロール：ロール未設定で保存できる問題（バリデーション＋警告）
- カスタムメッセージのプレビュー機能
- 本文へのチャンネル挿入ボタン
- 共通 ChannelSelect コンポーネント

---

## 棚卸し・未決

設計判断が必要だが着手時期は未定のもの。

### `resetAll` の要否

**案D採用が決定したため「要る」側で確定に近い**（即時削除の経路がここだけになるため）。加えて export/import 廃止により**誤爆時の復旧手段が無くなる**ため、確認の強度がより重要になる。残すなら、日常設定コマンドからの隔離と、サーバー名の手入力のような強めの確認（GitHub のリポジトリ削除方式）を併せて検討する。

> **即時削除の経路はもう1つある**: Web API の `POST /:guildId/reset-all`（Phase 1 で `purgeGuildDataUsecase` に差し替えた3経路目）。ダッシュボードからの削除をどう扱うかもセットで判断が要る。

### 機能単位の reset を足すか

`reset`（**`locale` と `errorChannelId` の2項目のみ**・確認済み）と `reset-all`（全消し）の間が空白で、ユーザーが小さい目的のために過剰な手段を取らされる構造 → **誤爆シナリオの温床**。`resetAll` の要否と一体で判断する。

### 変更履歴を作るか

動機は「前どういう文面にしてたっけ？」であり、**バックアップではなく変更履歴の需要**。有力案は `setting_change_log(guildId, feature, field, oldValue, newValue, changedBy, changedAt)` をリポジトリ層でフックし、対象を**文面フィールドだけに絞る**（7機能程度）。

> ⚠️ 「JSONで吐いて後から戻せるように」を足すと軽さの根拠が全部消えて **export/import に逆戻りする**。「見えるだけ」で不便ならUIで解決する（履歴をクリックで入力欄に流し込む。保存は従来通り管理者が押す）。

### `findAllPending()` の絞り込み

起動時復元を「Bot が現在参加中のギルドのみ」に限定するか。Phase 1 で新規のゴミは出なくなったので緊急性なし。

> **ポーリング化で `restorePendingReminders` 自体が消えるなら、この論点も一緒に消える。単独で着手しないこと。**

---

## 機能拡張アイデア

- **Web API 認証の堅牢化（設定ミス耐性）** — 現状の認証防御は多層で機能しており**実害なし**。設定ミス時の事故耐性を上げる多層化として2点を検討: ①[jwt.ts](src/api/auth/jwt.ts) の `secretKey()` のフォールバック挙動を fail-closed 化（本番相当環境で署名鍵が未設定なら起動アサーション任せにせず `secretKey()` 自体で throw）。②[jwt.ts](src/api/auth/jwt.ts) の `jwtVerify` でトークン寿命を強制（`maxTokenAge` / `exp` 必須化）し、検証側でも有効期限を担保する。詳細な背景・脅威モデルは公開 TODO に書かず別途管理。
- **予約募集(イベント募集)機能** — 他タスク完了後に実装可否判断。骨子: 予約時に VC + Discord Scheduled Event 作成 / RSVP・リマインダー・開始通知は Discord 標準任せ / VC 自動削除なし(投稿削除 or イベント終了ボタンで手動)/ 編集機能あり(日時・タイトル・説明)/ setup は既存 VC 募集と同構成 / VC 名変更は既存 `/vc rename` 流用。細部は実装決定時に詰める
- **キック系ユーザーデータの削除対称性の整理（個別リセットの方針統一）** — ①の `deleteAllSettings` への `guildUnverifiedKickWarn.deleteMany` 追加は **2026-08-19 に実施済み**（下記完了済みセクション参照）。残る非対称は、②未承認キックの個別リセットが warn 記録を `deleteAllByGuild` で消すのに対し、③非アクティブキックの個別リセットは `MemberActivity` を残す点。個別リセットの削除有無を方針統一するか検討する。なお**エクスポートにユーザーデータを含めないのは現仕様維持で問題なし**（再有効化時の `enabledAt` フロアで安全・個人データ/サイズ観点でも除外が妥当）と確認済み。
- **ユーザー embed 作成機能** — ユーザーが embed を作って bot 名義で投稿できる機能（Carl-bot 類似）。**詳細は後日決定**。方向性メモ: 需要あり（お知らせ/ルール/ロールパネル説明）。**管理権限必須にはしない**方針で、①作成・プレビューは誰でも自由（ephemeral/DM）②投稿は「投稿先チャンネルでのそのユーザーの送信権限」で判定（bot=ユーザーの代理・本来できる範囲を超えさせない）③`@everyone`/role メンションは Mention Everyone 権限保持時のみ許可（`allowedMentions` で抑止）④作成者 attribution + 所有権（編集/削除は作成者＋管理者）⑤運営がロール許可をカスタム可能。Web ダッシュボードも OAuth ユーザーのギルド権限で同じ②判定が可能だが、管理設定エリアとは別の一般導線が必要。コマンド版/Web 版どちらから着手するか・所有権の DB モデル等は実装決定時に詰める
- 自動翻訳機能(DeepL API 等)
- 投票システム(グラフ化・レポート集計で Discord 標準との差別化)
- メトリクス収集 / アラート設定(運用規模拡大時)

---

## 未確認事項

タスクに紐づかないが、コードや実機を見れば分かるもの。

- 監査ログのエントリが `guildCreate` より遅れて書かれることがあるか（リトライ／待機の要否）
- `POST /:guildId/reset-all` にフロント側の確認ダイアログがあるか（web リポジトリ側）
- 変更履歴のフック対象となる各リポジトリの upsert 実装（member-log 以外は未確認）
- 案Dを入れたとき、Bot が居ないギルドの設定がダッシュボードでどう見えるか
- 退出直後のDMが本当に届かないか（未実測。退出時DMを見送ったため優先度は低い）
- `docs/guides/ARCHITECTURE.md:146` の招待権限の列挙に `Connect` が抜けている（コードは14権限・ドキュメントは13）。他にもドリフトが無いか

---

## 取り下げ済み・やらないと決めたもの

再検討時の参考用。

- **VC自動募集のカテゴリ→チャンネル移行のバックフィル欠如** — バグではなかった（移行時に本番0件を確認済みの意図的な clean migration）
- **バックフィル値1で救済されない残存リスク** — 杞憂だった（`meetsActiveCondition` が OR 条件のため、下限1が1つでもあれば救済される）
- **export / import 機能そのもの** — 案Dで主用途が自動化され、維持コストがサイレント故障を生み続けているため廃止。詳細と再検討条件は「決定事項」を参照
- **「export だけ残す」案** — 復元できないバックアップは意味がない
- **Phase 6-2（export/import の列挙を `satisfies` で縛る）** — 縛る対象そのものが無くなるため不要
- **Phase 4（エクスポート互換のバージョン分岐・v1→v2 変換）** — 同上
- **`lastRunDate` の export 非対称の修正** — 同上
- **退出時のDM通知** — サポートサーバー参加者にしか届かず、届いた人にも取れる行動がない。副次的に導入者IDの記録が不要になった
- **彩加の全面作り直し** — 「作り直さなければ実装できないもの」が1つも出なかったのが決め手
- **オーナーDM での自動無効化通知** — DM閉じ問題と公開Botでの体験劣化のため棄却
- **どのサーバーが抜けたかの特定／導入経路の確認** — 分かっても判断が変わらない
- **`validateImportData` の guildId 一致チェックの緩和（サーバー間移行）** — スコープ外
- **監査ログからの導入者特定** — `ViewAuditLog` が招待権限に含まれておらず、最小権限方針を維持するため。`guild.ownerId` にフォールバックする

---

## 完了済み

> 詳細な作業経過は git log を参照。

### USER_MANUAL の実装との乖離修正（2026-08-19 develop merge）

マニュアルと実装を照合し、乖離4件を文書側で修正（コード変更なし）。エクスポート説明の「サーバー移行」は `validateImportData` の guildId 一致チェックにより実装上不可能なため削除。エクスポート対象の設定系は実際は10項目で、VC自動募集・非アクティブ自動キック・未承認ユーザー自動キックの3件が列挙から漏れていたため追加。在籍階層の「何段階でも」は `INACTIVE_KICK_MAX_TIERS = 10` に合わせて修正。VC募集 FAQ の権限名は `hasPostPermission` の実装どおり `MANAGE_CHANNELS` に修正。

- [x] エクスポート説明の「サーバー移行」記述を削除し同一サーバーでの復元である旨に修正
- [x] エクスポート対象リストに漏れていた3機能を追加（stateful 側5項目は `FullGuildState` と一致のため変更なし）
- [x] 階層上限を「最大10段階」「最大10件」に修正（2箇所）
- [x] VC募集 FAQ の `MANAGE_MESSAGES` → `MANAGE_CHANNELS`（2箇所）
- [x] `移行` の残存 grep・locale ファイルに該当文言が無いことを確認

### 設定削除・インポート・キック判定の追従漏れバグ修正（2026-08-19 develop merge）

「機能・カラムを追加したときの横断的な列挙の更新漏れ」に起因するバグ6件と、調査中に判明したインメモリタイマーの解除漏れ2件を修正。`deleteAllSettings` の漏れは reset-all 後の再有効化で古い `warnedAt` が「警告済み」と誤判定され警告なしキックが起きうる安全性バグ、`enabledChannelIds` の取りこぼしは export→import で「有効と表示されるのに一切投稿しない」状態が復元されるサイレント故障だった。また `cancelReminder(guildId)` は実リマインダーが常に複合キー `"guildId:serviceName"` で登録されるため完全一致照合ではヒットせず、機能別 reset のインメモリ解除が実質機能していなかったことが判明。

- [x] `deleteAllSettings` に `GuildUnverifiedKickWarn` / `BumpReminder` を追加（guildId を持つ全16モデルを網羅）
- [x] `importFullSettings` に `enabledChannelIds` を追加（export 側は出力済みで round-trip が非可逆だった）
- [x] `purgeGuildDataUsecase` を新設し「タイマー解除 → DB 削除」の順序を保証。reset-all / guildDelete / Web API の3経路から共通で呼ぶ
- [x] `BumpReminderManager.cancelAllForGuild` を新設（複合キーの一括解除）
- [x] `applyGraceClear` のログキーを `log.warn_stage_reset_failed` に修正（ja/en 新設）
- [x] `member_activities` の累積カウントをバックフィルするマイグレーション追加（`20260704070000` の適用前から在籍するメンバーの誤キックを解消）
- [x] 本番DB事前確認: 影響7行・単一ギルド（機能無効・`warn_stage` 全て0）・export→import で壊れたギルドは0件のためアナウンス不要と確定
- [x] テスト追加22ケース（複合キー解除の回帰・呼び出し順序・全モデル網羅・import round-trip）

### 非アクティブキック 在籍階層制導入・活動判定/アクティブ条件のティア単位化（2026-07-04 完了）

非アクティブ自動キックのしきい値を、ギルド単位の単一 `thresholdDays` から在籍日数ベースの多段階「階層（tier、旧称ランク）」（`tiers: InactiveKickTier[]`）に置き換え。さらに設計レビューで見つかった「緩い階層へ在籍日数だけで昇格し、以後無活動でも恒久的にキックされなくなる」抜け穴を塞ぐため、階層ごとに活動判定（`trackMessage/trackVoice/trackReaction`）・アクティブ条件（`minMessageCount/minVoiceCount/minReactionCount` の累積回数下限、OR判定）・在籍日数締め切りモード（`tenureDeadline`）を個別設定できるよう全面リファクタ。旧ギルド共通の活動判定トグル・`/inactive-kick-settings activity set` は廃止し、各階層の設定に一本化した。shared v1.3.0 publish・DB migration（`ranks`→`tiers` リネーム＋活動カウント3列追加）・`/inactive-kick-settings tier set/remove/list`・web ダッシュボードの階層編集 UI（行内折りたたみで活動判定・アクティブ条件・締め切りモードを設定）を実装。

- [x] shared v1.3.0 publish（`InactiveKickRank`→`InactiveKickTier`、`trackMessage/Voice/Reaction`・`minMessageCount/Voice/ReactionCount`・`tenureDeadline` を追加、`ranks`→`tiers`）・saika/web の参照を更新
- [x] DB migration（`ranks`→`tiers` リネーム・旧ギルド共通 track 列を削除して各ティア要素へ backfill・`member_activities` に `message/voice/reaction_count` を追加）+ ドメイン型/デフォルト/リポジトリ/サービス更新
- [x] 記録パイプライン刷新: `recordMemberActivity` がメンバーの現在の在籍日数から適用階層を解決し、その階層の `trackX` を見てから記録・カウント加算するよう変更（ティアをまたいでも常に現在適用中の階層基準で判定）
- [x] 判定ロジック更新: `resolveApplicableTier`（旧 `resolveRankThreshold` を拡張）・`hasActiveCondition`/`meetsActiveCondition`（OR条件）・`tenureDeadline` 時は非アクティブ日数の代わりに在籍日数そのものを締め切りとして使う分岐を追加
- [x] コマンド刷新: `rank` グループを `tier` に改称して活動判定・アクティブ条件・締め切りモードのオプションを追加、旧 `activity set` グループを完全廃止、`view`/preview を階層表示に対応
- [x] 呼称を「ランク」→「階層（tier）」に全面置換（コマンド名・型名・変数名・ロケール・ドキュメント・DBカラム名）
- [x] web ダッシュボード: 階層一覧を行ごとに直接編集可能な UI に刷新（「詳細設定」の折りたたみで活動判定・アクティブ条件・締め切りモードを設定）、旧「アクティビティ判定」独立カードを削除
- [x] 在籍日数の上限バリデーション（当初3650日）を撤廃 — 実在籍日数に技術的な上限はないため下限（0以上）のみとする
- [x] ja/en ロケール・USER_MANUAL.md 更新・テスト全通過（saika 2668件・web typecheck/test green）

> NOTE: 未コミット。コミット・develop merge・release は別途対応。

### 非アクティブキック/未承認キック 通知の件数表示改善（2026-07-04 完了）

キック通知（`buildKickNotification`、非アクティブキック・未承認キック両機能）のフィールド名に「このフィールドの表示人数/合計人数」`(x/y)` を付与し、プレビュー（`buildPreviewEmbedPages`）と同じ表示形式に揃えた。加えて Embed タイトルにも合計人数 `{{total}}` を補間し、複数 Embed に跨る場合でも全体件数が一目でわかるようにした。ja/en ロケール `embed.title.kick` を更新し、既存 notifier テストにケースを追加。

- [x] `inactiveKickNotifier.ts` / `unverifiedKickNotifier.ts` の `splitKickedMemberFields` にフィールド名 `(x/y)` カウントを追加
- [x] 両 notifier のキック通知タイトルに合計人数 `{{total}}` を補間
- [x] ja/en ロケール4ファイルの `embed.title.kick` を更新
- [x] 既存テストにケース追加（フィールド分割時の件数整合性・タイトルへの total 受け渡し・全 2642 通過）

> NOTE: 未コミット。コミット・develop merge・release は別途対応。

### 非アクティブキック アクティビティトリガー web UI + shared v1.0.0（2026-06-30 完了・本番デプロイ済み）

shared v1.0.0 publish（`enabledChannelIds` + `trackMessage/trackVoice/trackReaction` を統合）・saika v2.2.0 で `#v1.0.0` 参照に更新・web: InactiveKickPage にアクティビティ判定カードを追加（2枚目に配置）。release PR #92（develop→main・auto-merge）・web main push 済み。

- [x] shared v1.0.0 publish + saika の参照を `#v1.0.0` に更新（2026-06-30）
- [x] web: InactiveKickPage にアクティビティトリガー設定 UI 追加（2026-06-30）

### VC自動募集 チャンネル単位化（2026-06-30 完了・本番デプロイ済み）

カテゴリ単位 allowlist（`enabledCategoryIds`）を VCチャンネルID 単位の allowlist（`enabledChannelIds`）に置き換え。本番 DB でカテゴリ設定済みレコードが0件であることを確認し clean migration で移行。`set-channel` → `set-post-channel` リネーム（`add-channel` との混同防止）。add-channel / remove-channel の StringSelectMenu 追加（VAC トリガー + AFK を候補除外・完了通知にチャンネルメンション一覧表示）。shared v0.3.4 で `enabledChannelIds` 追加。テスト全通過（2636件）。

- [x] 本番 DB 確認 → 0件・clean migration
- [x] DB: `enabledChannelIds` jsonb 追加（migration + Prisma スキーマ・entities・defaults・repository）
- [x] コマンド: `add-channel`/`remove-channel` 追加・`set-channel` → `set-post-channel` リネーム・`view` 更新・ja/en ロケール・USER_MANUAL.md 更新
- [x] shared v0.3.4 publish（`VcAutoRecruitSettings.enabledChannelIds` 追加）・テスト全通過（2636件）

### 非アクティブキック アクティビティトリガー設定（2026-06-29 develop merge）

活動種別（テキストメッセージ / VC参加 / 絵文字リアクション）を `/inactive-kick-settings activity set` のマルチセレクトメニューで一括 on/off できる機能。コマンド設計を `enable/disable` 2コマンドから `set`（1〜3択必須）に刷新し、「全無効」状態を物理的に排除。現在の設定をデフォルト選択で表示し、成功時に有効/無効のトリガー名を列挙。DB マイグレーション（`track_message` / `track_voice` / `track_reaction` カラム追加）・shared `InactiveKickSettings` 型拡張（v0.3.3 publish 済み）・ja/en ロケール・テスト全通過（2636件）。

- [x] shared v0.3.3 publish（`trackMessage/trackVoice/trackReaction` を `InactiveKickSettings` に追加）
- [x] DB マイグレーション `20260629000000_add_activity_triggers` + Prisma スキーマ・entities・defaults・repository 更新
- [x] `setActivityTriggers` サービスメソッド追加（`setActivityTrigger` 単体→一括置換）
- [x] activityEventHandlers にトリガーチェック追加・`recordActivity` に trigger 引数追加
- [x] `activity set` サブコマンド実装（constants / locale / handler / execute ルーター / bot コマンド定義）
- [x] inactiveKickResource.ts に新フィールドを反映
- [x] テスト更新 + develop merge（PR #80・rebase）

### 通知送信リファクタリング + 実行時刻設定化 Steps 0〜6（2026-06-28 完了）

（2026-06-28 完了）設計書: KICK_NOTIFICATION_REFACTOR_SPEC.md

inactive-kick / unverified-kick の通知ページネーション廃止・{markerRole} 廃止＋mentionEnabled による個別メンション化・予定日別 embed（`daysLeft` グループ）・`<t:unix:f>` タイムスタンプ・`computeKickUnix()`（runHour:00 基準）・{daysLeft} プレースホルダー廃止・`sendNotification` 共通送信ユーティリティ・毎時スイープ（`"0 * * * *"`）＋ per-guild `timezone`/`runHour` フィルタ・`lastRunDate` 同日ガード・`KickedMember` 型（displayName 取得）。`setWarnStage` upsert 化・`sendPaginatedEmbeds` の `pagination.ts` 統合・preview の PREVIEW_COLLECTOR_MS=300_000 化も含む。

- [x] Step 0: `setWarnStage` upsert 化・`sendPaginatedEmbeds` → `pagination.ts` 統合・`embedPaginator.ts` 削除・preview PREVIEW_COLLECTOR_MS 化（`recordMemberActivity` の getActivity 条件付き挙動はテスト定義に従い維持）
- [x] Step 1: `GuildInactiveKickSettings` / `GuildUnverifiedKickSettings` に `timezone` / `runHour` / `lastRunDate` / `mentionEnabled` 追加・マイグレーション
- [x] Step 2: `set-timezone` / `set-run-hour` / `mention enable` / `mention disable` コマンド追加（両機能）・セレクトメニュー・バリデーション・`view` 更新・ja/en ロケール
- [x] Step 3: 毎時スイープ化・per-guild `timezone`/`runHour` フィルタ・`lastRunDate` 同日ガード・`timezone:` を `addJob` から除去
- [x] Step 4: `notificationSender.ts` 新規作成・両 runner の `sendPaginatedEmbeds` を `sendNotification` へ差し替え・`warnStage` 前進条件を最初のメッセージ成功のみ必須に変更
- [x] Step 5: `splitMentionFields` 動的分割・warn/kick 表示形式変更・予定日別 embed・`computeKickUnix`・`{daysLeft}` 廃止・`mentionEnabled` 制御・`KickedMember` 型
- [x] Step 6: API エンドポイントに `timezone`/`runHour`/`mentionEnabled` 追加（shared v0.3.2）・Web UI（両機能の設定カードにメンション通知・タイムゾーン・実行時刻を追加）・廃止プレースホルダー警告 UI（MessageTemplateEditor）

> **未デプロイ**: saika develop → main release PR・web main push はユーザーの GO 待ち。

### web ダッシュボード Fastify API（§10・2026-06-06 完了・本番稼働）

Bot と同一プロセスで起動する Fastify API を実装し、web ダッシュボード（`saika-dash.sonozaki.net`）の per-guild バックエンドとして本番稼働。認証は web BFF に集約し、saika は JWT 検証のみ（OAuth/refresh を持たない）。

- [x] `src/api/server.ts` + `src/api/routes/`（Bot 同一プロセス起動・CORS〔PATCH/DELETE 許可〕・rate-limit・`/health`）
- [x] 認証層（`authenticate`〔Cookie JWT 検証〕+ `requireGuildAccess`〔guildId ∈ jwt.guilds〕）
- [x] 機能別エンドポイント（config/afk/vac/member-log/bump/vc-recruit/vc-auto-recruit/inactive-kick/unverified-kick/sticky/reaction-role/ticket/overview の CRUD・パネル投稿・`GET /api/bot`〔アバター+招待URL・Administrator 権限〕・`GET /api/guilds/joined`・全設定リセット `POST /api/guilds/:id/reset-all`）
- [x] Coolify で API 公開（Docker Compose `docker-compose.coolify.yml`・`saika-api.sonozaki.net`・ホスト 8081〔8080 は coolify-proxy 占有〕）
- [x] feature→develop 統合 #57 → 本番リリース #58/#59/#60（main）。本番 E2E 成功（web 保存→bot `view` で反映確認）
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) に API 層を追記（プロセス構成図・ディレクトリツリー実態化・「API 層（web ダッシュボード）」節〔認証=web BFF 集約で saika は JWT 検証のみ・レイヤ構成・エンドポイント概要・env〕・2026-06-07）

> NOTE: パネル削除の P2025 競合修正（DB→メッセージ順）・CORS methods・テスト堅牢化等のホットフィックスを #59/#60 で対応。デプロイ知見は [web/docs/DEPLOYMENT.md](../web/docs/DEPLOYMENT.md)。

### メッセージ削除機能の改善（投稿者タイプフィルタ）（§3・2026-06-04 完了・本番リリース済み）

`/message-delete` に投稿者タイプフィルタ（全投稿者 / 🤖 bot のみ / 👤 人のみ / 🚪 既に居ない人〔退出済みメンバー〕のみ）を追加。**コマンド実行時（条件設定フェーズ・収集対象の絞り込み）とスキャン後（プレビュー画面・表示の絞り込み）の双方**で利用可能。退出済みメンバーのメッセージ一括削除に対応。判定ロジック `matchesAuthorType` をスキャン時・プレビュー時で共用。退出済み判定はスキャン直前に `guild.members.fetch()` で在籍メンバーID集合を一括取得（失敗時キャッシュfallback）し、各スキャン済みメッセージに `authorIsBot`/`authorIsMember` を刻む（プレビューは再フェッチ不要）。プレビューは ActionRow 5 行上限のため既存の投稿者セレクト（Row 2）にカテゴリを統合（カテゴリ⇔個別投稿者は単一選択で排他・表示の絞り込みのみで削除対象件数は不変）。当初の方式A（任意ID入力）は既存 Webhook ID 入力モーダルで代替可能なため方式B（タイプ別フィルタ）+ bot/人フィルタに集約。

- [x] 仕様書更新: MESSAGE_DELETE_SPEC.md（条件設定UI・プレビューRow2・条件Embed・ローカライズ表・テストケース）
- [x] 実装（`matchesAuthorType` + scan フィルタ + 条件設定の投稿者タイプ Select + execute のメンバー取得 + プレビュー投稿者セレクト統合 + 条件Embed + ja/en ロケール）
- [x] テスト（scan の bot/人/退出済みフィルタ・membership刻み・`matchesAuthorType`・条件設定セレクト・プレビューのカテゴリ振り分け・全 2437 通過）
- [x] [USER_MANUAL.md](docs/guides/USER_MANUAL.md) 更新（できること・条件設定ステップ表・プレビュー説明・使用例）
- [x] **本番リリース**: release PR #51（develop→main・auto-merge）。feature→develop は PR #50（rebase）

> NOTE: 実機検証（`pnpm start` 起動 + 動作確認）は未実施（auto-merge 指示により release を先行）。本番での軽い動作確認を推奨。

### VC自動募集（2026-06-04 完了・本番デプロイ済み）

VC が **0人→1人（最初の1人）** になった時、指定チャンネルへ募集メッセージ（カスタム本文＋固定 Embed＋「🔊 VCに参加」Link ボタン）を自動投稿。VC から全員退出すると投稿済みメッセージのボタンを無効の「募集終了」へ差し替え（募集終了は `enabled` 非依存・空室時のみ・開始者の在室は不問）。CreateVC トリガー・AFK・Bot 参加は除外し、VAC 作成 VC は対象。募集文は content として送信し `allowedMentions` でメンションを実ピング。設計・実装は member-log/VAC 流儀（本文可変・Embed 固定・DB 保存・jsonb 配列・起動クリーンアップ）に準拠。

- [x] 仕様書作成: VC_AUTO_RECRUIT_SPEC.md（投稿先=固定通知チャンネル / 0→1 のみ / カスタム本文 + Embed + ボタン / 全員退出で募集終了 / 60s 連投抑制 / opt-out は将来拡張）
- [x] 実装（DB `GuildVcAutoRecruitSettings`〔`activeInvites` jsonb〕 + migration + リポジトリ/設定サービス + イベントサービス `VcAutoRecruitService`〔投稿・募集終了・channelDelete・起動クリーンアップ〕 + `/vc-auto-recruit-settings` コマンド群 + set-message モーダル + content/Embed/ボタンビルダー + `voiceStateUpdate`/`channelDelete`/clientReady 配線 + composition root + help 追加）
- [x] **本番リリース**: release PR #44（develop→main・2026-06-04）。命名は当初 `vc-invite`→ ユーザー指示で **VC自動募集 / `/vc-auto-recruit-settings`** に全面リネーム
- [x] **カテゴリ allowlist 追加（§2 拡張・後追い）**: 募集は**明示的に有効化したカテゴリの VC でのみ**投稿（`enabledCategoryIds` jsonb・ルート直下は sentinel `"TOP"`）。`enable-category`/`disable-category` 追加、空＝投稿なし、`@everyone` 可視性は判定に使わず認証制サーバーのメンバー専用 VC も有効カテゴリなら投稿、カテゴリ削除で allowlist 自動掃除。全 2418 通過
- [x] **二重通知バグ修正（後追い）**: CreateVC 経由の参加で募集通知が2件投稿される問題を修正。原因は discord.js の `newState` がキャッシュ上のライブ参照で、VAC の `setChannel` が `newState.channelId` を破壊的に書き換えるため、`voiceStateUpdate` で VAC を先に await すると vc-auto-recruit がトリガー除外をすり抜けて生成 VC を指し、移動イベントと合わせ2件投稿されていた。ハンドラ順序を **vc-auto-recruit → VAC** に入替え、トリガー Ch を同期的に読ませて解消。全 2437 通過。release PR #49（develop→main・2026-06-04・本番デプロイ済み）

> NOTE: 起動クリーンアップ・closeInvite の Discord 副作用経路はロジック実装済み（ユニットでは主要分岐を担保）。カテゴリ allowlist 拡張は別 release PR で本番反映予定。

### 未承認ユーザー自動キック（§1・2026-05-31 完了・未デプロイ）

参加から猶予日数（`graceDays` 1〜30）内に認証ロール未取得のメンバーを、事前警告（本人へ DM + 任意で通知チャンネルへキック予告）を経て日次で自動キック。判定は単一条件（`joinedAt` 起算・認証ロール未取得・Bot/管理者/オーナー/除外ロール以外）。`enabledAt` 起算下限で有効化直後の無警告一斉キックを防止し、warn-before-kick（`GuildUnverifiedKickWarn.warnedAt`）で日次チェック取りこぼし時のサイレントキックも防止。Notion 引き継ぎを一次情報源に、コマンド構成は inactive-kick（§8）に、本文可変・Embed 固定は member-log 流儀に揃えて実装。

- [x] 仕様書作成: UNVERIFIED_KICK_SPEC.md（`/unverified-kick-settings` / DM + 通知/ログ 2チャンネル分離 / 対象ロール〔通知直前付与・認証時 `guildMemberUpdate` 剥奪〕 / `enabledAt` 起算下限 / dry-run=`TEST_MODE`）
- [x] 実装（DB `GuildUnverifiedKickSettings` + リポジトリ/サービス + `/unverified-kick-settings` コマンド群〔19 サブコマンド + exempt グループ + preview〕 + 日次チェック `addJob`〔03:00 JST・`noOverlap`・`UNVERIFIED_KICK_CRON` 上書き〕 + 警告 DM + 通知/ログ Embed〔キック予告本文も本文可変・Embed 固定でカスタム可〕 + 対象ロール付与/剥奪 + `guildMemberUpdate` ハンドラ + guildDelete 一括削除）
- [x] サイレントキック防止（warn-before-kick・2026-06-05）: 警告判定を `ageDays == warnDays` の点比較から `warnedAt`（新 DB `GuildUnverifiedKickWarn`）の状態判定へ変更。通知猶予（`graceDays - warnDays`）確保後にのみキックし、警告日を飛び越えた未警告者はまず警告して繰り延べる。記録は認証/退出/起算リセット/警告無効化で失効削除、`enable`/`reset` で一括破棄。migration `20260605092936_add_unverified_kick_warn`
- [x] テスト（eligibility/candidates/notifier/runner/設定サービス/warn リポジトリ/コマンド定義・全 2561 通過）

> NOTE: 警告 DM 送信・通知投稿・対象ロールの通知直前付与順序・`guildMemberUpdate` 認証時剥奪はロジック実装済みだがユニットテスト未整備（Discord 副作用のため・判定ロジックは別途担保）。**未デプロイ**: 実機検証（`pnpm start` 起動 + 動作確認）と release PR（develop→main）は未実施。

### 自動キック機能（非アクティブメンバー整理）（§8・2026-05-31 完了）

一定期間テキスト/VC/リアクションで活動がないメンバーを、段階通知（1週間前・3日前）を経て日次で自動キック。誤キック防止の安全策（警告ゲート `warnStage==2` 必須・`enabledAt` 起算下限・送信成功後に warnStage 前進・除外時の猶予クリア・dry-run `TEST_MODE`）を中核に据えた。member-log の流儀（本文可変・embed 固定・DB 保存・単一波括弧）に準拠。

- [x] 仕様書作成: INACTIVE_KICK_SPEC.md（活動=テキスト+VC+リアクション / 段階通知 / 除外=Bot・Administrator・whitelist・オーナー・VC接続中 / dry-run=`TEST_MODE` / 対象ロール自動付与。デフォルトしきい値 30 日）
- [x] 実装（DB `GuildInactiveKickSettings`/`MemberActivity` + リポジトリ/サービス + アクティビティ記録ハンドラ〔throttle 1h〕 + `/inactive-kick-settings` コマンド群〔13 サブコマンド + whitelist グループ + preview〕 + 日次チェック `addJob`〔04:00 JST・`noOverlap`〕 + 段階通知/キック実行 + `GuildMessageReactions` Intent / Partials 追加）
- [x] テスト（eligibility/candidates/notifier/runner/設定サービス/コマンド定義・全 2310 通過）
- [x] 実機検証 + UX 追補（develop 反映済み）: 事前通知を **1週間前/最終警告で別メッセージ**化、通知の**カスタム文を本文(content)・embed は固定**化（`{markerRole}` は本文に含めたときだけメンション）、**キック通知はデフォルト文なし**（未設定なら本文なし）、`view` で実際の本文を表示、preview の色を info、`whitelist remove` を**セレクト複数選択**化、検証用に **`INACTIVE_KICK_CRON`** env 上書きを追加

> NOTE: 対象ロールの階層不足スキップ・guildDelete の新テーブル一括削除はロジック実装済みだがユニットテスト未整備（spec テストケース参照）。**本番リリースは本コミットの release PR（develop→main）で実施**。

### VC 操作コマンド拡張 & ephemeral/public 監査（§7・2026-05-30 完了・本番デプロイ済み）

VC 切断/移動コマンドの追加と、VC 操作系の出力可視性の全面整理。`/vc disconnect`・`/vc move`（個別 + VC 全員の一括、`target-member`/`target-channel` 方式）と `/afk` の target 拡張（VC 全員一括）を追加。共通の `formatActionLog` / 一括確認ダイアログ（60s）を `src/bot/shared/` に新設し、一括は「参加者全員」+ 対象メンバーのメンション一覧で表示。

- [x] 仕様確定: VC_COMMAND_SPEC / AFK_SPEC のオープン項目（target 型=案A / カラー=blurple / TO=60s / 配置=src/bot/shared/）
- [x] [IMPLEMENTATION_GUIDELINES.md](docs/guides/IMPLEMENTATION_GUIDELINES.md) に「コマンド設計原則（ephemeral/public）」を追加し全コマンド分類
- [x] 実装（`/vc disconnect`・`/vc move` 個別+一括 / `/afk` target 拡張 + public 化 / `formatActionLog` + 一括確認ダイアログ）
- [x] テスト（個別/一括・確認/キャンセル/タイムアウト・部分失敗・空VC no-op・target 競合 / formatActionLog）
- [x] `/vc rename`・`/vc limit` を public 化し、成功メッセージに対象VCを表示
- [x] 操作パネル（vc-panel）撤廃（全機能を `/vc`・`/afk` に一本化、VAC・VC募集の自動パネル送信を廃止）

### Postgres 移行（§6・2026-05-30 完了・本番デプロイ済み）

SQLite → PostgreSQL のデータ層移行。コード・スキーマ・ローカル検証に加え、**本番切替まで完了**。

- [x] `schema.prisma` の provider 切替（sqlite → postgresql）+ 接続を `@prisma/adapter-pg` に変更（Prisma 7 は直接接続に driver adapter 必須）
- [x] テーブル名 `@@map` を `guild_*_configs` → `guild_*_settings` にリネーム
- [x] JSON 文字列カラム 8 件を jsonb 化 + アプリ側の `JSON.parse`/`stringify`/`parseJsonArray` を全廃
- [x] migration を PostgreSQL 用に再生成 + ローカル Docker Postgres で検証
- [x] Docker / Compose / `docker-entrypoint.sh` / `.env.example` を PostgreSQL 構成に変更
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) / [DEV_TIPS.md](docs/guides/DEV_TIPS.md) 更新
- [x] **本番切替**: infra で Coolify マネージド PostgreSQL 17 + R2 バックアップ構築 → `/guild-settings export` → `DATABASE_URL` 切替 → release deploy → `/guild-settings import` → 検証OK。ホットフィックス2件対応済み（import の upsert 化 / reaction-role の messageId 解決）。旧 sqlite ボリュームは温存中（数週間後に削除予定）

### ディレクトリ再編 + 命名整理（§5・2026-05-29 完了）

`src/{bot,api,features,shared}/` 標準構成へ再編し、命名を `-settings` に統一。

- [x] `-config` → `-settings` リネーム（全 8 コマンド・変数・ファイル・DB **モデル名**・export 形式の `config`→`settings` フィールド・ドキュメント・仕様書 `GUILD_SETTINGS_SPEC.md`）。DB **テーブル名**（`@@map` の `guild_*_configs`）は migration 回避のため据え置き、§6 でリネーム。`vc-recruit`→`instant-recruit` は実態が VC 中心のため見送り（VC募集名を維持）
- [x] エントリポイント移動: `src/bot/main.ts` → `src/main.ts`
- [x] `src/bot/features/<f>/` と `src/shared/features/<f>/` を `src/features/<f>/` に統合（記述的ファイル名を維持。設定リポジトリも各 `src/features/<f>/<f>SettingsRepository.ts` に分散）
- [x] `src/shared/scheduler/` は saika 固有として `src/shared/` に維持、`src/shared/database/types/` も維持
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [IMPLEMENTATION_GUIDELINES.md](docs/guides/IMPLEMENTATION_GUIDELINES.md) を新構造で更新

### shared への外出し（§4・2026-05-29 完了・本番デプロイ済み）

「他 bot でもそのまま流用できる汎用コードのみ外出し」方針で、汎用3点（`createLogger` / `DiscordWebhookTransport` / `errors` の `BaseError` 階層）を `@ayasono/shared` に移行。`locale/*` / `utils/prisma.ts` / `errors/errorUtils.ts`・`processErrorHandler.ts` は saika 固有結合が強く残置。配布は git タグ + コミット済み dist（`shared` v0.2.3。pnpm 11.4 の HTTP tarball integrity 問題を回避するため、tarball/CI 方式から最終的にこれに確定）。

- [x] `logger.ts` を `createLogger` の薄い wiring に置換（call site 無変更）、`discordWebhookTransport.ts` 削除
- [x] `customErrors.ts` 削除 + `BaseError` 階層の import 約73箇所を `@ayasono/shared/core` に全置換
- [x] shared に vitest 基盤 + core 3点テスト整備、配布を git タグ + コミット済み dist 化（`shared` v0.2.3）
- [x] docker build/run で本番同等起動を検証 → release PR #11/#12 で main 反映 → Coolify デプロイ成功

> NOTE: webhook transport・customErrors の単体テストは shared 側（`shared/tests/core/`）に移設済み。saika 側の重複テストは削除済み。

> 上記より前（guild-config export/import 完全対応化 §-・VC 募集 UX 改善・リアクションロール ボタン色 UI 改善・Coolify 移行 ほか）は git log を参照。
