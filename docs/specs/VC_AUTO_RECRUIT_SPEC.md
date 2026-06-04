# VC自動募集機能 - 仕様書

> VC Auto Recruit - VC に最初のメンバーが参加した時、指定チャンネルへ募集メッセージを自動投稿する機能

最終更新: 2026年6月4日

---

## 概要

ボイスチャンネルに**最初の1人**が参加（= VC が 0人→1人 に遷移）した時、指定された通知チャンネルへ「通話が始まりました、参加しませんか？」という募集メッセージを自動投稿する機能です。カスタムメッセージ（本文）と固定デザインの Embed、そして **「VCに参加」ボタン** を投稿でき、VAC のトリガーチャンネル（CreateVC）参加時は投稿しません。投稿したメッセージは追跡され、**当該 VC から全員が退出した時に「VCに参加」ボタンを「募集終了」（無効）に変更**します。

投稿対象は**明示的に有効化したカテゴリ（allowlist）に所属する VC のみ**です。プライベート/スタッフ用などのカテゴリに募集が漏れるのを防ぐため、管理者が「ここで募集して良い」カテゴリを `add-category` のセレクトメニューで列挙し、**列挙されていないカテゴリの VC では投稿しません**（有効カテゴリ未設定の場合はどこにも投稿しません）。カテゴリに属さないルート直下の VC は **「TOP」** として同様に opt-in 対象で、メニュー内に「TOP（カテゴリなし）」として明示的に選択できます。`@everyone` の閲覧可否では判定しません（認証制サーバーのメンバー専用 VC を誤って除外しないため）。

設計方針は [member-log](MEMBER_LOG_SPEC.md) の流儀（本文可変・Embed 固定・DB 保存・プレースホルダー差し込み・ギルド単位設定）に揃えます。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| VC自動募集通知 | `voiceStateUpdate` イベントで、VC が 0人→1人 になった時に「VCに参加」ボタン付き募集メッセージを投稿 |
| 募集終了処理 | VC から全員退出時に、投稿済みメッセージの「VCに参加」ボタンを「募集終了」（無効）に変更 |
| set-channel | 投稿先（通知）チャンネルを設定 |
| enable | 機能を有効化 |
| disable | 機能を無効化 |
| set-message | カスタム募集メッセージを設定（モーダル入力） |
| clear-message | カスタム募集メッセージを削除 |
| set-embed | Embed の有効/無効を切り替え |
| add-category | 募集を投稿する対象カテゴリ（allowlist）を、未登録カテゴリ（TOP 含む）のセレクトメニューから複数選択で追加 |
| remove-category | 登録済みカテゴリ（TOP 含む）のセレクトメニューから複数選択で解除 |
| view | 現在の設定を表示 |
| reset | 確認ダイアログ付きで設定をリセット |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageGuild | `/vc-auto-recruit-settings` 全サブコマンドの実行（コマンドレベルで制御） |
| Bot | ViewChannel, SendMessages, EmbedLinks | 通知チャンネルへの募集メッセージ送信 |
| Bot | MentionEveryone（任意） | カスタムメッセージで `@everyone`/`@here`・メンション不可ロールを実際にピングさせる場合に必要（なくても投稿自体は成功し、これらのメンションが通知を飛ばさないだけ） |

---

## VC自動募集通知

### トリガー

**イベント**: `voiceStateUpdate`

**発火条件:**

- 機能が有効（`enabled: true`）
- 投稿先チャンネルが設定済み（`channelId != null`）
- ユーザーが VC に**新規参加**した（`newState.channelId != null` かつ `oldState.channelId !== newState.channelId`）
- 参加先 VC の**人間メンバーが本人のみ**（= 0人→1人。参加直後の VC 内 Bot 以外のメンバー数が 1）
- 参加先 VC が **CreateVC トリガーチャンネルでない**（VAC の `triggerChannelIds` に含まれない）
- 参加先 VC がサーバーの **AFK チャンネルでない**（`guild.afkChannelId` と一致しない）
- 参加者が Bot でない
- 参加先 VC の**所属カテゴリが有効カテゴリ（`enabledCategoryIds`）に含まれる**。カテゴリに属さないルート直下 VC は sentinel `"TOP"` が含まれるか判定する（`enabledCategoryIds` が空＝どこにも投稿しない）

### 動作フロー

1. 機能が有効かつ投稿先チャンネルが設定済みかをチェック
2. 参加判定（`oldState` → `newState` で新規参加か）
3. 除外判定（トリガーチャンネル / AFK チャンネル / Bot / 「最初の1人」でない場合はスキップ）
4. カテゴリゲート判定（参加先 VC の所属カテゴリ ID〔ルート直下は `"TOP"`〕が `enabledCategoryIds` に含まれなければスキップ。空なら常にスキップ）
5. 連投抑制チェック（同一 VC で直近クールダウン内なら投稿スキップ）
6. 投稿先チャンネルを取得（存在しなければスキップしてログ記録）
7. Bot 権限チェック（`ViewChannel` / `SendMessages` / `EmbedLinks`）
8. カスタムメッセージが設定されていればプレースホルダーを展開して本文（`content`）を生成（未設定の場合はデフォルト本文を使用）
9. `embedEnabled` が `true` なら募集 Embed を生成
10. 「🔊 VCに参加」ボタン（Link スタイル、URL = 当該 VC へのチャンネルジャンプ `https://discord.com/channels/{guildId}/{voiceChannelId}`）を含む ActionRow を生成
11. 通知チャンネルへ送信（content + Embed + ボタン。`allowedMentions` でメンション解析を許可し、content 中のメンションをピングさせる）
12. 送信したメッセージ参照（`voiceChannelId` / `postChannelId` / `messageId`）を `activeInvites` に保存（後述の募集終了処理で使用）
13. 当該 VC の最終投稿時刻をインメモリに記録し、ログに記録

