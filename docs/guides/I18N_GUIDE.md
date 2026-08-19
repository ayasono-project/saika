# i18n ガイド

> 多言語対応の実装ガイド — 翻訳の取得・キーの追加・命名規則

最終更新: 2026年8月19日

---

## 概要

多言語対応には **i18next** を使用します。サポート言語は **`ja`（デフォルト）と `en`** の2つです。

翻訳キーは型で縛られており、存在しないキーを指定すると**コンパイルエラー**になります。生文字列をユーザー向け出力やログに直接書くことは禁止です（[IMPLEMENTATION_GUIDELINES.md](IMPLEMENTATION_GUIDELINES.md) 参照）。

---

## 翻訳関数の使い分け

**どの言語で出すか**によって使う関数が変わります。ここを間違えると、ギルドの言語設定が効かない・DBアクセスが無駄に走るといった問題になります。

| 関数 | 同期/非同期 | 使う言語 | 用途 |
| --- | --- | --- | --- |
| `tInteraction(locale, key, params?)` | 同期 | **実行者の Discord クライアント言語**（`interaction.locale`） | コマンド応答・ボタン応答など**実行者本人**に見せるもの |
| `tGuild(guildId, key, params?)` | **非同期** | **ギルドの設定言語**（DB） | 通知チャンネルへの投稿・掲示物など**サーバー全員**が見るもの |
| `tDefault(key, params?)` | 同期 | **常にデフォルト言語（ja）** | プロセスログ・監査ログ理由など**運用者**が読むもの |
| `getGuildTranslator(guildId)` | 非同期（返る `t` は同期） | ギルドの設定言語 | 同一ギルドで**複数キーを連続で引く**とき |

```typescript
// 実行者本人への応答 → tInteraction
await interaction.reply(tInteraction(interaction.locale, "afk:user-response.moved", {
  user: member.displayName,
  channel: channel.name,
}));

// 通知チャンネルへの投稿 → tGuild
const message = await tGuild(guild.id, "inactiveKick:embed.title.kick", { total: 5 });

// 同一ギルドで複数キーを引く → getGuildTranslator
const t = await getGuildTranslator(guild.id);
const title = t("ticket:embed.title.created");
const body = t("ticket:embed.description.created");
```

> `tInteraction` は DB を参照しないため同期です。`tGuild` はギルド設定を読むため非同期になります。**実行者向けの応答で `tGuild` を使うと、無駄な DB アクセスが発生する上に実行者の言語が無視されます。**

---

## import の書き方

`src/shared/locale/` に barrel（`index.ts`）は**ありません**。各ファイルから直接 import します。

```typescript
// src/ 配下 — 相対パスを使う
import { tGuild, tDefault, tInteraction, logPrefixed } from "../../shared/locale/localeManager";
import { getGuildTranslator } from "../../shared/locale/helpers";
```

| 取得したいもの | import 元 |
| --- | --- |
| `tGuild` / `tInteraction` / `tDefault` / `logPrefixed` / `logCommand` / `localeManager` | `shared/locale/localeManager` |
| `getGuildTranslator` / `getInteractionTranslator` / `getTimezoneOffsetForLocale` | `shared/locale/helpers` |
| `getCommandLocalizations` / `getChoiceLocalizations` | `shared/locale/commandLocalizations` |
| `SUPPORTED_LOCALES` / `DEFAULT_LOCALE` / `I18N_NAMESPACES` | `shared/locale/i18n` |

> ⚠️ **`@/` エイリアスは `src/` では使えません。** `tests/tsconfig.json` と `vitest.config.ts` にのみ定義されているため、**テストコード専用**です。`src/` 配下では相対パスを使ってください。

---

## 名前空間

キーは `"名前空間:キー"` の形式で指定します。名前空間は **19個**あり、`src/shared/locale/i18n.ts` の `I18N_NAMESPACES` が定義元です。

| 分類 | 名前空間 |
| --- | --- |
| 横断 | `common`（デフォルト）/ `system` |
| 汎用コマンド | `about` / `ping` / `help` |
| 機能別 | `afk` / `bumpReminder` / `vac` / `vc` / `vcAutoRecruit` / `messageDelete` / `memberLog` / `inactiveKick` / `unverifiedKick` / `reactionRole` / `stickyMessage` / `ticket` / `vcRecruit` / `guildSettings` |

- `common`: 共通ラベル・タイトル・機能横断のエラー文言
- `system`: 機能横断の内部ログ（Bot 起動/終了・DB・Web など）
- 機能別: その機能に閉じた文言すべて

**機能を追加するときは名前空間を1つ増やします。** 既存の名前空間に相乗りさせないでください。

