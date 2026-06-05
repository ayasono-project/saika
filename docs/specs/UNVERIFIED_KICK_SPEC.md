# 未承認ユーザー自動キック機能 - 仕様書

> Unverified Kick - 参加から一定期間内に認証ロールを取得していないメンバーを、事前の警告（DM + チャンネル予告）を経て自動キックする機能

最終更新: 2026年6月5日

---

## 概要

サーバーに参加してから猶予日数（`graceDays`）内に「認証ロール」（`verifiedRoleId`）を取得していないメンバーを、日次の自動チェックで検出し、事前の警告（DM + チャンネル予告）を経て自動キックする機能です。多段階の認証フロー（規約同意 → プロフィール投稿 → モデレータ承認 → 一般ロール付与）のどこかで滞留したメンバーを、運用者の手動キックに頼らず自動整理することを目的とします。

判定は **単一条件**（参加経過日数・認証ロール未取得・Bot 以外・除外ロール非保持）で行い、認証フローの個別ステージ（プロフィール投稿履歴など）は追跡しません（設計判断は「参考リソース」の Notion 引き継ぎ §2.1 参照）。進行中タイマーは持たず、**1 日 1 回の cron + `guild.members.fetch()` + フィルタ**で完結します（中規模公開 Bot 規模まで十分）。per-member 状態は、サイレントキック防止のための軽量な**事前警告記録テーブル（`GuildUnverifiedKickWarn` = `warnedAt` のみ）**だけを持ちます（→「段階判定」）。

誤キック・事故防止のために以下を備えます。

- **トラッキング開始基準（`enabledAt`）**: キックの起算は「参加時刻」と「機能を有効化した時刻」の**新しい方**を下限とする。これにより、有効化前から猶予を超過して在籍していた未承認メンバーが、**有効化直後に警告なしで一斉キックされる事故を防ぐ**（[INACTIVE_KICK_SPEC.md](INACTIVE_KICK_SPEC.md) で確立した安全策を本機能にも適用。Notion 引き継ぎ〔2026-05-17・§8 実装前〕からの設計改善）。
- **事前警告（`warnDays`）と warn-before-kick ゲート**: キック予定の数日前に予告する。本人へは **DM**（大半のチャンネルが見えない未承認ユーザーに確実に届けるため）、サーバーへは **通知チャンネル**へ「キック予告」Embed を投稿（スタッフが事前に把握できるよう）。`warnDays` 設定時は、**通知猶予（`graceDays - warnDays` 日）を確保した警告を 1 回送ってからでないとキックしない**ことを保証する（`warnedAt` を `GuildUnverifiedKickWarn` に記録して判定）。これにより日次チェックが何日飛んでも、警告日を飛び越えたメンバーが警告なしにキックされる（サイレントキック）ことを防ぐ（→「段階判定」「制約・制限事項」）。
- **2 チャンネルの分離**: 「通知チャンネル（`notifyChannelId`）= キック予告（メンバー/スタッフ向け）」と「ログチャンネル（`logChannelId`）= キック実行・自動無効化の監査ログ」を**それぞれ独立して設定**できる。同一チャンネルを両方に指定しても、別々でも、片方だけでもよい（未設定なら当該通知をスキップ）。
- **対象ロール（`markerRoleId`）によるメンション通知**: 警告対象が確定した**通知直前**に対象者へ「対象ロール」を付与し、**認証ロールが付与されたら**（`guildMemberUpdate` 契機で）即時解除する。通知チャンネルのキック予告でこの対象ロールを**メンション**することで、DM が届かない / チャンネルが見える導線でも at-risk メンバーへ直接通知できる（未設定なら付与・メンションを行わない）。日次チェック時に「対象ロール保持だが既に認証済み / 除外済み」のメンバーからは剥奪し、貼りっぱなしを防ぐ（保険）。キック時は退出でロールごと消えるため明示解除は不要。
- **バリデーション**: 設定保存時・ジョブ実行時の両方で検証し、ジョブ実行時に失敗した場合は `enabled = false` に自動無効化 + ログ通知。
- **preview**: 現在のキック対象・警告対象を実行せず一覧表示（誤設定検知用・運用上必須）。
- **dry-run（env `TEST_MODE`）**: 運用者が実キックせず挙動を確認（全ギルド一括・運用者向け）。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| 日次キックチェック | 1 日 1 回、各ギルドの未承認メンバーを検出 → 事前警告（DM + チャンネル予告）/ キック実行 |
| 事前警告 | 参加から `warnDays` 日経過した未警告メンバーへ、本人へ DM・通知チャンネルへキック予告 Embed を送る（警告日を飛び越えても拾う・`warnDays` 未設定なら無効）。警告から通知猶予（`graceDays - warnDays` 日）が経過するまでキックしない |
| dry-run（テストモード） | env `TEST_MODE=true` の間は実キックせず DM・通知・ログのみ（運用者向け・全ギルド一括） |
| enable / disable | 機能の有効化・無効化 |
| set-verified-role | 認証ロール（これを持っていれば対象外）を設定 |
| set-grace-days | 参加からキックまでの猶予日数を設定 |
| set-warn-days / clear-warn-days | 事前警告を送る「参加からの経過日数」を設定・無効化 |
| set-notify-channel / clear-notify-channel | キック予告（メンバー/スタッフ向け）の送信チャンネルを設定・削除 |
| set-log-channel / clear-log-channel | キック実行・自動無効化の監査ログ（Embed）チャンネルを設定・削除 |
| set-marker-role / clear-marker-role | 警告対象へ自動付与する対象ロール（通知メンション用）を設定・削除 |
| set-dm-message / clear-dm-message | 警告 DM のカスタムメッセージを設定・削除 |
| set-notify-message / clear-notify-message | 通知チャンネルのキック予告カスタムメッセージを設定・削除 |
| exempt add / remove / list | キック除外ロールを管理 |
| preview | 現在のキック対象・警告対象の一覧を表示（ページング） |
| view | 現在の設定を表示 |
| reset | 確認ダイアログ付きで設定をリセット |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageGuild | 全サブコマンドの実行（設定管理・preview） |
| Bot | KickMembers | 未承認メンバーのキック |
| Bot | ManageRoles | 対象ロールの付与・剥奪（対象ロール設定時のみ） |
| Bot | ViewChannel, SendMessages, EmbedLinks | 通知チャンネル / ログチャンネルへの Embed 送信（各チャンネル設定時のみ） |
| Bot | GuildMembers（Intent） | メンバー一覧の取得（Server Members Intent・既に有効想定。**新規追加不要**） |

