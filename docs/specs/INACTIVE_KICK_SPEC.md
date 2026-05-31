# 非アクティブ自動キック機能 - 仕様書

> Inactive Kick - 一定期間テキスト/VC/リアクションで活動がないメンバーを、事前のチャンネル通知を経て自動キックする機能

最終更新: 2026年5月31日

---

## 概要

サーバー内で一定期間（しきい値日数）活動がないメンバーを、日次の自動チェックで検出し、段階的なチャンネル通知（1週間前・3日前）を経て自動キックする機能です。member-log 機能の流儀（本文可変・embed 固定・DB 保存・変数差し込み）に揃えます。

誤キック・事故防止のために以下を備えます。

- **警告ゲート**: 最終警告を受け取っていない（`warnStage < 2`）メンバーは決してキックしない。しきい値を超えていても、まず最終警告を送ってからキックは次回以降に回す。
- **トラッキング開始基準（`enabledAt`）**: キックの起算は「機能を有効化した時刻」を下限とする。導入直後に古参メンバーが無警告で一斉キックされる事故を防ぐ。
- **preview**: 現在のキック対象・通知対象を一覧表示（ページング）。
- **dry-run（env `TEST_MODE`）**: 運用者が実キックせず挙動を確認。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| アクティビティ記録 | `messageCreate` / `voiceStateUpdate` / `messageReactionAdd` でメンバーの最終活動時刻を記録 |
| 日次キックチェック | 1 日 1 回、各ギルドの非アクティブメンバーを検出 → 段階通知 / キック実行 |
| 段階通知 | キック予定の 1 週間前・3 日前にチャンネルへ事前通知、当日にキック実行通知 |
| dry-run（テストモード） | env `TEST_MODE=true` の間は実キックせず通知・ログのみ（運用者向け・全ギルド一括） |
| enable / disable | 機能の有効化・無効化 |
| set-channel | 通知チャンネルを設定 |
| set-threshold | 非アクティブ判定日数（しきい値）を設定 |
| set-week-warn-message / clear-week-warn-message | 1週間前通知のカスタムメッセージを設定・削除 |
| set-final-warn-message / clear-final-warn-message | 最終警告（3日前）のカスタムメッセージを設定・削除 |
| set-kick-message / clear-kick-message | カスタムキック通知メッセージを設定・削除 |
| set-marker-role / clear-marker-role | 警告対象へ自動付与する「対象ロール」を設定・削除（通知メンション用） |
| whitelist add/remove/list | キック除外（ホワイトリスト）のロール・ユーザーを管理 |
| preview | 現在のキック対象・通知対象の一覧を表示（ページング） |
| view | 現在の設定を表示 |
| reset | 確認ダイアログ付きで設定をリセット |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageGuild | 全サブコマンドの実行（設定管理・preview） |
| Bot | KickMembers | 非アクティブメンバーのキック |
| Bot | ManageRoles | 警告対象への「対象ロール」付与・剥奪（対象ロール設定時のみ） |
| Bot | ViewChannel, SendMessages, EmbedLinks | 通知チャンネルへの Embed 送信 |
| Bot | GuildMessageReactions（Intent） | リアクション活動の記録（**新規追加が必要**・後述「依存関係」） |

> 自動除外は **`Administrator` 権限保持者のみ**（スタッフ保護）。`ManageGuild` だけのモデレーター等は対象になるため、保護したい場合はホワイトリストに登録する。

---

## アクティビティ記録

### トリガー

**イベント**: `messageCreate` / `voiceStateUpdate` / `messageReactionAdd`

**発火条件:**

- Bot 以外のメンバーによる活動
- ギルド内（DM は対象外）
- 機能が無効でも記録は継続する（導入後すぐ有効化しても履歴が活きるようにするため）

### 動作フロー

1. ギルド・ユーザーを特定（Bot・DM は無視）
2. throttle: 同一メンバーの `lastActivityAt` 更新は前回更新から 1 時間以上経過時のみ行う（書き込み量削減）。判定の読み取りコストを避けるため、最終書き込み時刻のインメモリキャッシュを併用する
3. `MemberActivity`（`guildId` + `userId`）を upsert で `lastActivityAt = now` に更新
4. 活動を検知したら `warnStage` を 0 にリセット（再活動でキック猶予をリセット）。**対象ロールが付与済みの場合のみ**剥奪する（ホットパスでの不要な API 呼び出しを避ける）。warned 状態のメンバーは定義上 1 時間以内の活動が無いため、復帰の初回活動は throttle されず必ずリセットが走る（throttle スキップが起きるのは `warnStage` が既に 0 の連投時のみ＝実害なし）