---

## ディレクトリ構造

```text
src/shared/locale/
├── i18n.ts                  ← 名前空間・サポート言語・初期化
├── i18next.d.ts             ← 型の宣言拡張（キーの型安全性はここ）
├── localeManager.ts         ← 翻訳関数の本体（tGuild / tDefault / tInteraction ほか）
├── helpers.ts               ← getGuildTranslator ほか
├── commandLocalizations.ts  ← スラッシュコマンド定義用のローカライズ
└── locales/
    ├── resources.ts         ← ja / en を束ねて TranslationResources を定義
    ├── ja/
    │   ├── common.ts
    │   ├── system.ts
    │   ├── resources.ts
    │   └── features/
    │       ├── index.ts     ← 17機能の re-export
    │       ├── afk.ts
    │       ├── bumpReminder.ts
    │       └── ...
    └── en/                  ← ja と同一構成
```

**ファイル名＝名前空間名**です（`features/afk.ts` → `afk:` 名前空間）。

---

## キーの命名規則

キーセパレータは**無効**（`keySeparator: false`）です。つまり `"embed.title.kick"` はドットを含む**1つのフラットな文字列キー**であり、ネストしたオブジェクトではありません。翻訳ファイルもフラットに書きます。

| 接頭辞 | 用途 | 例 |
| --- | --- | --- |
| `user-response.` | ユーザーへの応答文 | `"user-response.moved": "{{user}} を {{channel}} に移動しました。"` |
| `embed.title.` | Embed のタイトル | `"embed.title.created"` |
| `embed.field.` | Embed のフィールド名 | `"embed.field.target_channel"` |
| `embed.description.` | Embed の本文 | `"embed.description.confirm"` |
| `ui.button.` | ボタンのラベル | `"ui.button.page_next": "次へ"` |
| `ui.select.` | セレクトメニューの placeholder 等 | `"ui.select.add_category_placeholder"` |
| `ui.modal.` | モーダルのラベル・placeholder | `"ui.modal.set_message_label"` |
| `log.` | ロガー出力 | `"log.move_executed"` |
| `audit_reason.` | Discord 監査ログの理由 | `"audit_reason.kick": "一定期間非アクティブのため自動キック"` |
| `log_prefix.` | ログのタグ（`system` 名前空間専用） | `"log_prefix.bump_reminder"` |

コマンド定義の説明文だけは接頭辞を持たず、**コマンド構造をそのままキーにします**。

```
afk.description
afk-settings.set-channel.channel.description
```

`common` 名前空間には接頭辞なしの汎用語彙もあります（`success` / `error` / `enabled` / `disabled` / `none` など）。

---

## 補間

**二重波括弧 `{{name}}`** を使います（単一波括弧ではありません）。

```typescript
// ja/features/afk.ts
"user-response.moved": "{{user}} を {{channel}} に移動しました。",

// 呼び出し側
tInteraction(locale, "afk:user-response.moved", { user: "そのざき", channel: "雑談" });
```

HTML エスケープは無効化されているため、Discord のメンション記法などをそのまま埋め込めます。

---

## 翻訳を追加する手順

1. **ja に追加** — `locales/ja/features/<機能>.ts`
2. **en に追加** — `locales/en/features/<機能>.ts` に**同じキー**で
3. **使う** — `tInteraction` / `tGuild` / `tDefault` から呼ぶ

```typescript
// 1. locales/ja/features/afk.ts
"user-response.timeout_updated": "AFK タイムアウトを {{minutes}} 分に変更しました。",

// 2. locales/en/features/afk.ts
"user-response.timeout_updated": "AFK timeout has been set to {{minutes}} minutes.",

// 3. 使用
tInteraction(interaction.locale, "afk:user-response.timeout_updated", { minutes: 30 });
```

### ⚠️ ja / en の非対称に注意

型の基準は **ja のみ**です（`i18next.d.ts` が `TranslationResources["ja"]` を参照）。この非対称性から次のことが起きます。

| やったこと | 結果 |
| --- | --- |
| **ja だけに追加** | **コンパイルは通る。** en 環境では ja へフォールバックし、日本語が表示される |
| **en だけに追加** | 型に現れないため、呼び出し側が**コンパイルエラー**になる |

**つまり「ja だけ追加」は型でも実行時エラーでも検出できません。** ja/en のキー突合を機械的に検証するテストは現状ありません。**必ず両方に追加してください。**

App Directory 掲載済みの公開 Bot であるため、英語を後回しにしないこと。

---

## 型安全性の仕組み

