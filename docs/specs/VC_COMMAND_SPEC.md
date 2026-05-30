# VC操作コマンド - 仕様書

> 参加中のボイスチャンネルの設定変更、および VC 参加メンバーの切断・移動を行うコマンド群

最終更新: 2026年5月30日

> **ステータス**: 全コマンド実装完了(2026-05-30)。`/vc disconnect` / `/vc move` / 共通ユーティリティに加え、`/vc rename` / `/vc limit` の public 化も実施済み。末尾「オープン項目」は全て確定済み。

---

## 概要

`/vc` 配下のサブコマンド群を、性質別に 2 群に分けて扱う:

- **自分の VC を変える系** (`/vc rename`, `/vc limit`): 実行者が参加中の **管理対象** VC(VAC または VC 募集で作成された VC)に対して設定変更を行う。Bot 側で VC 参加・管理対象チェックを実施。
- **他メンバーを動かす系** (`/vc disconnect`, `/vc move`): 任意の VC または任意のメンバーに対して切断・移動を行う。実行者の Discord 権限はチェックしない(後述「権限モデル」参照)。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| `/vc rename` | 参加中の管理対象 VC の名前を変更 |
| `/vc limit` | 参加中の管理対象 VC の人数制限を変更(0=無制限、最大99) |
| `/vc disconnect` | 対象メンバー、または指定 VC 全員を VC から切断 |
| `/vc move` | 対象メンバー、または指定 VC 全員を別の VC に移動 |

### 権限モデル

| 対象 | コマンド | 権限 | 用途 |
| --- | --- | --- | --- |
| 実行者 | rename / limit | なし(VC参加 + 管理対象チェックのみ) | Discord 権限不要。Bot 側で参加・管理対象判定 |
| 実行者 | disconnect / move | なし(チェックなし) | 全メンバー実行可能。コード側で Discord 権限チェックは行わない |
| Bot | rename / limit | `ManageChannels` | VC の名前・人数制限を変更 |
| Bot | disconnect / move | `MoveMembers` | メンバーの切断・移動 |

**disconnect / move で実行者権限を持たない方針の根拠:**

- `MoveMembers` 保持者は Discord 標準の右クリック切断/移動で済むため、Bot コマンドを必要としない
- 権限チェックを入れると「コマンドを使える人 = コマンドを必要としない人」という本末転倒な構造になる
- 既存 `/afk` と思想を統一する
- 嫌がらせ濫用は public 出力(後述)による抑止 + サーバー側のタイムアウト処理で運用カバーする

**Bot ロール階層(disconnect / move):** Bot のロールが対象メンバーのロールより上位にある必要がある。階層不足時は Bot 権限不足エラー(共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照)を返す。

### 操作対象VCの判定

「自分の VC を変える系」の操作対象は以下のいずれかに該当する VC のみ:

| 管理元 | 判定方法 |
| --- | --- |
| VAC(VC自動作成) | `GuildVacSettings.createdChannels[].voiceChannelId` に含まれる |
| VC募集(新規作成VC) | `VcRecruitSettings.setups[].createdVoiceChannelIds` に含まれる |

「他メンバーを動かす系」(`/vc disconnect`, `/vc move`)は管理対象に関わらず **サーバー内の全 VC** が対象。

### 出力可視性ポリシー

| コマンド | 既定 | 備考 |
| --- | --- | --- |
| `/vc rename` | public | 共有リソースの状態変更のため public（2026-05-30 に ephemeral から移行） |
| `/vc limit` | public | 同上 |
| `/vc disconnect` | public | 透明性確保・濫用抑止のため確定 |
| `/vc move` | public | 同上 |

判定原則の本文は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「コマンド設計原則(ephemeral / public)」を参照(本タスクで新設するセクション)。例外として、エラー応答・一括時のキャンセル/タイムアウト応答・確認ダイアログ本体は ephemeral。

---

## /vc rename

### コマンド定義

**コマンド**: `/vc rename`

**実行権限**: なし(Bot側でVC参加・管理対象チェック)

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| name | String | ✅ | 新しいVC名 |

### 動作フロー

1. コマンド実行者がボイスチャンネルに参加中か確認
2. 参加中のVCが管理対象（VAC管理下 または VC募集の新規作成VC）か確認
3. VCの名前を変更
4. 成功メッセージを返す（public）