**ビジネスルール:**

- リアクション記録には `GuildMessageReactions` Intent が必要（未キャッシュメッセージ対応のため `Partials.Message` / `Partials.Reaction` も追加）
- VC は「参加」（`oldState.channelId === null && newState.channelId !== null`）を活動とみなす（ミュート切替・チャンネル移動等の細かな状態変化は対象外）

### レコードの掃除

| 契機 | 処理 |
| --- | --- |
| キック実行 | 当該メンバーの `MemberActivity` を削除 |
| 自主退出（`guildMemberRemove`） | 当該メンバーの `MemberActivity` を削除（孤児レコード防止） |
| Bot 追放・退出（`guildDelete`） | 当該ギルドの `GuildInactiveKickSettings` / `MemberActivity` を削除（[USER_MANUAL.md](../guides/USER_MANUAL.md) のギルドデータ一括削除に含める） |

---

## 日次キックチェック

### トリガー

**スケジュール**: 毎日 04:00（Asia/Tokyo）に 1 回実行。

**方式**: `jobScheduler.addJob`（node-cron・cron 式 `0 4 * * *`・`timezone: "Asia/Tokyo"`）による定期ジョブ。全ギルド共通の単一ジョブ（固定 jobId）を Bot 起動時（ready）に 1 件登録する。`ScheduledJob.timezone` への forward は scheduler リファクタ（develop 反映済み）で対応済み。

- 「毎日固定時刻」は recurring スケジュールであり cron 式の本来用途。次回発火時刻の算出・タイムゾーン・月/年境界は node-cron が内部処理する。
- タスクが例外を投げても次回発火は継続する（再登録漏れで recurring が静かに停止する失敗モードがない）。
- インメモリ管理のため、Bot 停止中に跨いだ時刻の実行はスキップされる（再起動後の次回発火から再開）。後述の警告ゲートにより、ダウンタイムで警告ウィンドウを跨いでも無警告キックは起きない。
- 多重実行防止: 前回実行が長引いた場合の重複起動を避けるため node-cron v4 の `noOverlap` 等を用いる。

### 非アクティブ日数の算出（起算基準）

- **実効最終活動時刻** `effectiveLastActivity = max(lastActivityAt ?? joinedAt, enabledAt)`
  - `MemberActivity` レコードがあればその `lastActivityAt`、なければ `joinedAt` を用いる
  - さらに `enabledAt`（機能を有効化した時刻）を下限とする。これにより、**有効化前から長期間在籍していたメンバーでも、起算は有効化時点から**となり、有効化直後に即キックされない
- `inactiveDays = now - effectiveLastActivity`（日数）

### 動作フロー

1. 機能が有効な全ギルドを取得
2. ギルドごとに設定をバリデーション
   - 通知チャンネル未設定 / 削除済み、`thresholdDays` 範囲外 → **`enabled = false` に自動無効化** + ログ（§9 と統一）
3. ギルドメンバーを取得し、除外対象を除いて `inactiveDays` を算出（上記「起算基準」）
   - 除外対象（ホワイトリスト等）と判定したメンバーに `warnStage > 0` または対象ロール付与済みのものがあれば、**再活動と同じ扱いで `warnStage = 0` にリセットし対象ロールを剥奪する**（除外＝猶予リセット）。これにより、警告済みメンバーをホワイトリストへ追加 → 後に解除した場合でも、最初の 1 週間前通知からやり直しとなり無警告キックを防ぐ。対象ロールの貼りっぱなしも防止
4. メンバーを段階判定（しきい値 `T` = `thresholdDays`・`daysLeft = max(0, T - inactiveDays)`）
   - `inactiveDays >= T` かつ `warnStage == 2` → **キック対象**
   - `inactiveDays >= T - 3` かつ `warnStage < 2` → **最終警告（3日前相当）対象**（この回はキックしない＝警告ゲート。`warnStage` は送信成功後に 2 へ前進）
   - `T - 7 <= inactiveDays < T - 3` かつ `warnStage < 1` → **1 週間前通知対象**（`warnStage` は送信成功後に 1 へ前進）
