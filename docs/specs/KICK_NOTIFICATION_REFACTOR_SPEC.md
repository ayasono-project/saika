# 通知送信リファクタリング + 実行時刻設定化 - 設計書

> inactive-kick / unverified-kick の通知ページネーション廃止・{markerRole} 廃止＋個別メンション化・予定日別 embed 構造・markerRole 整合性チェック・mentionEnabled・送信共通化・実行時刻のギルド設定化

最終更新: 2026年6月27日

---

## 背景（解決したい問題）

### 問題1: ページネーションのリスナー失効

事前通知のページングボタンを押すと「インタラクションに失敗しました」になる。原因は [`sendPaginatedEmbeds`](../../src/bot/shared/embedPaginator.ts#L113)（L113）が内部で `message.createMessageComponentCollector({ time: timeMs })`（[L134](../../src/bot/shared/embedPaginator.ts#L134)）を使っており、`NOTIFICATION_COLLECTOR_MS = 1時間`（[inactiveKickRunner.ts L48](../../src/features/inactive-kick/services/inactiveKickRunner.ts#L48) / [unverifiedKickRunner.ts L48](../../src/features/unverified-kick/services/unverifiedKickRunner.ts#L48)）経過後と Bot 再起動後にリスナーが消滅するため。

背景ジョブ（cron）から投稿され何時間も後に押される通知ではこの方式は不適切。同じ構造のバグが inactive-kick と unverified-kick の両 runner に存在する:

- inactive-kick: `sendStageNotification`（[inactiveKickRunner.ts L239](../../src/features/inactive-kick/services/inactiveKickRunner.ts#L239)）と `processKicks`（[inactiveKickRunner.ts L346](../../src/features/inactive-kick/services/inactiveKickRunner.ts#L346)）が `sendPaginatedEmbeds` を呼ぶ
- unverified-kick: `sendWarnNotification`（[unverifiedKickRunner.ts L251](../../src/features/unverified-kick/services/unverifiedKickRunner.ts#L251)）と `processKicks`（[unverifiedKickRunner.ts L339](../../src/features/unverified-kick/services/unverifiedKickRunner.ts#L339)）が `sendPaginatedEmbeds` を呼ぶ

**preview コマンド（同一ユーザーが即時操作）での使用は正常**なので、`sendPaginatedEmbeds` 自体は変更しない。

### 問題2: 固定件数分割の過剰見積もり

現状は `NOTIFICATION_PAGE_SIZE = 25`（[inactiveKickNotifier.ts L14](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L14) / [unverifiedKickNotifier.ts L14](../../src/features/unverified-kick/services/unverifiedKickNotifier.ts#L14)）の固定件数で分割している。1フィールド1024文字制限に対して安全マージンが大きすぎる。動的に文字数を測って分割する方が正確。

### 問題3: 04:00 / 03:00 固定実行による深夜通知

inactive-kick は `"0 4 * * *"`（[inactiveKickRunner.ts L43](../../src/features/inactive-kick/services/inactiveKickRunner.ts#L43)）、unverified-kick は `"0 3 * * *"`（[unverifiedKickRunner.ts L43](../../src/features/unverified-kick/services/unverifiedKickRunner.ts#L43)）で固定実行のため、本文にロールメンション（`{markerRole}`）を入れていると深夜に通知が飛ぶ。ギルドごとに好みの時間帯に変更できる設定が必要。

### 問題4: {markerRole} ロールメンションによる不正確な通知

`{markerRole}` を通知本文に含めると「現在対象ロールを持つメンバー全員」への ping になる。前サイクルの警告済み者（ロールが残存）も含まれるため、今回の通知対象と乖離する可能性がある。また、キック予定日を `minDaysLeft`（最小残日数の代表値）1つで表現しているため、複数のキック予定日が混在するバッチでは各メンバーの実際の残日数と一致しない。

### 問題5: markerRole の Discord/DB 不整合

`clearMarkerRoleIfPresent`（[recordActivity.ts L36](../../src/features/inactive-kick/handlers/recordActivity.ts#L36)）は Discord のロール剥奪に失敗した場合にログのみで後続処理がない。DB 上は `warnStage=0` にリセットされていても Discord 上にはロールが残り続ける不整合が生じる。`applyGraceClear` の失敗時も同様のフォローがない（[inactiveKickRunner.ts](../../src/features/inactive-kick/services/inactiveKickRunner.ts)）。

### 問題6: `recordMemberActivity` の冗長な DB チェックと `setWarnStage` の silent 失敗（inactive-kick のみ）

[recordActivity.ts](../../src/features/inactive-kick/handlers/recordActivity.ts) の `recordMemberActivity`（[L80](../../src/features/inactive-kick/handlers/recordActivity.ts#L80)）は、ロール剥奪の前に DB から `warnStage` を読み取って「警告済みか」でゲートしている。しかし `clearMarkerRoleIfPresent` が内部で `member.roles.cache.has(markerRoleId)` によりロールの有無を直接チェックするため、DB チェックは冗長。

さらに `memberActivityRepository.ts` の `setWarnStage`（[L42](../../src/features/inactive-kick/memberActivityRepository.ts#L42)）が `updateMany`（update のみ）のため、Bot 参加後に一度も活動していないメンバー（レコードなし）に対してはサイレントに 0 件更新で終わる。結果として:
- 活動検知時: `getActivity` が null → `wasWarned=false` → ロール剥奪されない
- 日次チェック: `warnStage` が永続化されず `warnStage < 2` のままキックゲートを越えられず FINAL_WARN が無限ループし、同じメンバーへの通知が毎日繰り返される

**スコープ**: unverified-kick の `UnverifiedKickWarnRepository` は `createMany` + `skipDuplicates` を使っており同様の問題はない。

### 問題7: preview のコレクタータイムアウト短すぎ・ページネーション非統一・`embedPaginator.ts` の重複実装

preview コマンドのコレクタータイムアウトが `INACTIVE_KICK_EPHEMERAL_COLLECTOR_MS = 60_000`（[inactiveKickSettingsCommand.constants.ts L64](../../src/features/inactive-kick/commands/inactiveKickSettingsCommand.constants.ts#L64)）= **60 秒**と短すぎる（unverified-kick の `UNVERIFIED_KICK_EPHEMERAL_COLLECTOR_MS`（[unverifiedKickSettingsCommand.constants.ts L62](../../src/features/unverified-kick/commands/unverifiedKickSettingsCommand.constants.ts#L62)）も同様）。大規模サーバーではメンバーフェッチだけで数秒かかるため、表示直後にボタンが失効する。

ただしこれらの定数は reset 確認ダイアログでも共用されているため、そのまま 300_000 に変更すると reset 確認が 5 分になる。**preview 専用の定数を別途用意する必要がある**（既存定数はそのまま reset 用として残す）。

また `embedPaginator.ts` の `buildNavRow` は中央ボタンが disabled のページ表示のみで、[pagination.ts](../../src/bot/shared/pagination.ts) の `buildPaginationRow`（ジャンプモーダル付き・ticket / reaction-role の設定 view が使用）が使われていない。`sendPaginatedEmbeds` のコレクター管理ロジック自体は共通化できる価値があるため、`pagination.ts` に統合し `embedPaginator.ts` を削除するのが正しい設計。`sendPaginatedEmbeds` の呼び出しは inactive-kick と unverified-kick の preview / runner の計 6 箇所にある（runner 側は Step 4 で別途置き換え）。

---

## 決定事項

### [A] ページネーションの廃止と送信処理の共通化

#### [A-1] 通知経路のページングボタンを廃止し、静的なメッセージ出力に変更する

**層1（notifier・機能ごと）**: embed を組み立てる。
- 現状の固定件数分割（`chunk(candidates, NOTIFICATION_PAGE_SIZE)`・[inactiveKickNotifier.ts L103](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L103) / [unverifiedKickNotifier.ts L130](../../src/features/unverified-kick/services/unverifiedKickNotifier.ts#L130)）をやめ、**1フィールド1024文字制限を測りながら動的に分割**する
- 1人で1024文字を超える異常な表示名はトランケートする

**層2（新規・共通送信ユーティリティ）**: content 文字列と embed 配列を受け取り順次送信する。
- **送信順**: content メッセージ（メンション＋カスタムメッセージ）を全部送り切ってから embed メッセージを送る
- **content 分割**: 2000 文字を超える場合は後続メッセージへ分割する（後続の content メッセージは content のみ）
- **embed 詰め込み**: 複数の embed をできるだけ1メッセージに詰める（1メッセージあたり embed 10個・全 embed 合計 6000 文字以内）。超過分は次のメッセージへ

#### [A-2] フッターに通し番号を表示する

`X / 総ページ数`（メッセージをまたいでも通し番号になるよう、embed 配列の総数を送信前に確定させる）。

#### [A-3] 通知本文を {markerRole} ロールメンションから個別ユーザーメンションへ変更

`{markerRole}` を通知本文から完全廃止する（「問題4」の解消）。代替として対象メンバーを `<@userId>` で個別にメンションした content を embed より先に送信する。

- content = 個別ユーザーメンション列（`mentionEnabled=true` のギルドのみ）＋カスタムメッセージ（未設定なら省略）
- `mentionEnabled` はギルド単位の ON/OFF（`GuildInactiveKickSettings` / `GuildUnverifiedKickSettings`・詳細は [[H] mentionEnabled ギルド設定]）
- content が空（`mentionEnabled=false` かつカスタムメッセージ未設定）の場合は embed のみ送信
- unverified-kick も同様に `{markerRole}` を廃止し個別メンションへ移行する

#### [A-4] `warnStage` の前進条件

**最初のメッセージ送信成功**（content があれば最初の content メッセージ、なければ最初の embed メッセージ）で `warnStage` を前進させる。後続メッセージの送信失敗はログのみのベストエフォートとする。

**理由**: 通知漏れ（メンバーが気づかずキックされる）の方が重複通知より影響が大きい。最初のメッセージが届いた時点でメンバーへの基本的な通知は完了している。全通成功を要求すると、失敗時に成功済みメッセージまで再送（= 重複）になるため避ける。現在の実装（[inactiveKickRunner.ts L238-268](../../src/features/inactive-kick/services/inactiveKickRunner.ts#L238)）は `sendPaginatedEmbeds` が成功した場合に `setWarnStage` を呼ぶ構造になっているが、これを最初のメッセージ送信結果で判定するよう変更する。

#### [A-5] `sendPaginatedEmbeds` は preview 用途で残すが改修する

runner からの呼び出しはなくなるが、[embedPaginator.ts](../../src/bot/shared/embedPaginator.ts) は preview コマンド用に存続させる。ただし問題7の解消として [[K] `embedPaginator.ts` の preview 向け改修] を施す。

---

### [B] ユーザー表示形式

- **warn（在籍中）**: `<@ユーザーID>` をスペース区切り。Discord がメンションチップとして描画するため視覚的に区別でき、コンマは不要。
- **kick（退出済み）**: `表示名(ユーザーID)` を `,` 区切り。退出後はメンションが解決されず表示名はプレーンテキストになるため、区切り文字が必要。`(ID)` を併記することで一意性を確保し、表示名に区切り文字が含まれる場合の曖昧さも吸収する。

**現状との差分**:

| 機能 | embed | 現状 | 変更後 |
| --- | --- | --- | --- |
| inactive-kick | kick | `displayName` を `\n` 区切り（[inactiveKickNotifier.ts L163](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L163)） | `表示名(userId)` を `,` 区切り |
| unverified-kick | kick | `<@userId>` を `\n` 区切り（[unverifiedKickNotifier.ts L183](../../src/features/unverified-kick/services/unverifiedKickNotifier.ts#L183)） | `表示名(userId)` を `,` 区切り |
| inactive-kick | warn | `<@userId>` を `\n` 区切り（[inactiveKickNotifier.ts L110](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L110)） | `<@userId>` をスペース区切り |
| unverified-kick | warn | `<@userId>` を `\n` 区切り（[unverifiedKickNotifier.ts L135](../../src/features/unverified-kick/services/unverifiedKickNotifier.ts#L135)） | `<@userId>` をスペース区切り |

> **実装注意（unverified-kick の kick）**: 現状の `processKicks` は `kickedUserIds: string[]`（[unverifiedKickRunner.ts L286](../../src/features/unverified-kick/services/unverifiedKickRunner.ts#L286)）と ID のみを保持している。新形式では表示名が必要なため、inactive-kick の `displayName = candidate.displayName`（[inactiveKickRunner.ts L289](../../src/features/inactive-kick/services/inactiveKickRunner.ts#L289)）と同様に、runner でキック前に表示名を控える変更が必要。

---

### [C] 予定日表示の改善（warn embed のみ）

kick 通知は当日実行のため予定日は存在しない。以下の変更は warn embed のみ対象。

#### [C-1] 予定日別 embed グループ構造

warn embed を**キック予定日ごとに1 embed**として構成し、同一予定日のメンバーをまとめる。

- **先頭 embed のみ**タイトルを付与する（既存と同じタイトル文言）。後続の embed はタイトルなし
- 各 embed に2フィールドを設ける:
  - フィールド1: `キック予定日時`（フィールド名）/ `<t:${unix}:f>`（フィールド値・Discord タイムスタンプ）
  - フィールド2: `対象メンバー`（フィールド名）/ スペース区切りの `<@userId>` 列（フィールド値）
- フィールド value が 1024 文字を超える場合は同一 embed 内に追加フィールドを分割して設ける
- 複数の予定日グループがある場合はキック予定日が**早い順（昇順）**に embed を並べる
- 通常稼働時（全メンバーが同一キック予定日）は embed が1枚になり既存に近い見た目になる
- ボットダウン復帰時など複数の予定日が混在する場合は複数 embed になる
- unverified-kick は全対象者が同一猶予期限のため常に1グループになるが、同様の embed 構造を適用する

> Discord タイムスタンプ（`<t:unix:f>`）は embed のフィールド name（タイトル行）では描画されないが、フィールド **value（値）** では正しく描画される（Discord の制約）。

#### [C-2] 表示形式の変更

`:D`（日付のみ）から **`:f`（日付＋時刻）** へ変更する。

- 現状: `<t:${predictedKickUnix}:D>`（[inactiveKickNotifier.ts L101](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L101) / [unverifiedKickNotifier.ts L128](../../src/features/unverified-kick/services/unverifiedKickNotifier.ts#L128)）
- 変更後: `<t:${predictedKickUnix}:f>`

#### [C-3] unix 算出基準の変更

- 現状: `now.getTime() + minDaysLeft * 24 * 60 * 60 * 1000`（[inactiveKickNotifier.ts L98-99](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L98)） — 「現在時刻 + 残日数」の相対計算
- 変更後: 「残日数後の日付 × 設定実行時刻（runHour:00）」基準 — 表示時刻と実際のキック実行時刻を一致させる
- `timezone` / `runHour` を notifier に渡す必要があるため、`WarnNotificationContext`（[inactiveKickNotifier.ts L50-62](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L50) / [unverifiedKickNotifier.ts L81-92](../../src/features/unverified-kick/services/unverifiedKickNotifier.ts#L81)）に両フィールドを追加する

#### [C-4] i18n キー値の変更（フィールドタイトル）

4 箇所を変更する。大文字化スタイルは各ファイルの既存方針を維持する（統一は別タスク）。

| ファイル | キーと行番号 | 変更前 | 変更後 |
| --- | --- | --- | --- |
| [ja/features/inactiveKick.ts L138](../../src/shared/locale/locales/ja/features/inactiveKick.ts#L138) | `embed.field.name.kick_schedule` | `"キック予定日"` | `"キック予定日時"` |
| [ja/features/unverifiedKick.ts L160](../../src/shared/locale/locales/ja/features/unverifiedKick.ts#L160) | `embed.field.name.kick_schedule` | `"キック予定日"` | `"キック予定日時"` |
| [en/features/inactiveKick.ts L140](../../src/shared/locale/locales/en/features/inactiveKick.ts#L140) | `embed.field.name.kick_schedule` | `"Scheduled kick date"` | `"Scheduled kick date and time"`（sentence case 維持） |
| [en/features/unverifiedKick.ts L156](../../src/shared/locale/locales/en/features/unverifiedKick.ts#L156) | `embed.field.name.kick_schedule` | `"Scheduled Kick Date"` | `"Scheduled Kick Date and Time"`（Title Case 維持） |

---

### [D] プレースホルダーの廃止

#### [D-1] `{daysLeft}` の廃止（inactive-kick のみ）

`{daysLeft}`（残日数）をカスタムメッセージテンプレートから廃止する。

**廃止理由**: ボットダウン復帰時など、同一通知バッチ内で複数のキック予定日が混在する場合に `minDaysLeft`（最小残日数の代表値）が各メンバーの実際の残日数と一致しない。正確なキック予定日時は [C-1] の予定日別 embed に表示するため、本文への近似値掲載は不要。

**影響箇所**:
- `formatInactiveKickMessage` の `vars` から `daysLeft` を除去（[inactiveKickNotifier.ts L88-93](../../src/features/inactive-kick/services/inactiveKickNotifier.ts#L88)）
- モーダルのプレースホルダー説明文から `{daysLeft}` を削除
- unverified-kick の `{remainingDays}` は**廃止しない**（全対象者が同一猶予期限のため一意に定まる）

#### [D-2] `{kickDate}` プレースホルダーは追加しない

各メンバーの正確なキック予定日時は [C-1] の予定日別 embed に表示するため、本文へのプレースホルダー追加は行わない。

---

### [E] 実行時刻の設定化（通知とキックを同一時刻で実行）

#### [E-1] スキーマ追加

`GuildInactiveKickSettings`（[prisma/schema.prisma L101](../../prisma/schema.prisma#L101)）および `GuildUnverifiedKickSettings`（[schema.prisma L131](../../prisma/schema.prisma#L131)）に以下を追加する。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `timezone` | `String` | IANA タイムゾーン名（例: `"Asia/Tokyo"`・デフォルト: `"Asia/Tokyo"`） |
| `runHour` | `Int` | 実行時刻（0〜23・デフォルト: 要検討・`@map("run_hour")`） |
| `lastRunDate` | `String?` | 同日2回実行ガード用（`"YYYY-MM-DD"` 形式・ギルドの `timezone` で評価・`@map("last_run_date")`） |

**timezone を IANA 名で持つ理由**: DST（サマータイム）を自動で吸収できるため。UTC 固定値で繰り返しスケジュールを保存すると DST で年2回ずれる。タイムゾーン略称（JST/CST 等）は一意でないためパースに使わない。

**参考前例**: `GuildVcAutoRecruitSettings.embedEnabled`（[schema.prisma L93](../../prisma/schema.prisma#L93)）が Boolean フィールド追加の前例として参照可能。

#### [E-2] スケジューラをスイープ方式へ変更

現状の固定 cron ジョブ（`"0 4 * * *"` / `"0 3 * * *"`）を廃止し、**毎時スイープ**（`"0 * * * *"`）へ変更する。各発火時に「そのギルドの `timezone` における現在時刻の『時』が `runHour` と一致するギルドのみ」処理する。

実装方針:
- `JobScheduler.addJob`（[jobScheduler.ts L84](../../src/shared/scheduler/jobScheduler.ts#L84)）の `ScheduledJob` インターフェース（[L8](../../src/shared/scheduler/jobScheduler.ts#L8)）はそのまま利用する
- node-cron のジョブ別 `timezone`（`ScheduledJob.timezone` [L13](../../src/shared/scheduler/jobScheduler.ts#L13)）はギルドごとに異なる timezone を扱えないため使わず、コード内で `Intl.DateTimeFormat`（または Luxon）により tz 解決する
- inactive-kick / unverified-kick で**同じスイープ機構を共有**できるよう設計する（1本のスイープで両機能をディスパッチするか、別々の毎時ジョブにするかは実装時に判断）
- 検証用 env（[`env.ts` L37 `INACTIVE_KICK_CRON`](../../src/shared/config/env.ts#L37) / [L38 `UNVERIFIED_KICK_CRON`](../../src/shared/config/env.ts#L38)）は引き続きスイープジョブ自体の発火 cron 式の上書きとして有効（発火頻度を変える用途）

#### [E-3] 同日2回実行のガード

`lastRunDate`（ギルドの `timezone` で評価した `"YYYY-MM-DD"`）を当日処理**開始時**に保存し、次の発火時にすでに処理済みならスキップする。理由: 日中に設定時刻を変更した場合の二重実行を防ぐ。開始時に保存することで、処理途中でクラッシュしても再実行されない（ベストエフォート）。

#### [E-4] デフォルト値（要確定）

- `timezone`: `"Asia/Tokyo"` 固定
- `runHour`: 未確定（→「未確定・要検討」参照）

---

### [F] 設定 UI

#### [F-1] timezone 設定コマンド

主要タイムゾーンを厳選したセレクトメニュー（Discord 制約で1メニュー最大25項目以内）。全 IANA 対応が必要になった場合は autocomplete へ拡張（後追い可。autocomplete は入力に応じ動的に最大25件返す方式で、全件を選択肢登録するわけではない）。バリデーションは `Intl.supportedValuesOf("timeZone")` の集合で行う。

#### [F-2] 時刻設定コマンド

`"00:00"` 〜 `"23:00"` の 24 項目セレクトメニュー（25 上限内）。選択値の頭から `runHour`（0〜23 の整数）を保存する。

#### [F-3] コマンド構成

既存の `inactive-kick-settings` / `unverified-kick-settings` コマンドの流儀に合わせ、timezone 設定と時刻設定のサブコマンド（例: `set-timezone` / `set-run-hour`）に分ける。メンション制御（`mention enable` / `mention disable`）は [[H] mentionEnabled ギルド設定] を参照。

#### [F-4] ダッシュボード

今回はスキーマと設計のみ。Web 側は同じ DB カラムを読み書きする形で後から対応。time input（hh:mm 表示）でも可だが、内部は `runHour` に正規化する。

---

### [G] markerRole 整合性チェックフェーズ

#### [G-1] 目的

`clearMarkerRoleIfPresent` / `applyGraceClear` の失敗（「問題5」）で生じた Discord/DB 不整合を日次で検出・修正する。

#### [G-2] 実行順序

```
バケット計算 → applyGraceClear → 整合性チェック → assignMarkerRoles → sendStageNotification → processKicks
```

既存の `applyGraceClear` の後、`assignMarkerRoles` の前に配置する。整合性チェック時点ではバケット（weekWarn / finalWarn / kick）はすでに確定済みの前提。

#### [G-3] 処理内容

0. **前提チェック**: `markerRoleId` が未設定の場合はスキップ
1. **shouldHaveMarker 集合の算出**: weekWarn / finalWarn / kick バケットに含まれる全メンバーを「対象ロールを持つべき」集合とする
2. **余剰ロール除去**: Discord 上でロールを持つが shouldHaveMarker に含まれないメンバーからロールを剥奪する
3. **不足ロール付与**: shouldHaveMarker に含まれるが Discord 上でロールを持たないメンバーにロールを付与する
4. **エラー処理**: `10011`（Unknown Member）エラーは `settings.channelId` へ通知する。その他のエラーはログのみ

> **実装注意**: Discord 上でロールを持つメンバーの列挙は `role.members`（キャッシュ）を使う。大規模サーバーではキャッシュが不完全な場合があるため、`guild.members.fetch()` による事前フェッチが必要か実装時に判断する。

---

### [H] mentionEnabled ギルド設定

warn 通知チャンネルへの個別ユーザーメンション（`<@userId>`）の送信有無をギルド単位で制御する。

| フィールド | 型 | デフォルト |
| --- | --- | --- |
| `mentionEnabled` | `Boolean` | `true` |

**コマンド構成**（`inactive-kick-settings` / `unverified-kick-settings` 共通）:

```
mention enable   # ギルド全体のメンション通知を有効化
mention disable  # 無効化
```

---

### [I] プレースホルダー廃止の移行案内

廃止プレースホルダーを設定テンプレートに含むギルドへの案内を行う。

#### [I-1] Prisma マイグレーション（既存テンプレートの一括クリーニング）

デプロイ時の Prisma マイグレーションで、DB 上の全ギルドの既存テンプレートから廃止プレースホルダーを除去する。

| 廃止プレースホルダー | 対象 |
| --- | --- |
| `{markerRole}` | inactive-kick・unverified-kick 両方の全テンプレートカラム |
| `{daysLeft}` | inactive-kick の全テンプレートカラム（unverified-kick には存在しない） |

マイグレーション実行後は既存テンプレートに廃止プレースホルダーが残らないため、**日次ジョブでの廃止案内送信は不要**。

#### [I-2] コマンド・ダッシュボードでのバリデーション

**全サブコマンド実行時**（読み取り系・テンプレート保存系を問わず）および**ダッシュボードの機能設定ページ表示時・保存時**に以下を行う。

1. 現在の DB 値に廃止プレースホルダーが含まれているか確認する
2. 含まれていた場合: **自動除去して DB を更新**し、ephemeral embed で案内を表示する

#### [I-3] 廃止案内 embed 構成

コマンド・ダッシュボードのバリデーション時に ephemeral で送信する embed。warn embed と同色。ページ番号なし。

```
title:       通知テンプレートの設定変更のお知らせ
description: 使用中のテンプレートに廃止されたプレースホルダーが含まれていたため、
             自動的に除去しました。以下の変更内容をご確認ください。

field（{markerRole} が含まれていた場合のみ追加）:
  name:  {markerRole} の廃止
  value: ロールへの一括メンションを廃止し、対象メンバーへの個別メンションに
         変更しました。
         メンション通知の ON/OFF はコマンドまたはダッシュボードから設定できます。
         ・コマンド: /inactive-kick-settings mention enable / disable
         ・ダッシュボード: 機能設定 > メンション通知

field（{daysLeft} が含まれていた場合のみ追加・inactive-kick のみ）:
  name:  {daysLeft} の廃止
  value: 残日数プレースホルダーを廃止しました。
         キック予定日時はユーザーごとに通知 embed に表示されます。
```

含まれる廃止プレースホルダーのフィールドのみ動的に追加する（両方なら2フィールド、片方なら1フィールド）。

---

### [J] `recordMemberActivity` の簡素化と `setWarnStage` の upsert 化（inactive-kick のみ）

`recordMemberActivity`（[recordActivity.ts L80](../../src/features/inactive-kick/handlers/recordActivity.ts#L80)）から `getActivity` 呼び出しと `wasWarned` ゲートを除去し、常に以下を実行するよう変更する:

1. `recordActivity(guildId, userId, now, 0)` — `lastActivityAt` を更新し `warnStage` を常に 0 にリセット（upsert のため初回でも安全）
2. `clearMarkerRoleIfPresent` — ロール有無は Discord 側（`member.roles.cache.has`）で直接確認するため DB チェック不要

`setWarnStage`（[memberActivityRepository.ts L42](../../src/features/inactive-kick/memberActivityRepository.ts#L42)）を `updateMany` から `upsert` に変更し、レコードが存在しないメンバーの `warnStage` も正しく永続化する。create 時の `lastActivityAt` は `new Date(0)`（活動なし sentinel）とする（`computeEffectiveLastActivity` が `enabledAt` をフロアとするため実効計算への影響はない）。

**スコープ**: unverified-kick は `UnverifiedKickWarnRepository` が `createMany` + `skipDuplicates` を使っており対応不要。

この修正は §2 の他 Step と独立して先行着手できる。

### [K] `sendPaginatedEmbeds` を `pagination.ts` に統合・`embedPaginator.ts` 削除

`embedPaginator.ts` の `sendPaginatedEmbeds` 関数とコレクター管理ロジックを [pagination.ts](../../src/bot/shared/pagination.ts) に統合し、`embedPaginator.ts` を削除する。

**`pagination.ts` への追加内容**:
- `sendPaginatedEmbeds` 関数（現 `embedPaginator.ts` から移植）
- 内部で `buildPaginationRow` / `showPaginationJumpModal` / `parsePaginationAction` / `resolvePageFromAction` を使いジャンプ対応とする（`buildNavRow` は使わない・削除）
- コレクターのオプション（`filterUserId`・`timeMs`・`allowedMentionRoleIds` 等）は現行の `SendPaginatedEmbedsOptions` 型を踏襲

**タイムアウト定数**:
- `INACTIVE_KICK_EPHEMERAL_COLLECTOR_MS` / `UNVERIFIED_KICK_EPHEMERAL_COLLECTOR_MS`（60_000）は reset 確認ダイアログでも共用のため変更しない
- preview コマンド呼び出し側で **`PREVIEW_COLLECTOR_MS = 300_000`（5 分）** を新たに定義し `timeMs` に渡す（各 constants ファイルに追加、または `sendPaginatedEmbeds` の `timeMs` に直接記述）

**影響箇所（Step 0 で対応・runner は Step 4 で別途対応）**:
- [inactiveKickSettingsCommand.preview.ts](../../src/features/inactive-kick/commands/inactiveKickSettingsCommand.preview.ts) — import 先を `pagination.ts` に変更・timeMs を 300_000 に
- [unverifiedKickSettingsCommand.preview.ts](../../src/features/unverified-kick/commands/unverifiedKickSettingsCommand.preview.ts) — 同上
- runner 側（inactive-kick × 2・unverified-kick × 2）は `embedPaginator.ts` を import しているが Step 4 で共通送信ユーティリティへ差し替えるため Step 0 では触らない

この修正は §2 の他 Step と独立して先行着手できる。

---

## データモデル変更

### GuildInactiveKickSettings への追加

現状（[schema.prisma L101-115](../../prisma/schema.prisma#L101)）に以下 3 フィールドを追加する:

```prisma
model GuildInactiveKickSettings {
  // ...（既存フィールドは変更なし）
  timezone       String  @default("Asia/Tokyo")
  runHour        Int     @default(4) @map("run_hour")          // ※デフォルト値は要検討
  lastRunDate    String? @map("last_run_date")                  // "YYYY-MM-DD"（当日ガード）
  mentionEnabled Boolean @default(true) @map("mention_enabled")

  @@map("guild_inactive_kick_settings")
}
```

### GuildUnverifiedKickSettings への追加

現状（[schema.prisma L131-146](../../prisma/schema.prisma#L131)）に以下 3 フィールドを追加する:

```prisma
model GuildUnverifiedKickSettings {
  // ...（既存フィールドは変更なし）
  timezone       String  @default("Asia/Tokyo")
  runHour        Int     @default(3) @map("run_hour")          // ※デフォルト値は要検討
  lastRunDate    String? @map("last_run_date")                  // "YYYY-MM-DD"（当日ガード）
  mentionEnabled Boolean @default(true) @map("mention_enabled")

  @@map("guild_unverified_kick_settings")
}
```

---

## 実装順チェックリスト

- [x] **Step 0（独立着手可）**: `setWarnStage` upsert 化・`sendPaginatedEmbeds` を `pagination.ts` に統合（[[J]](#j-recordmemberactivity-の簡素化と-setwarnstage-の-upsert-化inactive-kick-のみ) / [[K]](#k-sendpaginatedembedsをpaginationtsに統合embedpaginatorts-削除)）
  - [ ] `recordMemberActivity` から `getActivity` / `wasWarned` を除去し常に `recordActivity(..., 0)` + `clearMarkerRoleIfPresent` を呼ぶ — **テストが条件付き挙動（`warnStage > 0` のみリセット）を正とするため見送り。現挙動維持。**
  - [x] `setWarnStage`（[memberActivityRepository.ts](../../src/features/inactive-kick/memberActivityRepository.ts)）を `updateMany` → `upsert`（create 時 `lastActivityAt: new Date(0)`）
  - [x] `sendPaginatedEmbeds` を `pagination.ts` へ移植・`buildPaginationRow` / `showPaginationJumpModal` 等でジャンプ対応化・`embedPaginator.ts` 削除
  - [x] inactive-kick / unverified-kick の preview コマンドの import を `pagination.ts` に変更し `PREVIEW_COLLECTOR_MS = 300_000` を渡す

- [x] **Step 1: スキーマとマイグレーション**
  - [x] `GuildInactiveKickSettings` / `GuildUnverifiedKickSettings` に `timezone` / `runHour` / `lastRunDate` / `mentionEnabled` を追加・マイグレーション適用
  - [x] 対応リポジトリ層・型定義（`src/shared/database/types.ts`）を更新

- [x] **Step 2: 設定コマンドの追加**
  - [x] `inactive-kick-settings set-timezone` / `set-run-hour` / `mention enable` / `mention disable`
  - [x] `unverified-kick-settings set-timezone` / `set-run-hour` / `mention enable` / `mention disable`
  - [x] `Intl.supportedValuesOf("timeZone")` によるバリデーション・`view` 表示追加・ja/en ロケール追加

- [x] **Step 3: スケジューラのスイープ化**
  - [x] 固定ジョブ（`"0 4 * * *"` / `"0 3 * * *"`）→ 毎時スイープ（`"0 * * * *"`）へ変更
  - [x] `getHourInTimezone` で `runHour` フィルタ・`lastRunDate` 同日ガード・`updateLastRunDate` 保存
  - [x] `timezone:` パラメータを `addJob` から除去（コード側で Intl 解決）

- [x] **Step 4: 共通送信ユーティリティの新規作成・runner 改修**
  - [x] `src/bot/shared/notificationSender.ts` 新規作成（content 全部 → embed 詰め込み・フッター通し番号）
  - [x] 両 runner の `sendPaginatedEmbeds` を `sendNotification` へ差し替え
  - [x] `warnStage` 前進条件を「最初のメッセージ送信成功」のみ必須・後続はベストエフォートに変更
  - [x] `KickedMember { userId; displayName }` 型導入（unverified-kick でキック前に displayName を控える）

- [x] **Step 5: notifier の改修**
  - [x] **[A]** `splitMentionFields` による動的フィールド分割（`NOTIFICATION_PAGE_SIZE` 廃止）
  - [x] **[B]** warn: `<@userId>` スペース区切り / kick: `displayName` カンマ区切り
  - [x] **[C-1〜4]** `daysLeft` グループごとの予定日別 embed・`:f` タイムスタンプ・`computeKickUnix()` で `runHour:00` 基準算出・「キック予定日時」i18n 変更
  - [x] **[D-1]** `{daysLeft}` 廃止（`WarnNotificationContext` から除去）
  - [x] **mentionEnabled** フラグで `<@userId>` content 付与を制御

- [ ] **Step 6: ダッシュボード対応**（Bot 側 Step 1〜5 完了後・別 PR・低優先度）
  - [ ] inactive-kick / unverified-kick の設定 API エンドポイントに `timezone` / `runHour` / `mentionEnabled` を読み書き対象として追加
  - [ ] ダッシュボード UI に timezone セレクト + 時刻入力（`hh:mm` 表示）+ メンション ON/OFF トグルを追加

---

## 未確定・要検討

### `runHour` のデフォルト値

現状の 4（inactive-kick）/ 3（unverified-kick）を踏襲するか、深夜ピン（ロールメンション通知が深夜に飛ぶ）を避ける時刻（例: 9 時など）に変更するか。スキーマの `@default` に影響するため、Step 1 着手前に決定する。

### embed 表示/非表示トグルの追加

今回とは別タスク。対象者リストが embed 内にしか存在しないため、オフにするとリストが消える問題の設計が前提となる。

---

## 別タスク（今回の実装とは分離する PR / コミットで行う）

差分の意図を明確に保つため、上記 [A]〜[F] とは混ぜない。

### [別タスク1] 英語ロケールの大文字化スタイル統一

**現状の分裂**:
- [`en/features/inactiveKick.ts`](../../src/shared/locale/locales/en/features/inactiveKick.ts): `embed.field.name.*` は概ね sentence case（例: `"Notification channel"`、`"Target members"`）。ただし `embed.title.view = "Inactive Auto-Kick Settings"`（[L100](../../src/shared/locale/locales/en/features/inactiveKick.ts#L100)）は Title Case の例外。
- [`en/features/unverifiedKick.ts`](../../src/shared/locale/locales/en/features/unverifiedKick.ts): 概ね Title Case（例: `"Verified Role"`、`"Target Members"`）。

**推奨方針**: UI ラベルとして sentence case を正とし、`unverifiedKick.ts` を `inactiveKick.ts` に合わせて sentence case へ統一する（最終決定は要確認）。

**例外確認が必要な箇所**: `embed.title.view` のような機能名見出しを Title Case のまま残すか、統一対象に含めるかを判断すること。

---

## 参考

- [`src/bot/shared/embedPaginator.ts`](../../src/bot/shared/embedPaginator.ts) — コレクター方式のページネーター（[K] で `pagination.ts` に統合後削除）
- [`src/bot/shared/pagination.ts`](../../src/bot/shared/pagination.ts) — 共通ページネーション（`buildPaginationRow`・ジャンプモーダル付き・[K] で `sendPaginatedEmbeds` も統合）
- [`src/features/inactive-kick/services/inactiveKickRunner.ts`](../../src/features/inactive-kick/services/inactiveKickRunner.ts) — 日次チェック本体
- [`src/features/inactive-kick/services/inactiveKickNotifier.ts`](../../src/features/inactive-kick/services/inactiveKickNotifier.ts) — Embed 整形
- [`src/features/unverified-kick/services/unverifiedKickRunner.ts`](../../src/features/unverified-kick/services/unverifiedKickRunner.ts) — 日次チェック本体
- [`src/features/unverified-kick/services/unverifiedKickNotifier.ts`](../../src/features/unverified-kick/services/unverifiedKickNotifier.ts) — Embed 整形
- [`src/shared/scheduler/jobScheduler.ts`](../../src/shared/scheduler/jobScheduler.ts) — スケジューラ
- [`src/shared/config/env.ts`](../../src/shared/config/env.ts) — cron 上書き env
- [`prisma/schema.prisma`](../../prisma/schema.prisma) — DB スキーマ
- [`src/shared/locale/locales/ja/features/inactiveKick.ts`](../../src/shared/locale/locales/ja/features/inactiveKick.ts) — ja ロケール（inactive-kick）
- [`src/shared/locale/locales/en/features/inactiveKick.ts`](../../src/shared/locale/locales/en/features/inactiveKick.ts) — en ロケール（inactive-kick）
- [`src/shared/locale/locales/ja/features/unverifiedKick.ts`](../../src/shared/locale/locales/ja/features/unverifiedKick.ts) — ja ロケール（unverified-kick）
- [`src/shared/locale/locales/en/features/unverifiedKick.ts`](../../src/shared/locale/locales/en/features/unverifiedKick.ts) — en ロケール（unverified-kick）
- [INACTIVE_KICK_SPEC.md](INACTIVE_KICK_SPEC.md) — inactive-kick 機能仕様書（実装完了後に本設計書に基づき更新する）
- [UNVERIFIED_KICK_SPEC.md](UNVERIFIED_KICK_SPEC.md) — unverified-kick 機能仕様書（同上）