> 自動除外は **`Administrator` 権限保持者・サーバーオーナー・Bot のみ**。認証ロールを持つメンバーは定義上すべて対象外。それ以外で保護したいロールは除外ロール（exempt）に登録する。

---

## 日次キックチェック

### トリガー

**スケジュール**: 毎日 03:00（Asia/Tokyo）に 1 回実行（活動の少ない時間帯。[INACTIVE_KICK_SPEC.md](INACTIVE_KICK_SPEC.md) の 04:00 とは別ジョブ）。

**方式**: `jobScheduler.addJob`（node-cron・cron 式 `0 3 * * *`・`timezone: "Asia/Tokyo"`・`noOverlap`）による定期ジョブ。全ギルド共通の単一ジョブ（固定 jobId）を Bot 起動時（ready）に 1 件登録する。

- 「毎日固定時刻」は recurring スケジュールであり cron 式の本来用途。次回発火時刻・タイムゾーン・月/年境界は node-cron が内部処理する。
- タスクが例外を投げても次回発火は継続する。
- インメモリ管理のため、Bot 停止中に跨いだ時刻の実行はスキップされる（再起動後の次回発火から再開）。
- 多重実行防止に node-cron v4 の `noOverlap` を用いる。
- 検証用に env `UNVERIFIED_KICK_CRON` で cron 式を上書き可能（[INACTIVE_KICK_SPEC.md](INACTIVE_KICK_SPEC.md) の `INACTIVE_KICK_CRON` と同方式。有効な cron 式のみ採用し、不正・未設定なら既定〔03:00〕にフォールバック）。

### 経過日数の算出（起算基準）

- **実効参加時刻** `effectiveJoinedAt = max(joinedAt, enabledAt)`
  - メンバーの `joinedAt` を基準とし、さらに `enabledAt`（機能を有効化した時刻）を下限とする
  - これにより、**有効化前から長期在籍していた未承認メンバーでも、起算は有効化時点から**となり、有効化直後に即キックされない。有効化後はどのメンバーも最短 `graceDays` 日が経過するまでキックされず、その間に `warnDays` の警告 DM が自然に発火する
- `ageDays = differenceInDays(now, effectiveJoinedAt)`（date-fns・整数日）

### 段階判定

しきい値 `G` = `graceDays`、警告日 `W` = `warnDays`（null なら警告無効）、通知猶予 `N` = `G - W`（`W < G` 保証のため 1 以上）。`warnedDaysAgo` = 警告（`warnedAt`）からの経過日数（未警告なら null）。判定は認証ロール未取得（= 非除外）メンバーに対して行う。

**`warnDays` 未設定（警告無効）:**

- `ageDays >= G` → **キック対象**（従来どおり猶予到達で即キック）

**`warnDays` 設定時（warn-before-kick ゲート）:**

- `W <= ageDays < G` かつ **未警告** → **事前警告対象**（警告日を飛び越えてもウィンドウ内なら拾う）
- `ageDays >= G` かつ **未警告** → **事前警告対象**（警告日を飛び越えてキック期に到達 → いま警告して次サイクルへ繰り延べ）
- `ageDays >= G` かつ **警告済みで通知猶予を満たす**（`warnedDaysAgo >= N`） → **キック対象**
- `ageDays >= G` かつ **警告済みだが通知猶予が未経過**（`warnedDaysAgo < N`） → **待機**（再警告もキックもしない）
- 上記以外（`ageDays < W`、またはウィンドウ内で警告済み） → **対象外**