5. 「対象ロール」設定時、警告対象（`inactiveDays >= T - 7`）に入ったメンバーへ対象ロールを付与（付与済みなら何もしない）
6. 段階ごとに通知をチャンネルへ送信（後述「通知 UI」）。本文で対象ロールをメンション可能。**通知の送信が成功した場合にのみ対応する `warnStage` を永続化する**（送信失敗時は据え置き、次回再試行＝キックされない。H1: 送信失敗による無警告キックを防止）
7. キック対象を処理（**表示名はキック前に控える**: 退出後はメンションが解決されないため `userName`/タグを保持して通知に使う）
   - **通常時（`env.TEST_MODE` が false / 未設定）**: メンバーをキック → 控えた表示名でキック通知を送信 → `MemberActivity` を削除（キックで発火する `guildMemberRemove` でも掃除されるため冪等）
   - **テストモード（`env.TEST_MODE === true`）**: キックせず、「キック対象だった」旨のみ通知 / ログ（全ギルド一括・運用者向け）
   - キック・対象ロール操作は**レート制限（429）を考慮し逐次＋バックオフ**で実行する（しきい値引き下げ等で大量発生し得るため。H2）
8. ログに記録

> **per-guild エラー隔離**: ギルドごとの処理は try/catch で隔離し、1 ギルドの例外で日次ジョブ全体が止まらないようにする。

> **警告ゲートの効果**: キックは必ず `warnStage == 2`（最終警告済み）を経た次回以降の実行でのみ発生する。しきい値を超えていても最終警告未送信なら、その回は最終警告を送って `warnStage = 2` にするだけでキックは行わない。これにより「有効化直後」「ダウンタイムで警告ウィンドウを跨いだ」いずれの場合も、最低 1 回の最終警告を経てからキックされることが保証される（最終警告とキックの間は最短 1 日）。

**ビジネスルール（除外条件）:**

| 除外対象 | 判定 |
| --- | --- |
| Bot | `member.user.bot` |
| 管理者 | `Administrator` 権限保持 |
| ホワイトリスト（ロール） | `whitelistRoleIds` のいずれかを保持 |
| ホワイトリスト（ユーザー） | `whitelistUserIds` に含まれる |
| サーバーオーナー | `guild.ownerId` |
| VC 接続中 | 現在いずれかの VC に接続中（`member.voice.channelId != null`）→ 活動中とみなし対象外。step3 の猶予クリア（`warnStage` リセット・対象ロール剥奪）も適用（H3: 長時間 VC 滞在の誤キック防止） |
| Bot より上位ロール / キック不可 | キック不能 → **スキップ + ログ**（除外設定ではなく実行時ハンドリング） |

| エラー | 対応 |
| --- | --- |
| 通知チャンネル削除 | キック処理を中止し `enabled = false`、ログ記録 |
| Bot 権限不足（KickMembers なし） | キックをスキップ、エラーチャンネルへ通知 |
| 個別キック失敗 | 当該メンバーをスキップ、ログ記録、処理は継続 |
| 対象ロール付与/剥奪失敗（権限・階層） | ロール操作をスキップ、ログ記録、通知・キックは継続 |
| メンバー取得失敗 | 当該ギルドをスキップ、ログ記録 |

### 通知 UI（本文可変・Embed 固定）

member-log の流儀に揃え、**カスタムメッセージはメッセージ本文（content）として送信**し、Embed は対象メンバー一覧などの**固定構成**とする（カスタム文を Embed の説明に入れない）。通知と preview は**共通のページネーター**（Embed ページ + 前へ/次へボタン）を用いる。

