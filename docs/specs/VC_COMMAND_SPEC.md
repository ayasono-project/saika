# VC操作コマンド - 仕様書

> 参加中のボイスチャンネルの名前変更・人数制限変更を行う汎用コマンド

最終更新: 2026年3月21日

---

## 概要

ユーザーが参加中のボイスチャンネル（VC）に対して、名前変更や人数制限変更を行うスラッシュコマンドです。VAC（VC自動作成）で作成されたVC、およびVC募集機能で新規作成されたVCの両方を操作対象とします。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| VC名変更 | 参加中のVCの名前を変更する |
| 人数制限変更 | 参加中のVCの人数制限を変更する（0=無制限、最大99） |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | なし（VC参加チェックのみ） | コマンド実行にDiscord権限は不要。Bot側でVC参加・管理対象チェックを実施 |
| Bot | `ManageChannels` | VCの名前・人数制限を変更するために必要 |

### 操作対象VCの判定

以下のいずれかに該当するVCが操作対象となります：

| 管理元 | 判定方法 |
| --- | --- |
| VAC（VC自動作成） | `GuildVacConfig.createdChannels[].voiceChannelId` に含まれる |
| VC募集（新規作成VC） | `VcRecruitConfig.setups[].createdVoiceChannelIds` に含まれる |

---

## VC名変更

### コマンド定義

**コマンド**: `/vc rename`

**実行権限**: なし（Bot側でVC参加・管理対象チェック）

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| name | String | ✅ | 新しいVC名 |

### 動作フロー

1. コマンド実行者がボイスチャンネルに参加中か確認
2. 参加中のVCが管理対象（VAC管理下 または VC募集の新規作成VC）か確認
3. VCの名前を変更
4. 成功メッセージを返す（Ephemeral）

**ビジネスルール:**

- VC未参加 → エラー「このコマンドはVC参加中にのみ使用できます」
- 管理対象外のVC → エラー「このVCはBot管理のチャンネルではありません」
- Bot に `ManageChannels` 権限が不足している場合は Bot権限不足エラー（共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）

### UI

**成功時の応答:**

```
✅ VC名を みんなのたまり場 に変更しました
```

**エラー時の応答:**

- VC未参加: `❌ このコマンドはVC参加中にのみ使用できます`
- 管理対象外: `❌ このVCはBot管理のチャンネルではありません`
- Bot権限不足: Bot権限不足エラー（共通フォーマット）

---

## 人数制限変更

### コマンド定義

**コマンド**: `/vc limit`

**実行権限**: なし（Bot側でVC参加・管理対象チェック）

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| limit | Integer | ✅ | 人数制限（0=無制限、最大99） |

### 動作フロー

1. コマンド実行者がボイスチャンネルに参加中か確認
2. 参加中のVCが管理対象（VAC管理下 または VC募集の新規作成VC）か確認
3. `limit` の値が 0〜99 の範囲か検証
4. VCの人数制限を変更（0 は無制限）
5. 成功メッセージを返す（Ephemeral）

**ビジネスルール:**

- VC未参加 → エラー「このコマンドはVC参加中にのみ使用できます」
- 管理対象外のVC → エラー「このVCはBot管理のチャンネルではありません」
- 範囲外の値（0未満または100以上） → エラー「人数制限は0〜99の範囲で指定してください」
- Bot に `ManageChannels` 権限が不足している場合は Bot権限不足エラー（共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）

### UI

**成功時の応答:**

```
✅ 人数制限を 5 に設定しました
✅ 人数制限を 無制限 に設定しました
```

**エラー時の応答:**

- VC未参加: `❌ このコマンドはVC参加中にのみ使用できます`
- 管理対象外: `❌ このVCはBot管理のチャンネルではありません`
- 範囲外: `❌ 人数制限は0〜99の範囲で指定してください`
- Bot権限不足: Bot権限不足エラー（共通フォーマット）

---

## 制約・制限事項

- 人数制限の範囲: 0〜99（0は無制限）
- VC名の文字数: Discord側の制限（最大100文字）に準拠
- 応答はすべて Ephemeral（実行者のみ表示）

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

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.renamed` | VC名変更成功 | VC名を {{name}} に変更しました。 | VC name has been changed to {{name}} |
| `user-response.limit_changed` | 人数制限変更成功 | 人数制限を {{limit}} に設定しました。 | User limit has been set to {{limit}} |
| `user-response.unlimited` | 無制限表示 | 無制限 | unlimited |
| `user-response.not_in_any_vc` | VC未参加エラー | このコマンドはVC参加中にのみ使用できます。 | You must be in a voice channel to use this command. |
| `user-response.not_managed_channel` | 管理対象外エラー | このVCはBot管理のチャンネルではありません。 | This voice channel is not managed by the Bot. |
| `user-response.limit_out_of_range` | 人数制限範囲エラー | 人数制限は0〜99の範囲で指定してください。 | User limit must be between 0 and 99. |

---

## テストケース

### `/vc rename` コマンド

#### 正常系

- [x] **VAC管理VC名前変更**: VAC管理下のVCに参加中に名前が変更される
- [x] **VC募集作成VC名前変更**: VC募集で新規作成されたVCに参加中に名前が変更される
- [x] **成功通知**: 変更成功時に確認メッセージが表示される（MessageFlags.Ephemeral）

#### 異常系

- [x] **VC未参加**: VCに参加していない状態でコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral）
- [x] **管理対象外VC**: Bot管理外のVCに参加中にコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral）
- [x] **Bot権限不足**: BotにManageChannels権限がない場合はBot権限不足エラーが表示される（MessageFlags.Ephemeral）

### `/vc limit` コマンド

#### 正常系

- [x] **VAC管理VC制限変更**: VAC管理下のVCに参加中に人数制限が変更される
- [x] **VC募集作成VC制限変更**: VC募集で新規作成されたVCに参加中に人数制限が変更される
- [x] **無制限設定**: 0を指定すると無制限に設定される
- [x] **成功通知**: 変更成功時に確認メッセージが表示される（MessageFlags.Ephemeral）

#### 異常系

- [x] **VC未参加**: VCに参加していない状態でコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral）
- [x] **管理対象外VC**: Bot管理外のVCに参加中にコマンドを実行するとエラーメッセージが表示される（MessageFlags.Ephemeral）
- [x] **バリデーション**: 0-99の範囲外の値を指定するとエラーメッセージが表示される（MessageFlags.Ephemeral）
- [x] **Bot権限不足**: BotにManageChannels権限がない場合はBot権限不足エラーが表示される（MessageFlags.Ephemeral）

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| VAC（VC自動作成） | `GuildVacConfig.createdChannels` を参照してVAC管理下VCか判定 |
| VC募集 | `VcRecruitConfig.setups[].createdVoiceChannelIds` を参照してVC募集管理下VCか判定 |
| vc-panel（操作パネル） | パネルのボタンハンドラーは別途VC参加チェックで動作（本コマンドとは独立） |