> **不変条件（サイレントキック防止）**: `warnDays` 設定時は「通知猶予 `N` 日を確保した警告を 1 回送ってからでないとキックしない」。旧仕様の「`ageDays == W` の日だけ警告」という点判定は、日次チェックが 1 回でも飛ぶと警告日を飛び越えて無警告キックが起きえたため、**`warnedAt`（`GuildUnverifiedKickWarn`）による状態判定**に置き換えた。警告日に達した未警告者を範囲で拾い、警告日を飛び越えてキック期に入った者もまず警告してから繰り延べる。
>
> **警告記録（`warnedAt`）のライフサイクル**: 警告送信時に記録し（DM 拒否でも記録・1 度だけ）、次のいずれかで失効削除する — 認証済み / 除外化、サーバー退出、`ageDays` が `W` 未満へ戻る起算リセット（再参加）、`warnDays` 無効化。機能の再有効化（`enable`）・`reset` では当該ギルドの記録を一括破棄してフレッシュスタートする。
>
> `enabledAt` 起算下限により**有効化直後の無警告一斉キックは防がれる**点は従来どおり（→「制約・制限事項」）。

### 動作フロー

1. 機能が有効な全ギルド（`GuildUnverifiedKickSettings WHERE enabled = true`）を取得
2. ギルドごとに設定をバリデーション（→「バリデーション」）。失敗時は **`enabled = false` に自動無効化** + ログ通知し、当該ギルドの処理を中止
3. `guild.members.fetch()` でメンバー一覧を取得し、除外対象を除いて `ageDays` を算出（上記「起算基準」）
4. メンバーを段階判定（上記「段階判定」）し、事前警告対象・キック対象に分類
5. **対象ロールの保険クリーンアップ**（`markerRoleId` 設定時）: 対象ロールを保持するが除外対象（認証済み / exempt / Administrator / オーナー）になっているメンバーから対象ロールを剥奪する（verify 以外で対象外になったケースの貼りっぱなし防止）
6. **事前警告**: 警告対象へ次を実行（`warnDays` が null なら本ステップ全体をスキップ）
   - **対象ロール付与**: `markerRoleId` 設定時、**通知投稿の直前**に警告対象へ対象ロールを付与（付与済みなら何もしない）。これにより直後のメンションが解決される
   - **DM 送信**: 各メンバーへ DM を送信（カスタム `dmTemplate`・未設定時はデフォルト文。変数差し込み）。DM 拒否・送信失敗は握りつぶしてスキップ（救済手段なし）
   - **通知チャンネルへキック予告**: `notifyChannelId` 設定時、警告対象一覧と残日数を「キック予告」Embed で投稿（→「通知 UI」）。`markerRoleId` 設定時は本文で対象ロールをメンション。未設定ならスキップ
   - **警告記録**: 警告対象を `warnedAt = 現在時刻` で `GuildUnverifiedKickWarn` に記録（DM 拒否でも記録・冪等）。以降のキック判定の起点になる
7. **キック実行**（ログには `<@userId>` のメンションを使う: ユーザーメンションは退出後もグローバルに解決されるため）
   - **通常時（`env.TEST_MODE` が false / 未設定）**: メンバーをキック（監査ログ `reason` を渡す）→ キックした userId をログ集計
   - **テストモード（`env.TEST_MODE === true`）**: キックせず、「キック対象だった」旨のみログ（全ギルド一括・運用者向け）
   - キックは**レート制限（429）を考慮し逐次 + バックオフ**で実行する（しきい値引き下げ等で大量発生し得るため）
8. `logChannelId` 設定時、キックサマリーを Embed で送信（→「ログ UI」）。バリデーション失敗時は自動無効化 Embed をログチャンネルへ送信
9. **警告記録の失効削除**: 認証済み / 除外化・サーバー退出・起算リセット（`ageDays < W`）・`warnDays` 無効化に該当する `warnedAt` 記録を削除する（→「段階判定」のライフサイクル）

> **per-guild エラー隔離**: ギルドごとの処理は try/catch で隔離し、1 ギルドの例外で日次ジョブ全体が止まらないようにする。

**ビジネスルール（除外条件）:**

| 除外対象 | 判定 |
| --- | --- |
| Bot | `member.user.bot` |
| 認証済み | `verifiedRoleId` を保持（= 対象外。本機能の主条件） |
| 管理者 | `Administrator` 権限保持 |
| サーバーオーナー | `guild.ownerId` |
| 除外ロール | `exemptRoleIds` のいずれかを保持 |
| Bot より上位ロール / キック不可 | キック不能 → **スキップ + ログ**（除外設定ではなく実行時ハンドリング） |

| エラー | 対応 |
| --- | --- |
| 認証ロール削除済み / Bot 権限不足 / ログチャンネル削除 | バリデーションで検出 → `enabled = false`、ログ記録（ログチャンネル自体が無効なら諦める） |
| 個別キック失敗 | 当該メンバーをスキップ、ログ記録、処理は継続 |
| 個別 DM 失敗（受信拒否等） | 握りつぶしてスキップ（仕様） |
| 対象ロール付与/剥奪失敗（権限・階層） | ロール操作をスキップ、ログ記録、通知・キックは継続 |
| メンバー取得失敗 | 当該ギルドをスキップ、ログ記録 |

### バリデーション

設定保存時とジョブ実行時の両方で検証する。