**ビジネスルール:**

- VC未参加 → エラー「このコマンドはVC参加中にのみ使用できます」
- 管理対象外のVC → エラー「このVCはBot管理のチャンネルではありません」
- Bot に `ManageChannels` 権限が不足している場合は Bot権限不足エラー（共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）

### UI

**成功時の応答:**

```
✅ <#対象VC> のVC名を みんなのたまり場 に変更しました
```

**エラー時の応答:**

- VC未参加: `❌ このコマンドはVC参加中にのみ使用できます`
- 管理対象外: `❌ このVCはBot管理のチャンネルではありません`
- Bot権限不足: Bot権限不足エラー（共通フォーマット）

---

## /vc limit

### コマンド定義

**コマンド**: `/vc limit`

**実行権限**: なし(Bot側でVC参加・管理対象チェック)

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| limit | Integer | ✅ | 人数制限（0=無制限、最大99) |

### 動作フロー

1. コマンド実行者がボイスチャンネルに参加中か確認
2. 参加中のVCが管理対象（VAC管理下 または VC募集の新規作成VC）か確認
3. `limit` の値が 0〜99 の範囲か検証
4. VCの人数制限を変更（0 は無制限）
5. 成功メッセージを返す（public）

**ビジネスルール:**

- VC未参加 → エラー「このコマンドはVC参加中にのみ使用できます」
- 管理対象外のVC → エラー「このVCはBot管理のチャンネルではありません」
- 範囲外の値（0未満または100以上） → エラー「人数制限は0〜99の範囲で指定してください」
- Bot に `ManageChannels` 権限が不足している場合は Bot権限不足エラー（共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）

### UI

**成功時の応答:**

```
✅ <#対象VC> の人数制限を 5 に設定しました
✅ <#対象VC> の人数制限を 無制限 に設定しました
```

**エラー時の応答:**

- VC未参加: `❌ このコマンドはVC参加中にのみ使用できます`
- 管理対象外: `❌ このVCはBot管理のチャンネルではありません`
- 範囲外: `❌ 人数制限は0〜99の範囲で指定してください`
- Bot権限不足: Bot権限不足エラー（共通フォーマット）

---

## /vc disconnect

### コマンド定義

**コマンド**: `/vc disconnect`

**実行権限**: なし(全メンバー)

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `target-member` | User | ❌ | 切断対象のメンバー |
| `target-channel` | Voice Channel | ❌ | 全員を切断する対象 VC |
| `reason` | String | ❌ | Discord 監査ログに記録する理由 |

Discord の制約上 `User | Channel` の混在オプションは直接定義できないため、**案 A** を採用: `target-member`(User) と `target-channel`(VoiceChannel) を両方オプションとして定義し、コード側で「どちらか一方のみ必須」を検証する(両方未指定=エラー、両方指定=競合エラー)。共通解決ヘルパー `resolveVcActionTarget`(`src/bot/shared/vcActionTarget.ts`)で判定する。

### 動作フロー

#### target が User の場合(個別切断)

1. 対象ユーザーが VC に参加しているか確認
2. Bot のロール階層が対象を上回るか確認
3. `voice.disconnect(reason)` を実行
4. public で `formatActionLog` Embed を返す

#### target が Channel の場合(一括切断)

1. 対象 VC に 1 人以上参加しているか確認
2. 確認ダイアログを ephemeral で表示(後述「共通: 一括確認ダイアログ」)
3. 実行ボタン押下 → 実行時点で対象 VC のメンバー一覧を再取得し、各メンバーに対して順次 `voice.disconnect(reason)`
4. 完了後、public で `formatActionLog` Embed を返す(対象人数・失敗内訳を含む)

**ビジネスルール:**

- 対象が VC 未参加 → エラー「指定されたユーザーはボイスチャンネルにいません」(ephemeral)
- 対象 VC が空(受付時点 / 実行時点いずれでも) → エラー「対象 VC には誰もいません」(ephemeral)
- ロール階層不足 → Bot 権限不足エラー
- 一括時、一部メンバーで失敗しても残りは続行(失敗内訳を Embed に含める)
- `reason` 未指定時は監査ログに「Bot コマンド `/vc disconnect` による切断」を渡す