`src/shared/locale/i18next.d.ts` が i18next の `CustomTypeOptions` を宣言拡張しています。

```typescript
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: TranslationResources["ja"];
    returnNull: false;
    keySeparator: false;
  }
}
```

これにより `AllParseKeys`（`i18n.ts`）が `"名前空間:キー"` 形式の合併型として生成され、`tGuild` / `tInteraction` / `tDefault` / `logPrefixed` / `logCommand` の `key` 引数を縛ります。**タイポや存在しないキーはコンパイル時に落ちます。**

新しい名前空間を追加したら、`locales/{ja,en}/features/index.ts` の re-export と `locales/{ja,en}/resources.ts` への登録、`i18n.ts` の `I18N_NAMESPACES` への追加が必要です。

---

## ログの i18n

ログも翻訳ファイルを経由します（**常に ja で出力**されます）。

```typescript
// [Bot] ...
logger.info(logPrefixed("system:log_prefix.bot", "system:bot.starting"));

// [interactionCreate:command] ...  ← 第4引数でサブタグを付けられる
logPrefixed(
  "system:log_prefix.interaction_create",
  "system:interaction.unknown_command",
  { commandName: interaction.commandName },
  "command",
);

// [/vc move] ...
logCommand("/vc move", "vc:log.move_executed", { guildId, userId });
```

- `logPrefixed(prefixKey, messageKey, params?, sub?)` → `[プレフィックス] メッセージ`（`sub` 指定時は `[プレフィックス:sub]`）
- `logCommand(commandName, messageKey, params?)` → `[/コマンド名] メッセージ`

プレフィックスは `system:log_prefix.*` から引きます。機能名（`log_prefix.bump_reminder`）とイベント名（`log_prefix.interaction_create`）の2系統があります。

---

## スラッシュコマンド定義のローカライズ

コマンド名・説明は `getCommandLocalizations()` を使います。

```typescript
const desc = getCommandLocalizations("afk", "afk.description");
builder.setDescription(desc.base).setDescriptionLocalizations(desc.localizations);
```

> ⚠️ **`base` は英語です。** Discord のコマンド定義はベースを英語にし、`localizations` で `ja` を与える構成になっています（ディスカバリー審査の経緯による）。ja を base にしないでください。

---

## 言語の解決とキャッシュ

ギルドの言語は `IGuildCoreRepository.getLocale(guildId)` から取得され、`LocaleManager` が **TTL 5分**でキャッシュします。未設定・未サポート値の場合はデフォルト（`ja`）になります。

**設定を変更したらキャッシュを明示的に無効化してください。**

```typescript
localeManager.invalidateLocaleCache(guildId);
```

現在の呼び出し箇所: 言語変更（コマンド / Web API）・設定 import・設定 reset。**ここを忘れると最大5分間、古い言語で応答し続けます。**

初期化は `main.ts` で composition root の構築後に行われます（`localeManager.setRepository()` → `localeManager.initialize()` の順）。

---

## サポート言語を追加する

`ja` / `en` 以外を追加する場合、以下をすべて更新します。**1つでも漏れると実行時に落ちるか、その言語だけ翻訳されません。**

1. `i18n.ts` の `SUPPORTED_LOCALES`
2. `locales/<新locale>/` 一式（`common.ts` / `system.ts` / `features/*` 17ファイル + `index.ts` / `resources.ts`）
3. `locales/resources.ts` への登録
4. `localeManager.ts` の `resources` リテラル
5. `localeManager.ts` の `tInteraction` と `helpers.ts` の `getInteractionTranslator` の言語判定分岐
6. `commandLocalizations.ts` の `localizations` マップ
7. `helpers.ts` の `getTimezoneOffsetForLocale`
8. `guildSettings` 名前空間の `choice.locale.*`（`/guild-settings set-locale` の選択肢）

---

## トラブルシューティング

### キーがそのまま表示される

`translate()` は失敗時にキー文字列をそのまま返します。原因は次のいずれかです。

- 名前空間の指定漏れ（`"user-response.foo"` → `"afk:user-response.foo"`）
- ja 側にキーが存在しない
- `I18N_NAMESPACES` に名前空間が登録されていない

### 英語環境なのに日本語が出る

en 側にキーが無く、`fallbackLng: "ja"` でフォールバックしています。**「ja だけ追加」の典型的な症状です。**

### 言語を変えたのに反映されない

ロケールキャッシュ（TTL 5分）が残っています。設定変更処理で `invalidateLocaleCache(guildId)` を呼んでいるか確認してください。

### `@/shared/locale/...` が解決できない

`src/` 配下では `@/` エイリアスは使えません。相対パスに直してください。