| 検証項目 | 失敗時（保存時） | 失敗時（ジョブ実行時） |
| --- | --- | --- |
| `verifiedRoleId` がギルドに存在 | enable を拒否（エラー応答） | `enabled = false` + ログ |
| Bot に `KickMembers` 権限 | enable を拒否 | `enabled = false` + ログ |
| `notifyChannelId` が存在し Bot が書き込み可（設定時のみ） | set-notify-channel を拒否 | キック予告送信をスキップ（DM・キックは継続） |
| `logChannelId` が存在し Bot が書き込み可（設定時のみ） | set-log-channel を拒否 | ログ送信をスキップ（キック自体は継続） |
| `markerRoleId` が存在し Bot 最上位ロールより下位（設定時のみ） | set-marker-role を拒否 | 付与/剥奪をスキップ（DM・通知・キックは継続） |
| `graceDays` が範囲内（1〜30） | set-grace-days を拒否 | `enabled = false` + ログ |
| `warnDays` が範囲内（1 以上かつ `< graceDays`） | set-warn-days を拒否 | 事前警告のみスキップ（キックは継続） |

> 個別メンバーのキック可否（Bot ロールが対象メンバーの最上位ロールより上か）は、ロール構成がメンバーごとに異なるため**ジョブ実行時にメンバー単位で判定**し、不能なら当該メンバーをスキップ + ログ（ギルド全体の無効化はしない）。

### 警告 DM（本文のみ・カスタム可能）

- 参加から `warnDays` 日経過した時点（= キックの `graceDays - warnDays` 日前）に、対象メンバーへ **DM** を送信する（本人向け予告）
- 本文は `dmTemplate`（カスタム文・未設定時はデフォルト文）。変数差し込み（単一波括弧）: `{serverName}` / `{graceDays}` / `{warnDays}` / `{remainingDays}`（= `graceDays - ageDays`）
- 認証/プロフィールチャンネルへの導線は**運用者がテンプレ本文に自由記述**する（専用設定は持たない。デフォルト文には汎用的な案内のみ・チャンネルリンクは含めない）
- DM はプレーンテキスト（Embed なし）で送信する。DM を受信拒否しているユーザーには届かないが、握りつぶす（救済手段なし・仕様）

**デフォルト文（`default.dm_message`・例）:**

> 「{serverName} では、参加から {graceDays} 日以内に認証を完了する必要があります。現在まだ認証が完了していないため、このままだと約 {remainingDays} 日後に自動的にサーバーから退出処理されます。サーバー内の案内に従って認証を完了してください。」

### 通知 UI（キック予告・通知チャンネル）

`notifyChannelId` 設定時のみ、事前警告の発火時（警告対象が確定したとき）に「キック予告」を**通知チャンネル**へ投稿する（スタッフ/メンバーが事前に把握するため）。DM が本人向け、これがサーバー向けで、両者は同時刻に発火する。member-log 流儀で**本文（content）はカスタム可変・Embed は固定構成**。

| 項目 | 内容 |
| --- | --- |
| 本文（content） | カスタムキック予告メッセージ（`notifyTemplate`・未設定時はデフォルト文）。変数: `{count}` / `{serverName}` / `{graceDays}` / `{warnDays}` / `{remainingDays}` / `{markerRole}`。`{markerRole}` を本文に含めたときだけ対象ロールをメンション（直前に付与済みのため at-risk メンバーへ通知が飛ぶ・デフォルト文には含める） |
| タイトル | ⏰ 未承認メンバーの自動キック予告 |
| カラー | 黄系（警告） |
| フィールド: 対象メンバー | `<@userId>`（参加から `{ageDays}` 日経過 / 残り `{remainingDays}` 日）の一覧（多数時はページング） |
| フィールド: キック予定 | 「あと {remainingDays} 日」（0 の場合は「まもなく」） |
| フッター | なし（タイムスタンプのみ） |

- **チャンネル投稿**: public メッセージ + インメモリコレクター（既定: 1 時間）。Bot 再起動でコレクターは失効し、以降のボタン押下は ephemeral で「有効期限切れ」を返す。
- ページングボタンの customId は再生成 ID を埋めず `messageId` 等の安定キーで解決する（[feedback_no_regenerated_id_in_customid] 準拠）。
- 対象ロールメンションは、メンションが解決されるよう**付与（step 6 の対象ロール付与）の後に投稿**する。`allowedMentions` で対象ロールのみ許可する（`{markerRole}` を本文に含めない設定なら誰もメンションしない）。

### ログ UI（監査・ログチャンネル）

`logChannelId` 設定時のみ、キック実行結果・自動無効化を Embed で送信する（[VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) / `formatActionLog` の判定原則に準拠）。通知 UI と共通のページネーター（Embed ページ + 前へ/次へボタン）を用い、1 Embed に収まる件数（25 件/ページ・1 フィールド 1024 文字・合計 6000 文字）ならボタンなし。

**キックサマリー:**

| 項目 | 内容 |
| --- | --- |
| タイトル | 👢 未承認メンバーを自動キックしました |
| カラー | 茜色（`#b7282d`） |
| 説明（description） | 認証ロールのメンション `<@&verifiedRoleId>`（Embed のフィールド名ではメンションがリンク化されないため description に出す。Embed 内メンションは ping を飛ばさない） |
| フィールド: キックしたメンバー | `<@userId>` のメンション一覧（ユーザーメンションは退出後もグローバルに解決され @ユーザー名表示になるため。Embed 内なので ping は飛ばない） |
| フィールド: テストモード | `TEST_MODE` 時は「（テストモード: 実際にはキックしていません）」を表示 |