### UI

「共通: アクションログ Embed」「共通: 一括確認ダイアログ」を参照。

---

## /vc move

### コマンド定義

**コマンド**: `/vc move`

**実行権限**: なし(全メンバー)

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `to` | Voice Channel | ✅ | 移動先 VC |
| `target-member` | User | ❌ | 移動対象のメンバー |
| `target-channel` | Voice Channel | ❌ | 全員を移動する対象 VC |
| `reason` | String | ❌ | Discord 監査ログに記録する理由 |

`target-member` / `target-channel` の型表現は `/vc disconnect` と同方針(案 A)。Discord の制約上、必須オプション(`to`)は任意オプションより先に定義する。

### 動作フロー

#### target が User の場合

1. 対象ユーザーが VC に参加しているか確認
2. `to` がボイスチャンネルか確認
3. Bot のロール階層が対象を上回るか確認
4. `voice.setChannel(to, reason)` を実行
5. public で `formatActionLog` Embed を返す(destinationChannel を含む)

#### target が Channel の場合

1. 対象 VC と `to` が異なることを確認(同一なら no-op エラー)
2. 対象 VC に 1 人以上参加しているか確認
3. 確認ダイアログを ephemeral で表示
4. 実行ボタン押下 → 実行時点で対象 VC のメンバー一覧を再取得し、各メンバーに対して順次 `voice.setChannel(to, reason)`
5. 完了後、public で `formatActionLog` Embed を返す

**ビジネスルール:**

- `to` がボイスチャンネル以外 → エラー
- target=channel で `to` と同一 → エラー「移動元と移動先が同じです」
- その他は `/vc disconnect` に準ずる

### UI

「共通: アクションログ Embed」「共通: 一括確認ダイアログ」を参照。

---

## 共通: アクションログ Embed

`formatActionLog` ユーティリティで `/vc disconnect` / `/vc move` / `/afk` の出力フォーマットを統一する。`/afk` 側からも本ユーティリティを参照する([AFK_SPEC.md](AFK_SPEC.md) 参照)。

```typescript
function formatActionLog({
  action: 'disconnect' | 'afk' | 'move',
  invoker: User,
  target: User | { channel: VoiceChannel, count: number, failures?: User[] },
  reason?: string,
  destinationChannel?: VoiceChannel, // move / afk のみ
}): EmbedBuilder
```

### Embed 構成

| 項目 | 内容 |
| --- | --- |
| タイトル | ⛓️‍💥 切断 / 🛏️ AFK移動 / ➡️ 移動 |
| カラー | `VC_ACTION_LOG_COLOR = 0x5865f2`(Discord blurple) |
| 説明 | アクション別テンプレート(下表) |
| フィールド: 実行者 | `<@invoker>` |
| フィールド: 対象 | individual: `<@target>` / bulk: 対象メンバーのメンション一覧（`<@u1> <@u2> …`、上限 20 件・超過分は「ほか N 件」） |
| フィールド: 移動先 | move / afk のみ: `<#destinationChannel>` |
| フィールド: 理由 | `reason` または「指定なし」 |
| フィールド: 失敗内訳 | 一括時で失敗があった場合のみ表示（メンション一覧） |

**説明テンプレート:**

- disconnect (個別): `<@target> を VC から切断しました`
- disconnect (一括): `<#channel> の参加者全員を VC から切断しました`
- afk (個別): `<@target> を <#afkChannel> に移動しました`
- afk (一括): `<#channel> の参加者全員を <#afkChannel> に移動しました`
- move (個別): `<@target> を <#destinationChannel> に移動しました`
- move (一括): `<#channel> の参加者全員を <#destinationChannel> に移動しました`

> 一括の対象人数は「対象」フィールドのメンション一覧で表現し、説明は「参加者全員」とする（人数を本文に出さない）。

### ユーティリティ配置

`src/bot/shared/vcActionLog.ts`(確定)。`/vc`(vc-command) と `/afk`(afk) の 2 機能が共有するため、実装ガイドラインの「feature をまたぐ共通は `src/bot/shared/`」に準拠する。`formatActionLog` のほか、監査ログ理由のデフォルト解決 `resolveAuditReason(action, locale, userReason?)` も同ファイルに同梱する。