**ビジネスルール:**

- **対象は「最初の1人」のみ**。2人目以降の参加では投稿しない（VC が 0人→1人 に遷移する瞬間だけ発火）。
- **VAC で作成された個人 VC も対象に含む**。CreateVC トリガーに参加 → VAC が新規 VC を作成しユーザーを移動する流れでは、トリガー参加イベントは「トリガーチャンネル除外」でスキップされ、移動先（新規作成 VC）への 0人→1人 遷移で募集が投稿される（= 「○○'s Room で通話が始まった」という募集になる）。
- **CreateVC トリガーチャンネルへの参加では投稿しない**（移動の中継点であり、滞在しないため）。
- **AFK チャンネルへの移動では投稿しない**。
- **カテゴリ allowlist（opt-in）**: 参加先 VC の所属カテゴリ ID（ルート直下 VC は sentinel `"TOP"`）が `enabledCategoryIds` に含まれる場合のみ投稿する。**含まれないカテゴリ・`enabledCategoryIds` が空の場合は投稿しない**。これにより、有効化していないプライベート/スタッフ用カテゴリへ募集が漏れない。
- **判定は所属カテゴリのみで行い、`@everyone` の閲覧可否は見ない**。認証制サーバー（@everyone は非表示・「メンバー」ロールで閲覧）でも、有効化したカテゴリ内であればメンバー専用 VC で正しく投稿される。閲覧制御はカテゴリの有効化/無効化で管理者が明示的に行う。
- VAC で作成された個人 VC も、その所属カテゴリ（＝トリガーチャンネルと同じカテゴリ）が有効化されている場合のみ投稿対象になる。
- 管理者などによる VC 移動で 0人→1人 になった場合も投稿する（自己参加と区別しない）。
- **連投抑制**: 同一 VC で直近 60 秒以内に投稿済みの場合は再投稿しない（ネットワーク断による再接続などでの連投を防ぐ。インメモリ保持のため Bot 再起動でリセットされる）。
- カスタムメッセージが設定されている場合、プレースホルダーを展開してプレーンテキスト（`content`）として Embed と一緒に送信する。
- **「VCに参加」ボタンは Embed・カスタムメッセージの有無に関わらず常に付与する**（募集の中核導線のため）。`embedEnabled: false` かつカスタムメッセージ未設定の場合は、ローカライズのデフォルト本文（`content.invite_default`）＋ボタンで投稿する（投稿内容が空になることはない）。
- 投稿先チャンネルが削除済みの場合は投稿をスキップし、ログに記録する（`channelDelete` イベントで設定はクリアされる。後述）。
- Bot 権限が不足している場合はエラーチャンネルへ通知する（[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）。

### UI

**本文（content）:** 募集文は**常に content（プレーンテキスト）**として送信する。Embed の説明欄ではなく content に置くことで、本文中のメンション（`{userMention}` やカスタムメッセージに書いた `<@&roleId>` / `@here` 等）が**実際にピングされる**（Embed 内のメンションは通知が飛ばないため）。

- カスタムメッセージが設定されている場合 → プレースホルダー展開後のカスタムメッセージを content にする
- 未設定の場合 → ローカライズのデフォルト本文 `content.invite_default`（i18next の `{{channel}}` に VC メンションを補間。例: 「#雑談VC で通話が始まりました。参加しませんか？」）を content にする

> **メンションについて**: content 中に展開されたメンションを実際にピングさせるため、送信時の `allowedMentions` でユーザー・ロール・`@everyone`/`@here` の解析を許可する。カスタムメッセージを設定できるのは `ManageGuild` 権限者のみのため、ロール/everyone メンションも許容する（[IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の方針に従う）。なお `@everyone`/`@here`・メンション不可ロールを実際にピングさせるには Bot に `MentionEveryone` 権限が必要（権限がなくても投稿は成功し、当該メンションが通知を飛ばさないだけ）。

**Embed（`embedEnabled: true` の場合）:** 募集文（content）を補足する情報カード。説明欄に募集文は置かない（メンションを効かせるため content 側に集約）。

| 項目 | 内容 |
| --- | --- |
| タイトル | 🔊 通話がはじまりました |
| カラー | blurple（`#5865F2`、VC 操作系コマンドと統一） |
| サムネイル | 参加者のアイコン画像 |
| フィールド: VC | `<#channelId>` |
| フィールド: 開始した人 | `<@userId>` |
| フッター | なし（タイムスタンプのみ） |

**ボタン:**

| 識別 | ラベル | スタイル | 動作 |
| --- | --- | --- | --- |
| join ボタン（Link） | 🔊 VCに参加 | Link | URL = `https://discord.com/channels/{guildId}/{voiceChannelId}`。クリックで当該 VC を開いて参加できる（自動参加ではなく VC を選択した状態になる）。Link スタイルのため customId は持たず（url のみ）、インタラクションも発生しないため専用ハンドラ不要 |

VC から全員が退出すると、このボタンは下記「[募集終了処理](#募集終了処理)」により無効化された **「募集終了」** ボタンに置き換わる。

| コンポーネント | ラベル | スタイル | 状態 | 動作 |
| --- | --- | --- | --- | --- |
| `vc-auto-recruit:ended` | 募集終了 | Secondary | `disabled: true` | 押下不可。クリックできないためインタラクションは発生しない |

> **募集導線について**: 参加導線は VC へのチャンネルジャンプ URL を URL（Link）ボタンとして提供する。Discord 招待リンク（`createInvite`）生成方式は採用しない（`CreateInstantInvite` 権限と招待の寿命管理が不要なチャンネルジャンプ方式を採用）。

**使用可能なプレースホルダー（カスタムメッセージ）:**

- `{userMention}`: 参加者メンション（`<@userId>` 形式）
- `{userName}`: 参加者のユーザー名
- `{channelMention}`: VC のチャンネルメンション（`<#channelId>` 形式）
- `{channelName}`: VC 名
- `{serverName}`: サーバー名

---

## 募集終了処理

投稿した募集メッセージは「VCに参加」ボタン付きで通知チャンネルに残り続けるが、**当該 VC から全員が退出した時点で「VCに参加」ボタンを「募集終了」（無効）ボタンに差し替える**。これにより「通話は終わったのに『参加しませんか？』のまま残る」違和感を解消し、メッセージ自体は履歴として残す（削除はしない）。

### トリガー

**イベント**: `voiceStateUpdate`（VC が空になった時）/ `channelDelete`（追跡中の VC が削除された時）

**発火条件:**

- ユーザーが VC から退出（`oldState.channelId != null` かつ `oldState.channelId !== newState.channelId`）し、その VC の**人間メンバーが 0 人**になった
- 退出した VC が `activeInvites` に追跡対象として登録されている
- または、`activeInvites` に登録された VC が `channelDelete` で削除された

### 動作フロー

1. 空になった（または削除された）VC の ID で `activeInvites` を検索
2. 該当する投稿メッセージ（`postChannelId` / `messageId`）を取得
3. メッセージの ActionRow を、無効化された「募集終了」ボタン（`vc-auto-recruit:ended`、Secondary、`disabled: true`）に差し替えて編集
4. `activeInvites` から当該エントリを削除
5. ログに記録

**ビジネスルール:**

- **募集終了処理は機能の有効/無効（`enabled`）に依存しない**。`activeInvites` にエントリが残っている限り実行する。これにより、機能を `disable` した後・設定変更後に当該 VC が空になっても、開いたままの募集が「VCに参加」のまま残置されず確実に「募集終了」へ差し替えられる（投稿の新規発火のみ `enabled` を見る）。
- **募集終了は VC が完全に空（人間メンバー 0 人）になった時のみ発火する**。判定対象は「VC に人が残っているか」であり、**開始した人（最初の参加者）が在室しているかは問わない**。
  - 開始した人が退出しても他の参加者が残っている場合 → VC は空でないため**募集終了しない**（ボタンは「VCに参加」のまま。通話継続中で募集は有効）。
  - Embed の「開始した人」フィールドは"最初に通話を始めた人"の履歴であり、本人の退出後も**更新しない**（残った別の人に付け替えたりしない）。
  - 最後の 1 人が退出して 0 人になった時に初めて募集終了処理が走る。
- 投稿メッセージが既に削除されている場合は編集をスキップし、`activeInvites` からの削除のみ行う（エラーは無視）。
- VAC 管理下の VC は空室時に VAC が自動削除するが、募集メッセージ（テキストチャンネル上）は VC 削除とは独立して編集できる。`voiceStateUpdate`（空室）と `channelDelete`（VC 削除）のどちらが先でも、最初に処理された方で「募集終了」へ差し替え、`activeInvites` から除去する（二重処理は冪等に扱う）。
- 「募集終了」へ差し替え後に同じ VC へ再度 0人→1人 で参加があった場合は、**新しい募集メッセージを投稿**する（古い「募集終了」メッセージは履歴として残す）。ただし連投抑制（後述）の対象期間内は再投稿しない。
- Bot 再起動で `activeInvites` の追跡対象が残っている場合、起動時クリーンアップで VC の存在・在室状況を確認し、既に空（または存在しない）VC の募集メッセージは「募集終了」へ差し替えて `activeInvites` から除去する。

---

## /vc-auto-recruit-settings set-channel

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings set-channel`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ✅ | 募集メッセージを投稿するテキストチャンネル |

### 動作フロー

1. テキストチャンネルかチェック（違えばエラー）
2. Bot 権限チェック: `ViewChannel`, `SendMessages`, `EmbedLinks`
3. チャンネルを設定に保存
4. 完了メッセージを返信（ephemeral）

### UI

**レスポンス（成功）:** `createSuccessEmbed` でチャンネル設定完了を通知

---

## /vc-auto-recruit-settings enable

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings enable`

**コマンドオプション:** なし

### 動作フロー

1. 投稿先チャンネルが設定済みかチェック（未設定の場合はエラー）
2. 機能を有効化
3. 完了メッセージを返信（ephemeral）

**ビジネスルール:**

- 投稿先チャンネルが未設定の場合はエラーメッセージを返す
- 有効化はできるが、**有効カテゴリ（`enabledCategoryIds`）が未設定の場合は「カテゴリを有効化するまでどこにも投稿されない」旨を警告として併記する**（`add-category` への導線）

### UI

**レスポンス（成功）:** `createSuccessEmbed` で有効化完了を通知（有効カテゴリ未設定時は警告を併記）

---

## /vc-auto-recruit-settings disable

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings disable`

**コマンドオプション:** なし

### 動作フロー

1. 機能を無効化
2. 完了メッセージを返信（ephemeral）

### UI

**レスポンス（成功）:** `createSuccessEmbed` で無効化完了を通知

---

## /vc-auto-recruit-settings set-message

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings set-message`

**コマンドオプション:** なし（モーダル入力）

### 動作フロー

1. モーダルを表示
2. ユーザーがメッセージを入力して送信
3. カスタム募集メッセージを保存
4. 完了メッセージを返信（ephemeral）

### UI

**モーダル:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `vc-auto-recruit-settings:message-modal-input` | 募集メッセージ | Paragraph | ✅ | 最大500文字 |

使用可能なプレースホルダーは [VC自動募集通知](#vc自動募集通知) の「使用可能なプレースホルダー」と同じ。

---

## /vc-auto-recruit-settings clear-message

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings clear-message`

**コマンドオプション:** なし

### 動作フロー

1. 設定済みのカスタム募集メッセージを削除し、メッセージなし状態に戻す
2. 完了メッセージを返信（ephemeral）

### UI

**レスポンス（成功）:** `createSuccessEmbed` で削除完了を通知

---

## /vc-auto-recruit-settings set-embed

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings set-embed`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `enabled` | Boolean | ✅ | Embed を投稿に含めるか（true: 含める / false: 本文のみ） |

### 動作フロー

1. `embedEnabled` を保存
2. 完了メッセージを返信（ephemeral）

**ビジネスルール:**

- `false`（本文のみ）に設定しても、カスタムメッセージ未設定時はデフォルト本文が使われ、「VCに参加」ボタンも常に付与されるため、投稿が空になることはない

### UI

**レスポンス（成功）:** `createSuccessEmbed` で Embed 設定変更を通知

---

## /vc-auto-recruit-settings add-category

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings add-category`（コマンドオプションなし）

### 動作フロー

1. ギルドの全カテゴリから **未登録のもの**（`enabledCategoryIds` に無いもの）を抽出し、未登録なら「TOP（カテゴリなし）」を先頭に加えて複数選択セレクトメニュー（最大 25 件）を ephemeral 表示する
2. ユーザーがカテゴリ（複数可）を選択すると、その選択値を `enabledCategoryIds` に一括追加し、追加件数を通知する（選択即時に確定）
3. 一定時間操作が無ければメニューを無効化する

**ビジネスルール:**

- 候補は未登録カテゴリ＋未登録の TOP のみ。追加できる候補が無い場合は案内メッセージのみ返す
- 既に登録済みのキーは追加対象から除外する（冪等）
- カテゴリ数が 25 を超える場合は先頭 25 件のみ表示する

### UI

**レスポンス（メニュー）:** 未登録カテゴリ（TOP 含む）の複数選択セレクトメニュー
**レスポンス（成功）:** `createSuccessEmbed` で追加件数を通知（`interaction.update` でメニューを片付ける）

---

## /vc-auto-recruit-settings remove-category

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings remove-category`（コマンドオプションなし）

### 動作フロー

1. `enabledCategoryIds`（TOP 含む）を複数選択セレクトメニュー（最大 25 件）として ephemeral 表示する
2. ユーザーがカテゴリ（複数可）を選択すると、その選択値を `enabledCategoryIds` から一括除去し、解除件数を通知する（選択即時に確定）
3. 一定時間操作が無ければメニューを無効化する

**ビジネスルール:**

- 登録済みカテゴリが無い場合は案内メッセージのみ返す
- 未登録のキーは除去対象から除外する（冪等）

### UI

**レスポンス（メニュー）:** 登録済みカテゴリ（TOP 含む）の複数選択セレクトメニュー
**レスポンス（成功）:** `createSuccessEmbed` で解除件数を通知（`interaction.update` でメニューを片付ける）

---

## /vc-auto-recruit-settings view

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings view`

**コマンドオプション:** なし

### 動作フロー

1. 現在の設定状態を取得
2. 設定内容を ephemeral で表示

### UI

**Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | VC自動募集機能 |
| フィールド: 状態 | 有効 / 無効 |
| フィールド: 投稿先チャンネル | #channel / 未設定 |
| フィールド: Embed | 有効 / 無効 |
| フィールド: カスタムメッセージ | メッセージ内容 / 未設定 |
| フィールド: 有効カテゴリ | カテゴリ名の一覧（プレーン表示・先頭に `#` を付けない。TOP は「TOP（カテゴリなし）」表示）/ 未設定（どこにも投稿されません） |

---

## /vc-auto-recruit-settings reset

### コマンド定義

**コマンド**: `/vc-auto-recruit-settings reset`

**コマンドオプション:** なし

### 動作フロー

1. `createWarningEmbed` で確認ダイアログ Embed + ボタンを ephemeral で送信
2. 「リセットする」ボタン押下 → 設定をデフォルト状態に戻す → 完了メッセージに `update()`
3. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- リセット後のデフォルト状態: `enabled: false`、`channelId: null`、`message: null`、`embedEnabled: true`、`enabledCategoryIds: []`、`activeInvites: []`
- 設定が存在しない場合でもリセット操作は成功扱い（冪等）
- リセット時に追跡中だった募集メッセージは以後自動で「募集終了」に差し替えられない（投稿済みメッセージは残置）

### UI

**Embed（確認ダイアログ）:** `createWarningEmbed` を使用

| 項目 | 内容 |
| --- | --- |
| タイトル | VC自動募集設定リセット確認 |
| 説明 | VC自動募集設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。 |
| フィールド | 削除対象: 有効/無効設定 / 投稿先チャンネル / Embed 設定 / カスタムメッセージ / 有効カテゴリ / 追跡中の募集（募集中の表示） |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `vc-auto-recruit-settings:reset-confirm` | 🗑️ | リセットする | Danger | 設定をリセットして完了メッセージに更新 |
| `vc-auto-recruit-settings:reset-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

---

## データモデル

### GuildVcAutoRecruitSettings

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルドID（主キー） |
| `enabled` | Boolean | 機能の有効/無効（デフォルト: false） |
| `channelId` | String? | 投稿先（通知）チャンネルID（未設定時は null） |
| `message` | String? | カスタム募集メッセージ（`{userMention}` / `{userName}` / `{channelMention}` / `{channelName}` / `{serverName}` 置換可。未設定時は null） |
| `embedEnabled` | Boolean | 募集 Embed を投稿に含めるか（デフォルト: true） |
| `enabledCategoryIds` | String[] | 募集を投稿する対象カテゴリ ID の allowlist（jsonb 保存。ルート直下は sentinel `"TOP"`）。空＝どこにも投稿しない。デフォルト: `[]` |
| `activeInvites` | VcAutoRecruitRef[] | 投稿済みで「募集中」状態の募集メッセージ参照のリスト（jsonb 保存。募集終了処理で参照・編集後に除去） |

### VcAutoRecruitRef

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `voiceChannelId` | String | 募集対象のボイスチャンネルID |
| `postChannelId` | String | 募集メッセージを投稿したテキストチャンネルID |
| `messageId` | String | 投稿した募集メッセージID（募集終了時にこのメッセージを編集） |
| `createdAt` | Number | 投稿日時（Unixタイムスタンプ） |

> 「最初の1人」判定は Discord の VC メンバー数から都度算出するため DB には保持しない。連投抑制の最終投稿時刻はインメモリ（VC ID → タイムスタンプ）で保持し、永続化しない。`activeInvites` は募集終了時にメッセージを編集する必要があるため永続化する（VAC の `createdChannels` と同じ jsonb 配列パターン）。

---

## 制約・制限事項

- カスタムメッセージの最大文字数: 500文字
- 投稿は VC が 0人→1人 に遷移した時（最初の1人の参加）のみ
- 除外対象: CreateVC トリガーチャンネル / AFK チャンネル / Bot の参加 / 2人目以降の参加 / **有効化されていないカテゴリの VC**
- **投稿は有効カテゴリ（`enabledCategoryIds`）に所属する VC のみ**。ルート直下 VC は sentinel `"TOP"` で表現。`enabledCategoryIds` が空の場合はどこにも投稿しない（opt-in 必須）
- カテゴリ判定は所属カテゴリのみで行い、`@everyone` の閲覧可否は判定に用いない（認証制サーバーのメンバー専用 VC を誤除外しないため）
- VAC で作成された個人 VC・通常 VC はいずれも、所属カテゴリが有効な場合のみ対象（移動による 0人→1人 遷移でも投稿）
- 連投抑制: 同一 VC で直近 60 秒以内の再投稿を抑制（インメモリ保持、Bot 再起動でリセット）
- 「VCに参加」ボタンは常に付与されるため、Embed 無効＋カスタムメッセージ未設定でもデフォルト本文＋ボタンで投稿する（投稿内容が空になることはない）
- 募集文（カスタムメッセージ／デフォルト本文）は **content** として送信し、メンション（ユーザー/ロール/`@everyone`/`@here`）は `allowedMentions` 解析により実際にピングされる。Embed 説明欄にはメンションを置かない（通知が飛ばないため）。カスタムメッセージを設定できるのは `ManageGuild` 権限者のみ
- 投稿先チャンネル削除時は `channelDelete` イベントで設定をクリアし、次回設定変更を促す（member-log と同様）
- 募集メッセージは投稿後に**削除しない**。VC から全員退出時に「VCに参加」ボタンを「募集終了」（無効）へ差し替え、メッセージ本体は履歴として残す
- 募集終了処理のため投稿メッセージ参照を `activeInvites`（jsonb）に永続化し、Bot 再起動時はクリーンアップで既に空・不在の VC の募集を「募集終了」へ差し替えて除去する

---

## 今後の拡張（v1 では未実装・TODO）

以下は v1 のスコープ外。実運用での必要性を見て追加判断する。

1. **ユーザー個別の有効・無効（opt-out）**
   - 目的: 1人で音楽/作業通話するユーザーが「最初の1人」として毎回告知されるのを避けたい場合の救済（プライバシー）。
   - 推奨方針: 新規のユーザー単位テーブルは作らず、`GuildVcAutoRecruitSettings` 内に `optedOutUserIds: String[]`（jsonb 配列）を追加し、本人が叩くトグルコマンド（例: `/vc-auto-recruit mute` ⇄ `unmute`）で管理する。これなら「サーバーごとに opt-out」が自然に表現でき、既存の jsonb 配列パターン（`triggerChannelIds` 等）と整合する。
   - 発火条件に「参加者が `optedOutUserIds` に含まれない」を追加する。
   - v1 で見送る理由: VC 参加は Discord のチャンネル一覧で既に可視であり追加で晒す情報がないこと、0人→1人 のみ発火でスパム性が低いこと、ギルド単位の有効/無効で大半の需要を満たせること（YAGNI）。
2. **VC（チャンネル）単位の指定・除外**: カテゴリ単位の allowlist（実装済み）に加え、特定 VC のみ/特定 VC 除外といったチャンネル粒度の制御。現状はカテゴリ単位で運用し、必要になれば検討する。
3. **招待リンク（`createInvite`）方式への切替/併用**: 参加ボタンを v1 のチャンネルジャンプ URL から Discord 招待リンクに変更する（外部共有が必要になった場合）。`CreateInstantInvite` 権限と招待の寿命管理が必要。

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/vcAutoRecruit.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `vc-auto-recruit-settings.description` | コマンド説明 | VC自動募集機能の設定（サーバー管理権限が必要） | Configure VC auto recruit feature (requires Manage Server) |
| `vc-auto-recruit-settings.set-channel.description` | サブコマンド説明 | 投稿先チャンネルを設定 | Set the notification channel |
| `vc-auto-recruit-settings.set-channel.channel.description` | オプション説明 | 募集メッセージを投稿するテキストチャンネル | Text channel to post recruit messages to |
| `vc-auto-recruit-settings.enable.description` | サブコマンド説明 | VC自動募集機能を有効化 | Enable VC auto recruit feature |
| `vc-auto-recruit-settings.disable.description` | サブコマンド説明 | VC自動募集機能を無効化 | Disable VC auto recruit feature |
| `vc-auto-recruit-settings.set-message.description` | サブコマンド説明 | カスタム募集メッセージを設定 | Set a custom recruit message |
| `vc-auto-recruit-settings.clear-message.description` | サブコマンド説明 | カスタム募集メッセージを削除 | Clear the custom recruit message |
| `vc-auto-recruit-settings.set-embed.description` | サブコマンド説明 | Embed の有効/無効を切り替え | Toggle the recruit embed |
| `vc-auto-recruit-settings.set-embed.enabled.description` | オプション説明 | Embed を投稿に含めるか | Whether to include the embed |
| `vc-auto-recruit-settings.add-category.description` | サブコマンド説明 | 募集対象カテゴリをメニューから選んで追加 | Add target categories from a select menu |
| `vc-auto-recruit-settings.remove-category.description` | サブコマンド説明 | 募集対象カテゴリをメニューから選んで解除 | Remove target categories from a select menu |
| `vc-auto-recruit-settings.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |
| `vc-auto-recruit-settings.reset.description` | サブコマンド説明 | VC自動募集設定をリセット | Reset VC auto recruit settings |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.set_channel_success` | チャンネル設定成功 | 投稿先チャンネルを {{channel}} に設定しました。 | Notification channel set to {{channel}} |
| `user-response.enable_success` | 有効化成功 | VC自動募集機能を有効化しました。 | VC auto recruit feature has been enabled |
| `user-response.enable_error_no_channel` | チャンネル未設定エラー | 投稿先チャンネルが設定されていません。先に /vc-auto-recruit-settings set-channel を実行してください。 | No notification channel is configured. Run /vc-auto-recruit-settings set-channel first. |
| `user-response.disable_success` | 無効化成功 | VC自動募集機能を無効化しました。 | VC auto recruit feature has been disabled |
| `user-response.set_message_success` | メッセージ設定成功 | 募集メッセージを設定しました。 | Recruit message has been set |
| `user-response.clear_message_success` | メッセージ削除成功 | 募集メッセージを削除しました。 | Recruit message has been cleared |
| `user-response.set_embed_enabled` | Embed 有効化成功 | Embed を有効にしました。 | Embed has been enabled |
| `user-response.set_embed_disabled` | Embed 無効化成功 | Embed を無効にしました。 | Embed has been disabled |
| `user-response.text_channel_only` | チャンネル種別エラー | テキストチャンネルを指定してください。 | Please specify a text channel. |
| `user-response.categories_added_count` | カテゴリ追加成功（件数） | {{count}} 件のカテゴリを募集対象に追加しました。 | Added {{count}} categories to the recruit targets. |
| `user-response.categories_removed_count` | カテゴリ解除成功（件数） | {{count}} 件のカテゴリを募集対象から解除しました。 | Removed {{count}} categories from the recruit targets. |
| `user-response.no_addable_categories` | 追加候補なし | 追加できるカテゴリがありません。すべて登録済みです。 | There are no categories to add. All categories are already registered. |
| `user-response.no_enabled_categories` | 解除候補なし | 解除できる募集対象カテゴリがありません。 | There are no recruit target categories to remove. |
| `user-response.enable_warning_no_category` | 有効化警告（カテゴリ未設定） | 有効化しましたが、有効カテゴリが未設定のため投稿されません。`/vc-auto-recruit-settings add-category` でカテゴリを追加してください。 | Enabled, but no category is enabled so nothing will be posted. Add one with /vc-auto-recruit-settings add-category. |
| `user-response.category_top_label` | TOP 表示（レスポンス用） | TOP（カテゴリなし） | TOP (no category) |
| `user-response.channel_deleted_notice` | チャンネル削除通知 | ⚠️ VC自動募集の投稿先チャンネルが削除されました。\n設定をリセットしたので、`/vc-auto-recruit-settings set-channel` で再設定してください。 | ⚠️ The VC auto recruit notification channel has been deleted.\nSettings have been reset. Please reconfigure with `/vc-auto-recruit-settings set-channel`. |
| `user-response.reset_success` | リセット成功 | VC自動募集設定をリセットしました。 | VC auto recruit settings have been reset. |
| `user-response.reset_cancelled` | リセットキャンセル | リセットをキャンセルしました。 | Reset has been cancelled. |

### 投稿本文（content）

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `content.invite_default` | カスタムメッセージ未設定時のデフォルト本文（content。メンション解析対象） | {{channel}} で通話が始まりました。参加しませんか？ | A voice call started in {{channel}}. Want to join? |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.success` | 設定成功タイトル | 設定完了 | Settings Updated |
| `embed.title.config_view` | 設定表示タイトル | VC自動募集機能 | VC Auto Recruit |
| `embed.description.not_configured` | 未設定説明 | VC自動募集が設定されていません。 | VC auto recruit is not configured. |
| `embed.field.name.status` | 状態フィールド名 | 状態 | Status |
| `embed.field.name.channel` | チャンネルフィールド名 | 投稿先チャンネル | Notification Channel |
| `embed.field.name.embed` | Embed フィールド名 | Embed | Embed |
| `embed.field.name.message` | メッセージフィールド名 | カスタムメッセージ | Custom Message |
| `embed.field.name.categories` | 有効カテゴリフィールド名 | 有効カテゴリ | Enabled Categories |
| `embed.field.value.categories_none` | 有効カテゴリ未設定値 | 未設定（どこにも投稿されません） | Not set (nothing will be posted) |
| `embed.field.value.top` | TOP 表示値 | TOP（カテゴリなし） | TOP (no category) |
| `embed.field.value.enabled` | 有効値 | 有効 | Enabled |
| `embed.field.value.disabled` | 無効値 | 無効 | Disabled |
| `embed.field.value.not_set` | 未設定値 | 未設定 | Not set |
| `embed.title.invite` | 募集通知タイトル | 🔊 通話がはじまりました | 🔊 A voice call has started |
| `embed.field.name.invite_channel` | 募集通知: VC フィールド名 | VC | Voice Channel |
| `embed.field.name.invite_starter` | 募集通知: 開始者フィールド名 | 開始した人 | Started by |
| `embed.title.reset_confirm` | リセット確認タイトル | VC自動募集設定リセット確認 | VC Auto Recruit Settings Reset |
| `embed.description.reset_confirm` | リセット確認説明 | VC自動募集設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。 | Reset VC auto recruit settings?\nThe following settings will be deleted. This action cannot be undone. |
| `embed.field.name.reset_target` | 削除対象フィールド名 | 削除対象 | Targets |
| `embed.field.value.reset_target` | 削除対象フィールド値 | 有効/無効設定 / 投稿先チャンネル / Embed 設定 / カスタムメッセージ / 有効カテゴリ / 追跡中の募集 | Enabled/Disabled / Notification Channel / Embed Setting / Custom Message / Enabled Categories / Active invites |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.modal.set_message_title` | 募集メッセージモーダルタイトル | 募集メッセージを設定 | Set Recruit Message |
| `ui.modal.set_message_label` | 募集メッセージ入力ラベル | 募集メッセージ | Recruit message |
| `ui.modal.set_message_placeholder` | 募集メッセージプレースホルダー | {userMention}, {userName}, {channelMention}, {channelName}, {serverName} を使用可（最大500文字） | Supports {userMention}, {userName}, {channelMention}, {channelName}, {serverName} (max 500 characters) |
| `ui.select.add_category_placeholder` | カテゴリ追加メニュープレースホルダー | 追加するカテゴリを選択（複数選択可） | Select categories to add (multiple allowed) |
| `ui.select.remove_category_placeholder` | カテゴリ解除メニュープレースホルダー | 解除するカテゴリを選択（複数選択可） | Select categories to remove (multiple allowed) |
| `ui.button.join` | VC参加ボタン（Link） | 🔊 VCに参加 | 🔊 Join VC |
| `ui.button.ended` | 募集終了ボタン（無効） | 募集終了 | Recruitment closed |
| `ui.button.reset_confirm` | リセット確認ボタン | リセットする | Reset |
| `ui.button.reset_cancel` | リセットキャンセルボタン | キャンセル | Cancel |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.invite_sent` | 募集投稿送信ログ | 募集メッセージを送信 GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}} | recruit message sent GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}} |
| `log.invite_skipped_cooldown` | 連投抑制スキップログ | 連投抑制により募集投稿をスキップ GuildId: {{guildId}} ChannelId: {{channelId}} | recruit skipped by cooldown GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.invite_closed` | 募集終了（ボタン無効化）ログ | VCが空になり募集終了に変更 GuildId: {{guildId}} VoiceChannelId: {{voiceChannelId}} MessageId: {{messageId}} | recruit closed (VC empty) GuildId: {{guildId}} VoiceChannelId: {{voiceChannelId}} MessageId: {{messageId}} |
| `log.invite_close_failed` | 募集終了編集失敗ログ | 募集終了への編集に失敗 GuildId: {{guildId}} MessageId: {{messageId}} | failed to close recruit GuildId: {{guildId}} MessageId: {{messageId}} |
| `log.startup_cleanup_done` | 起動クリーンアップ完了ログ | 起動クリーンアップ完了 募集終了 {{closed}} 件・除去 {{removed}} 件 | startup cleanup done: closed {{closed}}, removed {{removed}} |
| `log.post_failed` | 投稿送信失敗ログ | 募集メッセージ送信失敗 GuildId: {{guildId}} | failed to send recruit message GuildId: {{guildId}} |
| `log.channel_not_found` | チャンネル不在ログ | 投稿先チャンネルが見つかりません。 GuildId: {{guildId}} ChannelId: {{channelId}} | notification channel not found GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.channel_deleted_config_cleared` | チャンネル削除検知ログ | チャンネルが削除されたため設定をリセットしました。 GuildId: {{guildId}} ChannelId: {{channelId}} | channel deleted, config cleared GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.config_set_channel` | チャンネル設定ログ | 投稿先チャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}} | channel configured GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.config_enabled` | 有効化ログ | 有効化 GuildId: {{guildId}} | enabled GuildId: {{guildId}} |
| `log.config_disabled` | 無効化ログ | 無効化 GuildId: {{guildId}} | disabled GuildId: {{guildId}} |
| `log.config_message_set` | メッセージ設定ログ | 募集メッセージ設定 GuildId: {{guildId}} | recruit message set GuildId: {{guildId}} |
| `log.config_message_cleared` | メッセージ削除ログ | 募集メッセージ削除 GuildId: {{guildId}} | recruit message cleared GuildId: {{guildId}} |
| `log.config_category_added` | カテゴリ追加ログ | 募集対象カテゴリ追加 GuildId: {{guildId}} CategoryId: {{categoryId}} | recruit target category added GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.config_category_removed` | カテゴリ解除ログ | 募集対象カテゴリ解除 GuildId: {{guildId}} CategoryId: {{categoryId}} | recruit target category removed GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.category_removed_by_delete` | カテゴリ削除検知ログ | 削除されたカテゴリを有効カテゴリから除外 GuildId: {{guildId}} CategoryId: {{categoryId}} | removed deleted category from enabled list GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.config_embed_set` | Embed 設定ログ | Embed 設定変更 GuildId: {{guildId}} Enabled: {{enabled}} | embed setting changed GuildId: {{guildId}} Enabled: {{enabled}} |
| `log.config_reset` | リセットログ | 設定リセット GuildId: {{guildId}} | settings reset GuildId: {{guildId}} |
| `log.voice_state_update_failed` | voiceStateUpdate処理失敗ログ | voiceStateUpdate処理失敗（VC自動募集） | Failed to process voiceStateUpdate (vc-auto-recruit) |

---

## テストケース

### ユニットテスト

- [ ] 発火判定: 0人→1人 で発火 / 2人目以降は非発火 / Bot 参加は非発火
- [ ] 除外判定: CreateVC トリガーチャンネル除外 / AFK チャンネル除外
- [ ] カテゴリゲート: 有効カテゴリ内の VC で発火 / 非有効カテゴリの VC は非発火 / `enabledCategoryIds` 空は常に非発火 / ルート直下 VC は `"TOP"` 有効時のみ発火 / メンバー専用（@everyone 非表示）でも有効カテゴリなら発火
- [ ] add-category / remove-category: メニューからの複数選択での追加・解除・TOP（明示選択）・候補なし時の応答・冪等性 / カテゴリ削除時の allowlist 掃除（channelDelete）
- [ ] VAC 連携: トリガー参加は非発火・移動先（作成 VC）の 0人→1人 で発火（所属カテゴリが有効な場合）
- [ ] 連投抑制: 同一 VC の直近 60 秒以内は再投稿しない
- [ ] 投稿内容: カスタムメッセージのプレースホルダー展開 / Embed 生成 / Embed 無効時はデフォルト本文 + ボタン / ボタンは常に付与
- [ ] 本文・メンション: 募集文が content に入る / `allowedMentions` でユーザー・ロール・everyone がピングされる / Embed 説明欄に募集文を置かない
- [ ] ボタン: 「VCに参加」Link ボタンの URL（チャンネルジャンプ）生成 / `activeInvites` へのメッセージ参照保存
- [ ] 募集終了: VC が空（0人）になったら該当メッセージを「募集終了」無効ボタンへ差し替え・`activeInvites` から除去
- [ ] 募集終了の非発火: 開始者が退出しても他に在室者がいれば募集終了しない（ボタン据え置き・開始者フィールド不変）
- [ ] 募集終了の冪等性: `voiceStateUpdate`（空室）と `channelDelete`（VC削除）の二重処理 / 投稿メッセージ削除済み時のスキップ
- [ ] 設定コマンド各種（set-channel / enable / disable / set-message / clear-message / set-embed / view / reset）

### インテグレーションテスト

- [ ] voiceStateUpdate イベント処理（参加=投稿 / 空室=募集終了）
- [ ] 投稿先チャンネル未設定・チャンネル削除時の処理
- [ ] Bot 権限不足時のエラーチャンネル通知
- [ ] Bot 再起動時のクリーンアップ（空・不在 VC の募集を募集終了へ差し替え・除去）
- [ ] データベース連携（設定・`activeInvites` の保存・取得・更新・削除）

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildSettingsRepository | VC自動募集設定の取得・更新 |
| [VAC_SPEC.md](VAC_SPEC.md) | CreateVC トリガーチャンネル判定のため `triggerChannelIds` を参照（除外条件） |
| `src/bot/events/voiceStateUpdate.ts` | `voiceStateUpdate` イベントを受け本機能のハンドラへ委譲（VAC・非アクティブキックと同居）。参加=投稿 / 空室=募集終了 の両方を処理 |
| `channelDelete` イベント | 追跡中 VC の削除時に募集終了へ差し替え / 投稿先チャンネル削除時に設定クリア / **有効カテゴリが削除された場合は `enabledCategoryIds` から除去** |

---

## 参考リソース

- [MEMBER_LOG_SPEC.md](MEMBER_LOG_SPEC.md) - 本文可変・Embed 固定・DB 保存・プレースホルダー差し込みの流儀（本仕様の雛形）
- [VAC_SPEC.md](VAC_SPEC.md) - VC 自動作成機能（CreateVC トリガー・作成 VC の関係）
- [VC_RECRUIT_SPEC.md](VC_RECRUIT_SPEC.md) - VC 募集機能（招待リンク・参加ボタンの実装例）
- [Discord.js - VoiceStateUpdate](https://discord.js.org/docs/packages/discord.js/main/Client:Class#voiceStateUpdate)