**バリデーションエラー（自動無効化）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | ⚠️ 未承認ユーザー自動キックを無効化しました |
| カラー | 茜色 |
| 説明 | エラー詳細（例: 認証ロールが削除されています / Bot に KickMembers 権限がありません） |

> **監査ログ reason**: キック時に Discord 標準の監査ログへ `reason` を渡す（例: `Auto-kick: not verified within {graceDays} days`）。
>
> **通知 / ログの分離と共用**: `notifyChannelId` と `logChannelId` は独立した設定。同一チャンネルを両方に指定した場合、そのチャンネルにキック予告（warn 時）とキックサマリー（kick 時）の両方が時系列で流れる。一方のみ設定すれば該当通知だけが送られる（両方未設定なら DM のみ）。

---

## 対象ロールの自動解除（認証完了時）

### トリガー

**イベント**: `guildMemberUpdate`

**発火条件:**

- 機能が有効で `markerRoleId` が設定済み
- 当該メンバーが**今回の更新で認証ロール（`verifiedRoleId`）を新たに取得**した（旧ロールに無く新ロールに有る）
- 当該メンバーが対象ロール（`markerRoleId`）を保持している

### 動作フロー

1. ギルド設定を取得（無効 / `markerRoleId` 未設定なら何もしない）
2. 認証ロールを新規取得し、かつ対象ロールを保持しているメンバーから**対象ロールを剥奪**（保持していなければ何もしない＝ホットパスでの不要な API 呼び出しを避ける）
3. 剥奪失敗（権限・階層）はログ記録してスキップ

**ビジネスルール:**

- これが対象ロール解除の**主経路**（認証完了 = 対象外確定で即時にメンション対象から外す）。日次チェックの保険クリーンアップ（除外済み/認証済みの貼りっぱなし剥奪）は補助。
- キックされたメンバーは退出により対象ロールごと消えるため、本ハンドラの対象外。

---

## /unverified-kick-settings preview

### コマンド定義

**コマンド**: `/unverified-kick-settings preview`

**実行権限**: ManageGuild

**コマンドオプション:** なし

### 動作フロー

1. 現時点のキック対象・事前警告対象を算出（日次チェックと同じ判定ロジックを共有）
2. 一覧を ephemeral で表示（共通ページネーター・60 秒コレクター）

### UI

**Embed:** 区分別にメンバーと経過日数を表示。対象 0 件なら「対象なし」。区分は日次チェックと**同一定義**（`warnedAt` 記録も読み込んで判定する。→「段階判定」）:

- キック対象 = `ageDays >= G` かつ（`warnDays` 無効、または警告済みで通知猶予 `N` を満たす）
- 事前警告対象 = `warnDays != null` かつ 認証ロール未取得で、`ageDays >= W` の未警告者（飛び越え・繰り延べ含む）

preview は read-only で設定・DM・通知・キック・警告記録の書き込みを一切実行しない。

---

## /unverified-kick-settings set-verified-role

**コマンド**: `/unverified-kick-settings set-verified-role`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `role` | Role | ✅ | これを保持していればキック対象外となる認証ロール |

**動作フロー:** ロールがギルドに存在するか確認 → 保存 → ephemeral 完了応答。

---

## /unverified-kick-settings set-grace-days

**コマンド**: `/unverified-kick-settings set-grace-days`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `days` | Integer（1〜30） | ✅ | 参加からキックまでの猶予日数 |

**ビジネスルール:** 範囲外はエラー。デフォルト 7 日。`warnDays >= graceDays` となる変更は、警告がキックより後に来て無意味なため拒否（先に `warnDays` を下げるか `clear-warn-days` を案内）。下限 1 は Notion 引き継ぎ §3.3 の濫用対策（極端な値を弾く）。

---

## /unverified-kick-settings set-warn-days / clear-warn-days

**コマンド**: `set-warn-days`（警告 DM を有効化・日数指定） / `clear-warn-days`（警告 DM を無効化）

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `days` | Integer（1 以上かつ `< graceDays`） | ✅（set のみ） | 参加から何日経過した時点で警告 DM を送るか |

**ビジネスルール:** `warnDays` が `graceDays` 以上はエラー（警告がキック以降になる）。`clear-warn-days` は `warnDays = null` にして警告 DM を無効化（冪等）。デフォルトは null（未設定 = 警告 DM 無効）。推奨値は `graceDays - 2`（Notion 引き継ぎ §1.8）。

---

## /unverified-kick-settings set-notify-channel / clear-notify-channel

**コマンド**: `set-notify-channel` / `clear-notify-channel`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ✅（set のみ） | キック予告（メンバー/スタッフ向け）を投稿するチャンネル |

**動作フロー（set）:** Bot 権限チェック（ViewChannel/SendMessages/EmbedLinks）→ 保存 → ephemeral 完了応答。`clear-notify-channel` は `notifyChannelId = null`（キック予告の投稿を無効化・DM とキックは継続）。ログチャンネルと同一チャンネルを指定してもよい。

---

## /unverified-kick-settings set-log-channel / clear-log-channel

**コマンド**: `set-log-channel` / `clear-log-channel`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ✅（set のみ） | キック実行・自動無効化の監査ログ（Embed）を送信するチャンネル |