- 事前通知はカスタム文（未設定時は段階別デフォルト文）が本文。キック通知のみデフォルト文を持たず、未設定時は本文なし（Embed のみ）。`{markerRole}` は事前通知の**本文に含めたときだけ**ロールメンションに展開され、対象ロール保持者へ通知が飛ぶ（自動でメンションはしない）。デフォルト文には `{markerRole}` を含めないため、既定ではメンションされない（対象者個別への通知は飛ばない）。
- 1 Embed に収まる件数（Discord 制約: 25 件/ページ・1 フィールド 1024 文字・合計 6000 文字）ならボタンなしの単一 Embed。超過時のみページング。
- **preview**: ephemeral + 60 秒のインメモリコレクター。
- **チャンネル通知**: public メッセージ + インメモリコレクター（既定: 1 時間）。スナップショットの永続化は行わない。Bot 再起動でコレクターは失効し、以降のボタン押下は ephemeral で「有効期限切れ」を返す。
- ページングボタンの customId は再生成 ID を埋めず、`messageId` 等の安定キーで解決する（[feedback_no_regenerated_id_in_customid] 準拠）。

**事前通知（1 週間前 / 最終警告）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | ⏰ 非アクティブメンバーの自動キック予告 |
| カラー | 黄系（警告） |
| 本文（content） | カスタム事前通知メッセージ（1週間前=`weekWarnMessage` / 最終警告=`finalWarnMessage`・未設定時は段階別デフォルト文）。変数: `{count}` / `{daysLeft}` / `{thresholdDays}` / `{serverName}` / `{markerRole}`（本文に含めたときのみメンション・対象ロール設定時） |
| フィールド: 対象メンバー | `<@userId>` の一覧（多数時はページング） |
| フィールド: キック予定 | 「あと {daysLeft} 日」（0 の場合は「まもなく」） |
| フッター | なし（タイムスタンプのみ） |

**キック通知（当日）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | 👋 非アクティブメンバーを自動キックしました |
| カラー | 茜色（`#b7282d`） |
| 本文（content） | カスタム `kickMessage`が設定されているときのみ表示。**未設定時は本文なし（Embed のみ）**＝事前通知と異なりデフォルト文は持たない。変数: `{count}` / `{thresholdDays}` / `{serverName}` |
| フィールド: キックしたメンバー | **キック前に控えた** `userName`/タグの一覧（退出後はメンション `<@userId>` が解決されないため・H4） |
| フィールド: テストモード | `TEST_MODE` 時は「（テストモード: 実際にはキックしていません）」を表示 |

---

## /inactive-kick-settings preview

### コマンド定義

**コマンド**: `/inactive-kick-settings preview`

**実行権限**: ManageGuild

**コマンドオプション:** なし

### 動作フロー

1. 現時点のキック対象・段階通知対象を算出（日次チェックと同じ判定ロジックを共有）
2. 一覧を ephemeral で表示（共通ページネーター・60 秒コレクター）

### UI

**Embed:** 段階別にメンバーと非アクティブ日数を表示。対象 0 件なら「対象なし」。区分は日次チェックの警告ゲートと**同一定義**（H5）:

- キック対象 = `inactiveDays >= T` かつ `warnStage == 2`
- 最終警告 = `inactiveDays >= T - 3` かつ `warnStage < 2`
- 1 週間前 = `T - 7 <= inactiveDays < T - 3` かつ `warnStage < 1`

preview は read-only で `warnStage`・対象ロール・通知を一切変更しない。

---

## /inactive-kick-settings set-channel

**コマンド**: `/inactive-kick-settings set-channel`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ✅ | 通知を送信するテキストチャンネル |

**動作フロー:** Bot 権限チェック（ViewChannel/SendMessages/EmbedLinks）→ 保存 → ephemeral 完了応答。

---

## /inactive-kick-settings set-threshold

**コマンド**: `/inactive-kick-settings set-threshold`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `days` | Integer（14〜365） | ✅ | 非アクティブと判定するまでの日数 |

**ビジネスルール:** 範囲外はエラー。下限 14 日は、段階通知（7 日前・3 日前）が成立するための最小値（§9 の `graceDays` 1〜30 とは別物のため範囲も別建て）。デフォルト 30 日。

---

## /inactive-kick-settings set-week-warn-message / clear-week-warn-message / set-final-warn-message / clear-final-warn-message

**コマンド**: 1週間前通知用 `set-week-warn-message`（モーダル入力） / `clear-week-warn-message`、最終警告用 `set-final-warn-message`（モーダル入力） / `clear-final-warn-message`。段階ごとに別々のカスタム文を保持し、未設定の段階は段階別デフォルト文（`default.week_warn_message` / `default.final_warn_message`）を使う。