> アクションログ・確認ダイアログの i18n キーは `vc` 名前空間(`vc:action-log.*` / `vc:bulk-confirm.*`)に集約し、`/afk` 側からも参照する。

---

## 共通: 一括確認ダイアログ

target が Channel の場合のみ、誤爆防止のため実行前に ephemeral で確認ダイアログを表示する(target が User の場合は即実行)。

### Embed

| 項目 | 内容 |
| --- | --- |
| タイトル | 確認 |
| 説明 | `<#channel> の参加者全員に対して {action} を実行します。よろしいですか?` |
| カラー | 警告系(黄/橙) |
| フィールド: 対象 | コマンド受付時点の対象メンバーのメンション一覧（スナップショット。上限 20 件・超過分は「ほか N 件」） |
| フィールド: 移動先 | move / afk のみ |

### ボタン

| customId | ラベル | スタイル | 動作 |
| --- | --- | --- | --- |
| `vc-bulk:action-confirm:{commandInteractionId}` | 実行 | Danger | アクション本処理を実行 |
| `vc-bulk:action-cancel:{commandInteractionId}` | キャンセル | Secondary | ephemeral で「キャンセルしました」 |

> customId は実装ガイドラインの `<feature>:<subject>-<qualifier>[:<dynamic>]` に準拠(feature=`vc-bulk`、subject=`action`、qualifier=`confirm`/`cancel`、dynamic=コマンド `interaction.id`)。セッションは `TtlMap`(60s)で `interaction.id` をキーに保持する。

### タイムアウト

- 自動キャンセル: **60 秒**(`VC_BULK_CONFIRM.TIMEOUT_MS`)。`disableComponentsAfterTimeout` でボタンを無効化する
- タイムアウト後にボタンが押された場合はセッション失効を検知し、ephemeral で「タイムアウトしました」(`common:interaction.timeout`)を返す

### 確認時点と実行時点の乖離

確認表示中に対象 VC のメンバーが入退室する可能性があるため、実行時点で再度メンバー一覧を取得する。実行時点で空であれば「実行時点で対象 VC は空でした」を ephemeral で返す(no-op)。

---

## 制約・制限事項