**動作フロー（set）:** Bot 権限チェック（ViewChannel/SendMessages/EmbedLinks）→ 保存 → ephemeral 完了応答。`clear-log-channel` は `logChannelId = null`（ログ送信を無効化・キックは継続）。通知チャンネルと同一チャンネルを指定してもよい。

---

## /unverified-kick-settings set-marker-role / clear-marker-role

**コマンド**: `set-marker-role` / `clear-marker-role`

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `role` | Role | ✅（set のみ） | 警告対象へ自動付与する対象ロール（通知メンション用） |

**動作フロー（set）:** Bot 権限チェック（`ManageRoles` + 対象ロールが Bot 最上位ロールより下位か）→ 保存 → ephemeral 完了応答。

**ビジネスルール:**

- 設定すると、日次チェックが警告対象の確定後・通知投稿の直前に対象ロールを付与し、メンバーが**認証ロールを取得した時点**（`guildMemberUpdate`）で剥奪する。通知本文で `<@&markerRoleId>` としてメンションされる。
- 対象ロールが Bot 最上位以上の場合は付与不能のため設定を拒否。
- `clear-marker-role` は対象ロール連携を解除するのみ。**既存に付与済みのロールは一括剥奪しない**（誤操作リスク回避のため。必要なら手動 or Discord 側で削除）。

---

## /unverified-kick-settings set-dm-message / clear-dm-message

**コマンド**: `set-dm-message`（モーダル入力） / `clear-dm-message`

**モーダル:** `unverified-kick-settings:dm-message-modal-input`（Paragraph・最大 500 文字）

使用可能なプレースホルダー: `{serverName}` / `{graceDays}` / `{warnDays}` / `{remainingDays}`

**ビジネスルール:** `dmTemplate` 未設定（または `clear-dm-message`）ならデフォルト文を使う。認証/プロフィールチャンネルへの導線が必要なら運用者が本文に直書きする。

---

## /unverified-kick-settings set-notify-message / clear-notify-message

**コマンド**: `set-notify-message`（モーダル入力） / `clear-notify-message`

**モーダル:** `unverified-kick-settings:notify-message-modal-input`（Paragraph・最大 500 文字）

使用可能なプレースホルダー: `{count}` / `{serverName}` / `{graceDays}` / `{warnDays}` / `{remainingDays}` / `{markerRole}`

**ビジネスルール:** `notifyTemplate` 未設定（または `clear-notify-message`）ならデフォルト文を使う。通知チャンネルのキック予告の**本文**になり、Embed（対象一覧・キック予定）は固定。`{markerRole}` を本文に含めたときだけ対象ロールをメンションする（§8 と同じ挙動）。

---

## /unverified-kick-settings exempt add / remove / list

**コマンド**: サブコマンドグループ `exempt`

| サブコマンド | オプション | 説明 |
| --- | --- | --- |
| `exempt add` | `role`（Role・必須） | 除外ロールを追加 |
| `exempt remove` | なし | 登録済みロールをセレクトメニュー（複数選択）で選んで一括削除 |
| `exempt list` | なし | 現在の除外ロールを表示 |

**ビジネスルール:** `add` は重複追加は冪等。`remove` は登録済みロールを StringSelectMenu（min 1・max=件数・最大 25）に列挙し、選択時に一括削除する（ephemeral・選択即削除）。空なら「除外ロールは空です」。除外対象はロールのみ（ユーザー単位の除外は持たない。保護したいユーザーには認証ロール or 除外ロールを付与する運用）。

---

## /unverified-kick-settings enable / disable

**enable 動作フロー:** `verifiedRoleId` 設定済みかチェック（未設定はエラー）→ バリデーション（認証ロール存在・Bot の KickMembers 権限）→ 有効化 → `enabledAt` を現在時刻に設定（再有効化でも更新し、キック起算をリセット）→ ephemeral 完了応答。

**disable 動作フロー:** 無効化 → ephemeral 完了応答。

---

## /unverified-kick-settings view

現在の設定（状態・認証ロール・猶予日数・警告日数〔or 無効〕・通知チャンネル・ログチャンネル・対象ロール・有効化日時・カスタム DM・カスタムキック予告・除外ロール件数）を ephemeral で表示。加えて、運用上の参考としてグローバルのテストモード（`env.TEST_MODE`）状態も読み取り専用で併記する。

---

## /unverified-kick-settings reset

**動作フロー:** `createWarningEmbed` で確認ダイアログ（ephemeral）→ 「リセットする」でデフォルトに戻す → 完了メッセージに `update()`。「キャンセル」/ 60 秒タイムアウトでキャンセル。

**デフォルト状態:** `enabled: false` / `verifiedRoleId: null` / `graceDays: 7` / `warnDays: null` / `notifyChannelId: null` / `logChannelId: null` / `markerRoleId: null` / `dmTemplate: null` / `notifyTemplate: null` / `exemptRoleIds: []` / `enabledAt: null`。設定が無くても成功扱い（冪等）。`reset` は既に付与済みの対象ロールを一括剥奪しない（`clear-marker-role` と同じ方針）。

---

## データモデル