**モーダル:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `inactive-kick-settings:week-warn-message-modal-input` | 1週間前通知メッセージ | Paragraph | ✅ | 最大 500 文字 |
| `inactive-kick-settings:final-warn-message-modal-input` | 最終警告メッセージ | Paragraph | ✅ | 最大 500 文字 |

使用可能なプレースホルダー（両段階共通）: `{count}` / `{daysLeft}` / `{thresholdDays}` / `{serverName}` / `{markerRole}`（対象ロール設定時のみ）

---

## /inactive-kick-settings set-kick-message / clear-kick-message

**コマンド**: `/inactive-kick-settings set-kick-message`（モーダル入力） / `clear-kick-message`

**モーダル:** `inactive-kick-settings:kick-message-modal-input`（Paragraph・最大 500 文字）

使用可能なプレースホルダー: `{count}` / `{thresholdDays}` / `{serverName}`

**ビジネスルール:** キック通知はデフォルト文を持たない。`kickMessage` 未設定（または `clear-kick-message` で削除）なら、キック通知は**本文なし＝固定 Embed のみ**で送信される（「キックメッセージを何も表示しない」運用が可能）。

---

## /inactive-kick-settings set-marker-role / clear-marker-role

**コマンド**: `/inactive-kick-settings set-marker-role` / `clear-marker-role`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `role` | Role | ✅（set のみ） | 警告対象へ自動付与する対象ロール |

**動作フロー（set）:** Bot 権限チェック（`ManageRoles` + 対象ロールが Bot 最上位ロールより下位か）→ 保存 → ephemeral 完了応答。

**ビジネスルール:**

- 設定すると、日次チェックが警告対象（`inactiveDays >= T - 7`）に入ったメンバーへ対象ロールを付与し、再活動・キックで外れる。通知本文の `{markerRole}` でメンションできる。
- 対象ロールが Bot 最上位以上の場合は付与不能のため設定を拒否。
- `clear-marker-role` は対象ロール連携を解除するのみ。**既存に付与済みのロールは一括剥奪しない**（誤操作リスク回避のため。必要なら手動 or Discord 側で削除）。

---

> **dry-run はコマンドではなく env で制御**: 運用者が挙動を確認するためのグローバルスイッチであり、ギルド単位のエンドユーザー設定ではない。既存の `TEST_MODE`（`src/shared/config/env.ts` で定義済み）を流用し、`TEST_MODE=true` の間は日次チェックが全ギルドでキックを実行せず通知・ログのみを出す。
>
> NOTE: `TEST_MODE` は bump-reminder も使用しており（遅延短縮 120 分 → 1 分・[bumpReminderConstants.ts](../../src/features/bump-reminder/constants/bumpReminderConstants.ts)）、有効化すると bump 側の挙動も同時に変わる。dry-run 検証は基本的にテスト環境（`NODE_ENV=development`）で行うため両立に問題はなく、専用フラグは設けない。

---

## /inactive-kick-settings whitelist add / remove / list

**コマンド**: サブコマンドグループ `whitelist`

| サブコマンド | オプション | 説明 |
| --- | --- | --- |
| `whitelist add` | `role`（Role・任意）/ `user`（User・任意） | ホワイトリストにロール or ユーザーを追加 |
| `whitelist remove` | なし | 登録済み項目をセレクトメニュー（複数選択）で選んで一括削除 |
| `whitelist list` | なし | 現在のホワイトリストを表示 |

**ビジネスルール:** `add` は `role` / `user` のいずれか必須・重複追加は冪等。`remove` は登録済みのロール／ユーザーを StringSelectMenu（min 1・max=件数・最大 25）に列挙し、選択時に `removeFromWhitelist` で一括削除する（ephemeral・選択即削除）。空なら「除外リストは空です」。

---

## /inactive-kick-settings enable / disable

**enable 動作フロー:** 通知チャンネル設定済みかチェック（未設定はエラー）→ 有効化 → `enabledAt` を現在時刻に設定（再有効化でも更新し、キック起算をリセット）→ ephemeral 完了応答。

**disable 動作フロー:** 無効化 → ephemeral 完了応答。

---

## /inactive-kick-settings view

現在の設定（状態・通知チャンネル・しきい値・有効化日時・対象ロール・カスタムメッセージ有無・ホワイトリスト件数）を ephemeral で表示。加えて、運用上の参考としてグローバルのテストモード（`env.TEST_MODE`）状態も読み取り専用で併記する。