- 人数制限の範囲: 0〜99(0は無制限)
- VC名の文字数: Discord側の制限（最大100文字）に準拠
- 一括処理(disconnect / move)はメンバー数に比例して時間がかかる(Discord API レートリミット範囲内で順次実行)
- 一括時の個別失敗は握り、全体は完了扱いとする(失敗内訳のみ Embed/ログに残す)
- Bot 内部の専用監査ログチャンネルへの記録は本機能では実装しない(将来要件次第)

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/vc.ts`

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `vc.description` | コマンド説明 | VCの設定を変更 | Change VC settings |
| `vc.rename.description` | サブコマンド説明 | 参加中のVC名を変更 | Rename your current VC |
| `vc.rename.name.description` | オプション説明 | 新しいVC名 | New VC name |
| `vc.limit.description` | サブコマンド説明 | 参加中VCの人数制限を変更 | Change user limit of your current VC |
| `vc.limit.limit.description` | オプション説明 | 人数制限（0=無制限、0~99） | User limit (0=unlimited, max 99) |
| `vc.disconnect.description` | サブコマンド説明 | メンバー、またはVC全員をVCから切断 | Disconnect a member, or everyone in a VC |
| `vc.disconnect.target-member.description` | オプション説明 | 切断する対象メンバー | Member to disconnect |
| `vc.disconnect.target-channel.description` | オプション説明 | 全員を切断する対象VC | VC whose members will all be disconnected |
| `vc.disconnect.reason.description` | オプション説明 | 監査ログに記録する理由 | Reason recorded in the audit log |
| `vc.move.description` | サブコマンド説明 | メンバー、またはVC全員を別のVCに移動 | Move a member, or everyone in a VC, to another VC |
| `vc.move.target-member.description` | オプション説明 | 移動する対象メンバー | Member to move |
| `vc.move.target-channel.description` | オプション説明 | 全員を移動する対象VC | VC whose members will all be moved |
| `vc.move.to.description` | オプション説明 | 移動先のVC | Destination VC |
| `vc.move.reason.description` | オプション説明 | 監査ログに記録する理由 | Reason recorded in the audit log |

### action-log / bulk-confirm（共通・`vc` 名前空間、`/afk` も参照）

| キー | 用途 | ja |
| --- | --- | --- |
| `action-log.title.{disconnect,move,afk}` | アクションログ タイトル | 切断 / 移動 / AFK移動 |
| `action-log.desc.{action}_{individual,bulk}` | 説明テンプレート(6種) | 「共通: アクションログ Embed」参照 |
| `action-log.field.{invoker,target,destination,reason,failures}` | フィールド名 | 実行者 / 対象 / 移動先 / 理由 / 失敗 |
| `action-log.reason_none` | 理由未指定 | 指定なし |
| `action-log.failures_more` | メンション一覧の省略 | ほか {{count}} 件 |
| `action-log.audit.{action}` | 監査ログ理由(既定) | Botコマンド /vc disconnect による切断 など |
| `bulk-confirm.title` | 確認ダイアログ タイトル | 確認 |
| `bulk-confirm.description` | 確認ダイアログ 本文 | `<#{{channelId}}> の参加者全員に対して{{action}}を実行します。よろしいですか？` |
| `bulk-confirm.action.{disconnect,move,afk}` | 本文差し込み操作名 | 切断 / 移動 / AFKチャンネルへの移動 |
| `bulk-confirm.field.{target,destination}` | 確認フィールド名 | 対象 / 移動先 |
| `ui.button.bulk_execute` | 実行ボタン ラベル | 実行 |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.renamed` | VC名変更成功 | <#{{channel}}> のVC名を {{name}} に変更しました。 | Changed the name of <#{{channel}}> to {{name}} |
| `user-response.limit_changed` | 人数制限変更成功 | <#{{channel}}> の人数制限を {{limit}} に設定しました。 | Set the user limit of <#{{channel}}> to {{limit}} |
| `user-response.unlimited` | 無制限表示 | 無制限 | unlimited |
| `user-response.not_in_any_vc` | VC未参加エラー | このコマンドはVC参加中にのみ使用できます。 | You must be in a voice channel to use this command. |
| `user-response.not_managed_channel` | 管理対象外エラー | このVCはBot管理のチャンネルではありません。 | This voice channel is not managed by the Bot. |
| `user-response.limit_out_of_range` | 人数制限範囲エラー | 人数制限は0〜99の範囲で指定してください。 | User limit must be between 0 and 99. |

### disconnect / move 追加分のユーザーレスポンス（`vc` 名前空間）

| キー | 用途 | ja |
| --- | --- | --- |
| `user-response.target_required` | 対象未指定 | 対象のメンバー、またはVCを指定してください。 |
| `user-response.target_conflict` | メンバーとVCの同時指定 | メンバーとVCは同時に指定できません。 |
| `user-response.target_not_voice` | 非VC指定 | ボイスチャンネルを指定してください。 |
| `user-response.member_not_found` | 対象メンバー不在 | 対象のメンバーが見つかりませんでした。 |
| `user-response.target_not_in_voice` | 対象がVC未参加 | 指定されたメンバーはボイスチャンネルにいません。 |
| `user-response.channel_empty` | 対象VCが空(受付時点) | 対象VCには誰もいません。 |
| `user-response.channel_empty_now` | 対象VCが空(実行時点) | 実行時点で対象VCには誰もいませんでした。 |
| `user-response.same_channel` | 移動元=移動先 | 移動元と移動先が同じです。 |

---

## テストケース

### `/vc rename` コマンド

#### 正常系

- [x] **VAC管理VC名前変更**: VAC管理下のVCに参加中に名前が変更される
- [x] **VC募集作成VC名前変更**: VC募集で新規作成されたVCに参加中に名前が変更される
- [x] **成功通知**: 変更成功時に確認メッセージが public で表示される

#### 異常系

- [x] **VC未参加**: VCに参加していない状態でコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral)
- [x] **管理対象外VC**: Bot管理外のVCに参加中にコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral)
- [x] **Bot権限不足**: BotにManageChannels権限がない場合はBot権限不足エラーが表示される（MessageFlags.Ephemeral)

### `/vc limit` コマンド

#### 正常系

- [x] **VAC管理VC制限変更**: VAC管理下のVCに参加中に人数制限が変更される
- [x] **VC募集作成VC制限変更**: VC募集で新規作成されたVCに参加中に人数制限が変更される
- [x] **無制限設定**: 0を指定すると無制限に設定される
- [x] **成功通知**: 変更成功時に確認メッセージが public で表示される

#### 異常系

- [x] **VC未参加**: VCに参加していない状態でコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral)
- [x] **管理対象外VC**: Bot管理外のVCに参加中にコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral)
- [x] **バリデーション**: 0-99の範囲外の値を指定するとエラーメッセージが表示される（MessageFlags.Ephemeral)
- [x] **Bot権限不足**: BotにManageChannels権限がない場合はBot権限不足エラーが表示される（MessageFlags.Ephemeral)

### `/vc disconnect` コマンド

- [x] **個別切断 正常系**: 対象が VC 参加中で正常切断、Embed が public、`reason` が監査ログに渡る
- [x] **個別切断 異常系**: 対象未指定/競合/対象が VC 未参加でエラー（Bot ロール階層不足は MissingPermissions として上位ハンドラへ伝播）
- [x] **一括切断 正常系**: 確認ダイアログ表示 → 実行 → 全員切断、結果が public
- [x] **一括切断 キャンセル/タイムアウト**: ephemeral でキャンセル / タイムアウト応答
- [x] **一括切断 部分失敗**: 一部メンバーで失敗時に残りを続行、失敗内訳が Embed に表示
- [x] **一括切断 空 VC**: 受付時点 / 確認後の実行時点で空 → no-op エラー

### `/vc move` コマンド

- [x] **個別移動 正常系**: 通常移動成功
- [x] **個別移動 異常系**: `to` が非 VC でエラー
- [x] **一括移動**: target=to で同一エラー / 確認ダイアログ動作

### 共通ユーティリティ

- [x] **formatActionLog**: 3 アクション × individual/bulk の 6 パターンが各テンプレートに一致
- [x] **一括確認ダイアログ**: ボタンの customId が `vc-bulk:action-confirm` / `vc-bulk:action-cancel` で発火

---

## オープン項目(確定済み・2026-05-30)

- [x] `target` の型表現 → **案 A**(`target-member: User` + `target-channel: VoiceChannel` の2オプション、コード側で片方必須を検証)
- [x] アクションログ Embed の説明テンプレート文言(日英) → 「共通: アクションログ Embed」+「ローカライズ」に確定
- [x] アクションログ Embed のカラー → `0x5865f2`(Discord blurple)
- [x] 一括確認ダイアログのタイムアウト秒数 → **60 秒**
- [x] 一括確認ダイアログの文言(日英) → 「ローカライズ」`bulk-confirm.*` に確定
- [x] `formatActionLog` の配置場所 → `src/bot/shared/vcActionLog.ts`
- [x] `/vc rename` / `/vc limit` の ephemeral → public 移行 → **実施済み**(2026-05-30)
- [ ] リリースノート文言(既存ユーザー向け挙動変更の周知。`/afk` の `user`→`target-member`/`target-channel` 変更と public 化が周知対象) — リリース時に作成

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| VAC（VC自動作成） | `GuildVacSettings.createdChannels` を参照してVAC管理下VCか判定 |
| VC募集 | `VcRecruitSettings.setups[].createdVoiceChannelIds` を参照してVC募集管理下VCか判定 |
| vc-panel（操作パネル） | **廃止（2026-05-30）**。作成VCのチャットに設置していた操作パネル（rename/limit/AFK/refresh）は撤廃し、全操作を `/vc`・`/afk` slash コマンドに一本化した。理由: 全機能が public な slash で代替可能であり、パネルは「チャットで流れる→refresh で再送」という構造的問題と低利用率、および常設パネル経由の切断はワンタップで濫用しやすく public 抑止が効かない点を抱えていたため |
| [AFK_SPEC.md](AFK_SPEC.md) | `/afk` 側で `formatActionLog` および一括確認ダイアログを共有 |
| [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) | ephemeral/public 判定原則の親ドキュメント(本タスクで該当セクションを新設) |
| [MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) | Bot 権限不足エラーの共通フォーマット |