### GuildUnverifiedKickSettings

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルド ID（主キー・`@map("guild_id")`） |
| `enabled` | Boolean | 機能の有効/無効（デフォルト: false） |
| `enabledAt` | DateTime? | 最後に有効化した時刻（キック起算の下限・未有効化時 null・`@map("enabled_at")`） |
| `verifiedRoleId` | String? | 認証ロール ID（これを保持していれば対象外・未設定時 null・`@map("verified_role_id")`） |
| `graceDays` | Int | 参加からキックまでの猶予日数（デフォルト: 7・`@map("grace_days")`） |
| `warnDays` | Int? | 事前警告を送る参加経過日数（null = 警告無効・`@map("warn_days")`） |
| `notifyChannelId` | String? | キック予告（メンバー/スタッフ向け）チャンネル ID（`@map("notify_channel_id")`） |
| `logChannelId` | String? | キック実行・自動無効化の監査ログ（Embed）チャンネル ID（`@map("log_channel_id")`） |
| `markerRoleId` | String? | 警告対象へ自動付与する対象ロール ID（通知メンション用・未設定時 null・`@map("marker_role_id")`） |
| `dmTemplate` | String? | カスタム警告 DM 本文（null = デフォルト文・`@map("dm_template")`） |
| `notifyTemplate` | String? | カスタムキック予告本文（通知チャンネル・null = デフォルト文・`@map("notify_template")`） |
| `exemptRoleIds` | Json | jsonb: string[]（除外ロール・デフォルト `[]`・`@map("exempt_role_ids")`） |

`@@map("guild_unverified_kick_settings")`

### GuildUnverifiedKickWarn

事前警告のメンバー単位記録（サイレントキック防止用・warn-before-kick の状態）。`warnedAt` をもとに「警告済みか」「通知猶予が経過したか」を判定する。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルド ID（複合主キー・`@map("guild_id")`） |
| `userId` | String | ユーザー ID（複合主キー・`@map("user_id")`） |
| `warnedAt` | DateTime | 事前警告を送った時刻（`@map("warned_at")`） |

`@@id([guildId, userId])` / `@@index([guildId])` / `@@map("guild_unverified_kick_warns")`

> warnedAt は警告送信時に記録し、認証済み / 退出 / 起算リセット / `warnDays` 無効化で失効削除、`enable` / `reset` で当該ギルド分を一括破棄する（→「段階判定」のライフサイクル）。`graceDays` 等の進行中タイマーは持たず、状態は `warnedAt` のみ。`createdAt` / `updatedAt` は saika の他モデルに合わせて持たない。

---

## 制約・制限事項

- カスタム DM の最大文字数: 500 文字
- 判定は単一条件（参加経過日数 + 認証ロール未取得）のみ。認証フローの個別ステージ（プロフィール投稿履歴等）は追跡しない
- キック起算は `enabledAt` を下限とするため、有効化直後はどのメンバーも最短 `graceDays` 日が経過するまでキックされない
- `enabledAt` は再有効化のたびに更新（起算リセット）。disable→enable で全メンバーの起算が現在時刻に戻る（安全側だが、メンテ等での無効化→再有効化はキックを最短 `graceDays` 日先送りする）
- `warnDays` 設定時は **warn-before-kick ゲート**により、通知猶予（`graceDays - warnDays` 日）を確保した警告を 1 回送ってからでないとキックしない（`warnedAt` で判定）。日次チェックが飛んで警告日（`ageDays == W`）を跨いでも、未警告者はまず警告され、無警告キックは起きない。`enabledAt` 起算下限と併せて有効化直後の無警告一斉キックも防がれる
- ただし **DM を受信拒否しているユーザーには警告本文が届かない**（送信失敗は握りつぶす・仕様。通知チャンネル予告や対象ロールメンションが届けば把握はできるが、本人 DM の到達保証はない）。`warnedAt` は DM 到達可否にかかわらず記録するため、キック判定上は「警告済み」として通知猶予後にキックされる
- 日次チェックは 1 日 1 回のため、警告のタイミング・残日数は日単位（同一メンバーへの警告 DM はウィンドウ内で 1 回）
- Bot より上位ロール・オーナー・管理者はキック不可 / 対象外。自動除外は `Administrator`・オーナー・Bot・認証ロール保持者。それ以外の保護は除外ロールで行う
- 対象ロールの付与には Bot に `ManageRoles` 権限が必要、かつ対象ロールが Bot 最上位ロールより下位である必要がある。`clear-marker-role` / `reset` は既存付与ロールを一括剥奪しない
- 対象ロールの解除主経路は `guildMemberUpdate`（認証ロール取得時）。Bot 停止中に認証されたメンバーは、再起動後の次回日次チェックの保険クリーンアップで剥奪される（即時剥奪は取りこぼす）
- 対象ロールは付与（警告日）からキック/認証まで保持されるため、ある日に新規警告者が出てキック予告を投稿すると、本文の対象ロールメンションで**既存の at-risk メンバー（前日以前に警告済み）も再度 ping される**。再通知として許容する（個別ユーザーメンションではなくロールメンション方式の帰結）
- 大規模ギルドでは日次の `guild.members.fetch()` がレート制限の負荷になりうる（必要に応じてバッチ・間隔調整を検討）
- 大量のキックはレート制限（429）に当たるため、逐次処理 + バックオフで実行する
- `graceDays` 変更は既存メンバーの起算を変えない（`effectiveJoinedAt` は不変）。引き下げると翌日以降に多数が（preview・警告を経ず）キック対象化し得る点に注意
- 通知チャンネル / ログチャンネルのページングはインメモリコレクターのため、Bot 再起動後はボタンが失効する
- 通知チャンネルへのキック予告は `warnDays` 設定時のみ発火する（`warnDays` が null なら DM もチャンネル予告も出ず、`graceDays` 到達時にキックサマリーのみ）
- 濫用対策として `graceDays` 1〜30 / `warnDays` 1〜`graceDays`-1 に制限。公開 Bot 化後のグローバル監視（大量キック検知）は将来検討（Notion 引き継ぎ §3.3）

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/unverifiedKick.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。コマンド定義 / ユーザーレスポンス / Embed / UI ラベル / ログの各カテゴリを member-log・inactive-kick と同様に用意する（詳細キー表は実装時に確定）。プレースホルダーは**単一波括弧** `{name}` 記法を用いる。