---

## /inactive-kick-settings reset

**動作フロー:** `createWarningEmbed` で確認ダイアログ（ephemeral）→ 「リセットする」でデフォルトに戻す → 完了メッセージに `update()`。「キャンセル」/ 60 秒タイムアウトでキャンセル。

**デフォルト状態:** `enabled: false` / `channelId: null` / `thresholdDays: 30` / `weekWarnMessage: null` / `finalWarnMessage: null` / `kickMessage: null` / `markerRoleId: null` / `whitelistRoleIds: []` / `whitelistUserIds: []` / `enabledAt: null`。設定が無くても成功扱い（冪等）。`MemberActivity` は reset では削除しない（活動履歴は設定リセットと独立。再有効化時に活かせる）。

---

## データモデル

### GuildInactiveKickSettings

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルド ID（主キー・`@map("guild_id")`） |
| `enabled` | Boolean | 機能の有効/無効（デフォルト: false） |
| `enabledAt` | DateTime? | 最後に有効化した時刻（キック起算の下限・未有効化時 null） |
| `channelId` | String? | 通知チャンネル ID |
| `thresholdDays` | Int | 非アクティブ判定日数（デフォルト: 30） |
| `weekWarnMessage` | String? | カスタム事前通知メッセージ（1週間前・`@map("week_warn_message")`） |
| `finalWarnMessage` | String? | カスタム事前通知メッセージ（最終警告・`@map("final_warn_message")`） |
| `kickMessage` | String? | カスタムキック通知メッセージ |
| `markerRoleId` | String? | 警告対象へ自動付与する対象ロール ID（通知メンション用・未設定時 null） |
| `whitelistRoleIds` | Json | jsonb: string[]（除外ロール・デフォルト `[]`） |
| `whitelistUserIds` | Json | jsonb: string[]（除外ユーザー・デフォルト `[]`） |

`@@map("guild_inactive_kick_settings")`

### MemberActivity

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | String | cuid（主キー） |
| `guildId` | String | ギルド ID |
| `userId` | String | ユーザー ID |
| `lastActivityAt` | DateTime | 最終活動時刻 |
| `warnStage` | Int | 事前通知の進行段階（0=未通知, 1=1週間前済, 2=最終警告済・デフォルト 0） |

`@@unique([guildId, userId])` / `@@index([guildId])` / `@@map("member_activities")`

---

## 制約・制限事項

- カスタムメッセージの最大文字数: 各 500 文字
- アクティビティ記録は throttle により最大 1 時間の誤差を持つ
- キックは必ず最終警告（`warnStage == 2`）を経た次回以降に発生し、最終警告とキックの間は最短 1 日
- キック起算は `enabledAt` を下限とするため、有効化直後はどのメンバーも最短 `thresholdDays` 日が経過するまでキックされない
- 導入前の活動履歴は無いため、レコードなしのメンバーは `joinedAt`（ただし `enabledAt` で floor）起算
- Bot より上位ロール・オーナーはキック不可のためスキップ。自動除外は `Administrator` 権限保持者のみ
- 対象ロールの付与には Bot に `ManageRoles` 権限が必要、かつ対象ロールが Bot 最上位ロールより下位である必要がある。`clear-marker-role` は既存付与ロールを一括剥奪しない
- リアクション活動の記録には `GuildMessageReactions` Intent の追加が必要
- 日次チェックは 1 日 1 回のため、キック予定日の通知粒度は日単位（「あと N 日」は 0〜3 で揺れる）
- 大規模ギルドでは日次の `guild.members.fetch()` がレート制限の負荷になりうる（必要に応じてバッチ・間隔調整を検討）
- チャンネル通知のページングはインメモリコレクターのため、Bot 再起動後はボタンが失効する
- 大量のキック・対象ロール付与はレート制限（429）に当たるため、逐次処理＋バックオフで実行する
- しきい値変更は既存 `warnStage` をリセットしない。引き下げると 2 日以内に多数が（preview・最終警告を経て）キック対象化し得る点に注意
- `enabledAt` は再有効化のたびに更新（起算リセット）。disable→enable で全メンバーの起算が現在時刻に戻る（安全側だが、メンテ等での無効化→再有効化はキックを最短 `thresholdDays` 日先送りする）
- `Partials.Message` / `Partials.Reaction` の追加により、全ギルドのリアクションで partial イベントを受信するためイベント量が増える
- 除外判定は日次チェック実行時の設定スナップショットに基づくため、ある実行のキックループ直前（サブ秒）にホワイトリスト追加してもその回には反映されずキックされうる。実保護窓は「事前通知後〜翌日以降（≥1 日）」のため実用上は十分安全（穴2: 許容）

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/inactiveKick.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。コマンド定義 / ユーザーレスポンス / Embed / UI ラベル / ログの各カテゴリを member-log と同様に用意する（詳細キー表は実装時に確定）。プレースホルダーは member-log と同じ**単一波括弧** `{name}` 記法を用いる。