---

## テストケース

### ユニットテスト

- [x] 経過日数の算出（`joinedAt` 起算 / `enabledAt` による floor / 有効化直後は 0 日起算）
- [x] 段階判定（`warnDays` null で `ageDays >= G` 即キック / 設定時はウィンドウ範囲の未警告を警告・飛び越えキック期も警告して繰り延べ・警告済み＋通知猶予経過で初めてキック・猶予未経過は待機）
- [x] 警告記録のライフサイクル（警告で記録 / 認証済み・退出・起算リセット・`warnDays` 無効化で失効削除 / `enable`・`reset` で一括破棄 / `createMany skipDuplicates` の冪等）
- [x] 除外判定（Bot / 認証ロール保持 / Administrator / オーナー / 除外ロール保持）
- [x] バリデーション（`graceDays` 範囲 / `warnDays < graceDays` / `markerRoleId` 階層 / 範囲外拒否 ※コマンド定義の min/max + classify で担保）
- [x] 対象ロールの保険クリーンアップ（認証済み・除外済みの保持者から剥奪 ※通知直前付与の順序・階層不足スキップは実装のみ）
- [x] 警告 DM の変数差し込み整形（`{serverName}` / `{graceDays}` / `{warnDays}` / `{remainingDays}`・単一波括弧 / デフォルト文）
- [x] 通知 Embed（キック予告・対象ロールメンション本文）/ ログ Embed（キックサマリー・メンバーは `<@id>`・認証ロールは description でメンション）の整形（テストモード表記）
- [x] 設定コマンド各種（exempt 冪等・enable で enabledAt 設定・reset・set-grace-days/set-warn-days 範囲オプション・set-notify-channel/set-log-channel 同一チャンネル指定可）

### インテグレーションテスト

- [x] 日次チェック通し（`TEST_MODE=true`: キックせず ログのみ / 通常: キック実行）
- [x] `enabledAt` 起算下限通し（有効化前から猶予超過の古い未承認メンバーが有効化直後にキックされない）
- [x] バリデーション失敗時の自動 `enabled=false`（認証ロール未設定 / 削除済み / Bot 権限不足）
- [x] Bot 権限不足・キック不能メンバー（上位ロール）のスキップ
- [x] preview の区分表示（キック対象 / 警告対象 / 対象なし）が日次チェックと一致

> NOTE: 警告 DM 送信（`member.send`）・通知チャンネルへの予告投稿・対象ロールの「通知直前付与」順序・`guildMemberUpdate` 契機の認証時剥奪はロジック実装済みだがユニットテスト未整備（Discord 副作用のため。判定ロジックは candidates / eligibility / runner テストで担保）。本番リリースは release PR（develop→main）で実施。

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildUnverifiedKickSettings リポジトリ | 設定の取得・更新 |
| JobScheduler | 日次チェックの定期ジョブ（`addJob`・node-cron・`timezone` / `noOverlap`）。既定 `0 3 * * *`（Asia/Tokyo） |
| env.TEST_MODE | dry-run（全ギルド一括・運用者向け）の制御。`src/shared/config/env.ts` に定義済み（bump-reminder / inactive-kick と共用） |
| env.UNVERIFIED_KICK_CRON | 日次チェックの cron 式を上書き（dev/検証用・任意）。`resolveUnverifiedKickSchedule()` で解決し、不正・未設定なら既定（03:00）にフォールバック |
| GatewayIntentBits.GuildMembers | メンバー一覧取得・`guildMemberUpdate`（認証ロール取得検知）（Server Members Intent・既に有効想定・新規追加不要） |
| date-fns | 経過日数・残日数の算出（`differenceInDays`） |
| 共通ページネーター | preview / 通知 / ログのページング UI |
| 共通 Embed ユーティリティ | `createSuccessEmbed` / `createWarningEmbed` 等 |

---

## 参考リソース

- [Notion: Saika 未承認ユーザー自動キック 実装 引き継ぎ](https://www.notion.so/3638e698a89281eb967ec072a47751e3)（設計判断ログ・棄却案・Open Questions の一次情報源）
- [INACTIVE_KICK_SPEC.md](INACTIVE_KICK_SPEC.md)（日次チェック / バリデーション / preview / `enabledAt` 起算下限 / dry-run の方式統一元）
- [MEMBER_LOG_SPEC.md](MEMBER_LOG_SPEC.md)（本文可変・DB 保存・変数差し込みの流儀）
- [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md)（ログ Embed / `formatActionLog` の判定原則）