---

## テストケース

### ユニットテスト

- [x] 非アクティブ日数の算出（レコードあり / なし=joinedAt 起算 / `enabledAt` による floor）
- [x] 段階判定（1週間前 / 最終警告 / キック / warnStage による重複抑止 / 警告ゲート: `warnStage<2` はキックせず最終警告のみ）
- [x] 除外判定（Bot / Administrator / ホワイトリスト role・user / オーナー / VC 接続中）
- [x] 除外時の猶予クリア（warnStage>0 / 対象ロール付与済みの除外メンバーで warnStage=0 リセット＋ロール剥奪・VC 接続中も同様）
- [x] 対象ロールの付与・剥奪判定（警告対象入りで付与判定 / 再活動で剥奪 ※階層不足スキップは実装のみ）
- [x] 通知文の変数差し込み整形（warn / kick・単一波括弧）
- [x] throttle による更新スキップ・再活動での warnStage リセット
- [x] レコード掃除（キック時 / guildMemberRemove ※guildDelete 一括削除は実装のみ）
- [x] 設定コマンド各種（whitelist 冪等・enable で enabledAt 設定・reset・set-threshold 範囲オプション 等）

### インテグレーションテスト

- [x] messageCreate / voiceStateUpdate / messageReactionAdd でのアクティビティ記録
- [x] 日次チェック通し（`TEST_MODE=true`: キックせず通知のみ / 通常: キック実行）
- [x] 警告ゲート通し（しきい値超過でも初回は最終警告のみ → 次回キック）
- [x] 通知送信失敗時に `warnStage` を前進させない（H1: 次回再試行・キックしない）
- [x] キック前に表示名を控えて通知に使う（H4: 退出後もメンバー名が残る）
- [x] バリデーション失敗時の自動 `enabled=false`
- [x] 通知 Embed の整形・ページング（warn / kick・単一 Embed / 超過時ページ分割）
- [x] Bot 権限不足・キック不能メンバーのスキップ

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildInactiveKickSettings / MemberActivity リポジトリ | 設定・活動履歴の取得更新 |
| JobScheduler | 日次チェックの定期ジョブ（`addJob`・node-cron・`timezone` / `noOverlap` オプション）。既定 `0 4 * * *`（Asia/Tokyo） |
| env.TEST_MODE | dry-run（全ギルド一括・運用者向け）の制御。`src/shared/config/env.ts` に定義済み（bump-reminder と共用） |
| env.INACTIVE_KICK_CRON | 日次チェックの cron 式を上書き（dev/検証用・任意）。有効な cron 式のみ採用し、不正・未設定なら既定（04:00）にフォールバック。`resolveInactiveKickSchedule()` で解決 |
| GatewayIntentBits.GuildMessageReactions | リアクション記録（**client.ts に追加が必要**） |
| Partials.Message / Partials.Reaction | 未キャッシュメッセージへのリアクション取得 |
| date-fns | 非アクティブ日数・残日数の算出 |
| 共通ページネーター | preview / 通知のページング UI（既存のページング前例に倣う） |
| 共通 Embed ユーティリティ | `createSuccessEmbed` / `createWarningEmbed` 等 |

---

## 参考リソース

- [member-log 機能](MEMBER_LOG_SPEC.md)（本文可変・embed 固定・DB 保存・変数差し込みの流儀）
- [未承認ユーザー自動キック](UNVERIFIED_KICK_SPEC.md)（日次チェック / バリデーション / preview / `enabledAt` 起算下限の方式統一）
