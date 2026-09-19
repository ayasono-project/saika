# saika - TODO

> タスク管理・進捗状況・残件リスト。web ダッシュボード・インフラ（VPS / Cloudflare / Coolify）は別リポジトリで管理。

最終更新: 2026年9月20日

**並び順の基準**: ①後続に影響するもの → ②前提の完了待ち → ③詳細が未設計 → ④単独で実装できるもの。各グループ内は変更の大きいものから。実害の有無・依存関係は各タスクの本文に書く。

---

## 進め方

2026-09-05 決定・2026-09-18 に順序の原則を機能単位へ改めた。目標は**メンテナンスが要らない状態にすること**。そこに効くのは機能を減らすことで、掃除とリファクタは維持コストを下げるが、ゼロにはしない。

```
機能ごとに: 残すか決める → 削除 or（掃除 → リファクタ・改善）
全体:       決めた作業を「次にやること」の順に1件ずつ → 最後にマニュアル全面修正
```

**守る順序は機能単位。** 消す予定の機能を掃除・改善するのは丸ごと無駄になるので、着手前に「その機能を残すか」が決まっていることを必ず確認する。残す機能の中では掃除を改善より先にやる（同じファイルを二度開かない）。**機能をまたぐ順序は固定しない。** 本番の穴・告知済みの変更・同じモジュールをまとめて触る、を優先して「次にやること」で並べる。2026-09-18 に vc-auto-recruit の掃除と改善を非アクティブキックの削除より前に置いたのはこのため。

**マニュアル（`docs/guides/USER_MANUAL.md`）は最後にまとめて1回。** 削除で全体の約30%（VC募集 約320行 / 非アクティブキック 約148行 / VC操作コマンド 約54行）が落ち、掃除と改善で仕様が変わる箇所も出るため、途中で直すと二度手間になる。削除する3機能は他鯖で使われていないので、その間マニュアルが実態と食い違っても実害はない。

**機能の要否は本番 DB の実測で判断した**（2026-09-05）。「他 Bot にも同じ機能がある」「Discord 標準で代替できる」は削除の根拠にしない。彩加はオールインワンが看板であり、代替可能性を根拠にすると製品コンセプトそのものを否定することになる。削除の根拠は①誰も使っていない②saika 内部で重複している③維持コストが機能価値に対して極端に高い、の3つだけ。

---

## 残タスク サマリー

| グループ | 残件 |
| --- | ---: |
| **機能削除** | **3** |
| 未決事項 | 11 |
| 後続に影響する | 5 |
| 前提の完了待ち | 9 |
| 詳細が未設計 | 2 |
| 単独で実装できる | 7 |
| **合計** | **37** |

> **次にやること（2026-09-09 決定・2026-09-18 改訂・この順で1つずつ・1件＝1 PR）**
> 機能の廃止・残機能の改善・リファクタを同時並行で考えて作業が止まったため、**設計判断に一切依存しない決定済みの作業だけ**を並べた。設計の続きはこれが終わってから戻る。
>
> **シルバーウィーク（2026-09-19〜23）のメンテとして自鯖に告知する分**（2026-09-18 草案）。1 と 3 が告知内容。2 は 3 と同じファイルを触るので先にやる。4 も同じサービスで、コードが温かいうちに続けてやる
>
> 1. `/vc` 削除（→「機能削除」）。**本番に穴が開いているので最初**。対だった `/afk` の権限修正は 2026-09-20 に develop へマージ済み。**main へは両方まとめて1本の release PR で出す**（`/afk` 単独では穴が塞がらないため）
> 2. VC自動募集のカテゴリ残骸とデッドコードの撤去（→「単独で実装できる」）。「判断が要るもの」2点は着手時に聞く
> 3. VC自動募集の誤爆抑制（入室デバウンス）（→「単独で実装できる」）
> 4. VAC 作成 VC の募集ボタン（→「単独で実装できる」）。告知には含めない。時間が無ければ 9 の後へ回してよい
>
> **機能削除と機械的な掃除**
>
> 5. `/bump-reminder-settings disable` の予約キャンセル漏れ（→「後続に影響する」）。1行差し替え＋テスト
> 6. 非アクティブ自動キック機能の削除（→「機能削除」）。大きいが機械的
> 7. VC募集機能の削除（→「機能削除」）。稼働していないので消せる
> 8. ファイル冒頭の古いパスコメント一括修正（→「前提の完了待ち」）。削除の後なら対象が減る
> 9. 未使用ロケールキーのうち明白な残骸 (a) の撤去（→「前提の完了待ち」。(b)(c) の仕分けは別途）
>
> **決定済みの改善（キック・メンバーログ）**
>
> 10. 未承認キックのログチャンネル必須化（→「後続に影響する」）。**着手前に本番 DB の実測が要る**
> 11. メンバーログ: Bot の除外 ＋ 彩加によるキックの退出ログ抑止（→「前提の完了待ち」）。10 の後
>
> **止めているもの**: 未決事項「構造リファクタをどこまでやるか」「機能改善をどこまで足すか」／ロケールキーの (b)(c) 仕分け／「遅延削除の猶予日数」「Guild 親テーブル」（機能削除で対象が減ってから詰めたほうが設計が小さくなる）。VAC の削除と「メンバーによる VC 作成」は 2026-09-17 に取り下げ（→「決定事項」）。

---

## 機能削除

**最優先。掃除より先に片付ける。** 2026-09-05 に本番 DB の利用実績を実測し、削除対象を確定した。2026-09-09 に VAC を追加したが 2026-09-17 に撤回（→「決定事項」）。残す機能は guild-settings / afk / vac / vc-auto-recruit / member-log / unverified-kick / ticket / sticky-message / reaction-role / bump-reminder / ping / message-delete / about / help。

> **マニュアル修正は各タスクに含めない。** 削除が全部終わってから「マニュアル全面修正」で一括対応する（→「進め方」）。

### 非アクティブ自動キック機能の削除 【実装・大】

**依存なし。** 実測で**有効ギルド0**（2026-09-05）。自鯖でも未使用。根拠①（誰も使っていない）。

削除して初めて分かった副次効果が大きい。常時フックしているイベントが4本あり、そのうち **`messageReactionAdd` の利用者はこの機能だけ**（`src/bot/events/messageReactionAdd.ts:5`）。

- [ ] `src/features/inactive-kick/` 一式と `/inactive-kick-settings` コマンドを削除
- [ ] `messageCreate` / `voiceStateUpdate` / `messageReactionAdd` / `guildMemberRemove` からフックを外す。**`messageReactionAdd` はリスナーごと削除できる**
- [ ] `client.ts` から **`GatewayIntentBits.GuildMessageReactions` と `Partials.Reaction` を削除**（`Partials.Message` は messageDelete 系で使うので残す）。公開 Bot でインテントを1つ落とせるのは最小権限化の方針とも噛み合う
- [ ] `clientReadyHandler` の毎時スイープジョブ登録を削除
- [ ] migration で `guild_inactive_kick_settings` と **`member_activities`** を削除
- [ ] shared の `InactiveKickSettings` / `InactiveKickTier` 系を削除 → publish → saika / web の参照を更新
- [ ] web ダッシュボードの InactiveKickPage と階層編集 UI を削除（web リポジトリ側）
- [ ] ロケール ja/en の `inactiveKick` 名前空間・help・composition root・テスト

> **未使用ロケールキーは0件だった**（2026-09-05 の全機能スキャン）。最も新しく作られて最後まで手が入っていた機能で、品質の問題ではなく需要が無かっただけ。

### VC募集機能の削除 【実装・大】

**依存なし。** 実測で**行は自鯖の1件のみ、かつ `setups` が空**（2026-09-05）。パネルチャンネルも投稿先も存在せず、機能として稼働していない。他鯖はゼロ。根拠①。

`enabled=true` になっているのは、`addSetup` が立てたフラグを**false に戻す経路が存在しない**ため（`enable`/`disable` サブコマンドが無く、teardown は `setups` から消すだけ）。さらに `vcRecruitSettingsDefaults.ts:8` のデフォルト自体が `enabled: true`。**このフラグは最初から意味を持たない。**

- [ ] `src/features/vc-recruit/` **27ファイル**と `/vc-recruit-settings` コマンドを削除（`vcRecruitButton.ts` 583行 / `vcRecruitStringSelect.ts` 213行 / `vcRecruitSettingsSetup.ts` 201行 ほか）
- [ ] 未配線のデッドコード `handleVcRecruitVoiceStateUpdate`（`vcRecruitVoiceStateUpdate.ts:20`）とその unit / integration テスト。**src のどこからも呼ばれておらずテストだけが維持している**
- [ ] migration で `guild_vc_recruit_settings` を削除
- [ ] ロケール ja/en の `vcRecruit` 名前空間（各128キー・うち**11キーは既に未使用**）
- [ ] messageDelete / channelDelete ハンドラ・composition root・help・テスト

> **「タイマー / スケジューラ実装の整理」から手書き `setTimeout` 2箇所（`vcRecruitButton.ts:416` / `vcRecruitStringSelect.ts:191`）が消える。**
> 「予約募集（イベント募集）機能」構想は「setup は既存 VC 募集と同構成」を前提にしていたが、あの構想は RSVP もリマインダーも Discord Scheduled Events 任せなので、独立して作るほうが素直。**消しても構想は死なない。**

### `/vc`（VC操作コマンド）の削除 【実装・中・バグ】

**依存なし。実害が本番に出ている。** 対だった `/afk` の権限修正は 2026-09-20 に develop へ先行マージ済み（→「完了済み」）。**本番の穴はこちらを出すまで塞がらない。** `/vc move target-member: to:AFKチャンネル` で `/afk` と同じ操作が完全に代替できるため、`/afk` 単独で main へ出しても利得がない。**両方を1本の release PR でまとめて main へ出す。**

**現状、サーバーの誰でも他人を切断・移動できる。** `/vc` に `setDefaultMemberPermissions` が無く（設定系13コマンドには全部付いている）、`executeVcCommand` にも各ユースケースにも権限チェックが無い（`vcCommand.execute.ts:43` に「管理対象チェックなしで任意のメンバー/VCを操作する」とコメントまである）。Discord は実行者の権限を見ず Bot の `MoveMembers` で実行するため、`/vc disconnect target-channel:` や `/vc move` で**通話中の VC を丸ごと吹き飛ばせる**。

`rename` / `limit` は `getManagedVoiceChannel` を通るが、これは「Bot 管理下の VC に自分がいるか」の確認で権限ではない。**VAC は作成者にだけ `ManageChannels` overwrite を付けている**のに（`handleVacCreate.ts:125`）、同席していれば誰でも改名できる。VAC の権限設計を迂回している＝根拠②。

- [ ] `src/features/vc-command/` 8ファイル485行と `/vc` コマンドを削除。テスト・help
- [ ] ロケール ja/en の `vc` 名前空間。**丸ごと消すと `/afk` が壊れる。** 共通ヘルパー3ファイルと `/afk` が `action-log.*` / `bulk-confirm.*` / `user-response.*` を参照し続けるため、**残す分を `afk` 名前空間へ移してから** `vc` を消す
- [ ] `isManagedVacChannel`（`vacSettingsService.ts`）を削除。最後の利用者が `getManagedVoiceChannel` なので `/vc` 削除と同時に消える

> **共通ヘルパー588行（`vcBulkAction.ts` 303 / `vcActionLog.ts` 169 / `vcActionTarget.ts` 116）は `/afk` が使うので残る。** ただし利用者が1つになるため、掃除フェーズで `/afk` 側に畳めば圧縮できる。
> `getManagedVoiceChannel` は `isCreatedVcRecruitChannel` を参照しているため、**VC募集の削除と互いに依存を減らし合う**。
> **`rename` / `limit` も残さない**（2026-09-09 確定・2026-09-17 に根拠を差し替え）。VAC は作成者に `ManageChannels` overwrite を付けているので、作成者は Discord の設定画面から名前・人数を変えられる。同席しているだけの人は変えられなくなるが、それが VAC の権限設計どおり。
> **`disconnect` を消すと、部屋の作成者が同席者を切断する手段が無くなる**（Discord の切断には `MoveMembers` が要り、`ManageChannels` overwrite では足りない）。管理者に頼む運用になる。マニュアル全面修正時に1行書く。

---

## 未決事項

決めないと先へ進めないもの。**勝手に決めないこと。** 各項目の「止まっているもの」が、決まると動き出す。

### 構造リファクタをどこまでやるか

**止まっているもの**: 掃除フェーズの作業量が確定しない

残骸撤去（判断不要・一律やる）とバグ修正（判断不要・直す）とは別に、**動作を変えない構造の作り直し**をどこまでやるか。候補は「タイマー実装の統一」「`messageDeleteService.ts` 589行の分割」「`/vc` 削除後の共通ヘルパー588行を `/afk` 側へ畳む」「`vcAutoRecruitSettingsService.updatePartial` の read-modify-write（並行呼び出しで lost update の余地）」。

- **A: やらない** — 動いているものは触らない。残骸撤去だけで読みやすさは十分上がる
- **B: 絞ってやる（推し）** — タイマー実装の統一だけ。3通りの書き方が散っていて、**次に何か直すとき必ず引っかかる**ため
- **C: 全部やる** — 本番稼働中の機能に触るリスクとテスト工数が乗る

> **判断軸は「将来触る必要が出るか」。** メンテ不要化が目標なら、今後いじらないコードは汚くても維持コストを生まない。589行のサービスも、動いていて触らないなら分割する意味は薄い。

### 機能改善をどこまで足すか

**止まっているもの**: 掃除フェーズの作業量が確定しない ／ マニュアル全面修正の範囲

**仕様が変わる＝マニュアルに影響する**ため、残骸撤去やリファクタとは性質が違う。候補は5件。うち4件は 2026-09-17〜18 に個別に「やる」と決めて「次にやること」に入れた: VC自動募集の誤爆デバウンス／VAC 作成 VC の募集ボタン／メンバーログの Bot 除外／彩加によるキックの退出ログ抑止。残る未決は `/ping` の ephemeral 化（現状 public 応答で誰でも公開チャンネルに結果を出せる）と、今後出てくるものをどう扱うかの方針だけ。

- **A: やらない** — 現状の挙動で困っていないなら足さない
- **B: 実害か明確な需要があるものだけ（推し・実績上もこれ）** — 上の4件はいずれも実害（誤爆・二重ログ）か自鯖の需要（募集ボタン・Bot 除外）で決めた。それ以外は出てきた時に個別判断
- **C: 気づいたものは全部** — 際限がなくなる

### 遅延削除の猶予日数

**止まっているもの**: 退出時データの遅延削除

30日 / 7日 / それ以外。

- 猶予の意味は「バックアップの保持期間」ではなく「**うっかり外した人が気づいて入れ直すまでの猶予**」と確定済み
- この根拠に立つなら**短いほうがプライバシー的に正しい**
- **プライバシーポリシーへの保持期間明記が必須**になるため、値が決まらないと文面も書けない

### Guild 親テーブル ＋ カスケードにするか

**止まっているもの**: 退出時データの遅延削除（実装量が変わる）／ `deleteAllSettings` のレジストリ化（採用すると不要になる）

緊急性は消えており（追従漏れバグ修正で削除漏れは塞いだ）、純粋な構造改善の判断。

- **利点**: Guild 行を1つ消せば全部消える → 遅延削除が「猶予後に Guild 行を削除」で済み実装が激減。新テーブル追加時にリレーション必須になり**同じ漏れが構造的に起きなくなる**。遅延削除関連の保存項目（導入日時・削除予定日時）の置き場所にもなる
- **欠点**: マイグレーションが重い（バックフィル＋FK付与）。**現状スキーマに `@relation` は1つも無く、FK制約はゼロからの導入**。孤児レコードがあると FK 作成が失敗するため、事前に本番で孤児の有無を SELECT する必要がある（追従漏れバグ修正より前の削除漏れで孤児が存在する可能性が高い）
- **単独で着手する作業ではない。** 採用するなら遅延削除と1つの塊として設計する

### bump リマインダー「遅すぎる通知」の上限値

**止まっているもの**: bump-reminder のポーリング化

方針は「**送る。ただし上限を設ける**」で確定済み、値だけが空欄。

- 上限を設ける理由はUXではなく**事故防止**（古い pending を掘り起こして送らないため）
- 24時間程度が妥当かという話まで出ている
- 実装はポーリングのクエリ条件が範囲指定になるだけ（`now - 上限 < scheduledAt <= now`）

### メッセージ出力機能の設計

**止まっているもの**: メッセージ出力機能（作業範囲を切れない）

- **機能拡張アイデアの「ユーザー embed 作成機能」との関係。** あちらは一般ユーザー向けで「投稿先チャンネルでのそのユーザーの送信権限で判定」という権限委譲設計が本体。こちらは管理者向けのお知らせ投稿。**別機能として並べるか、1つに統合するかを先に決める**（統合するなら権限判定の設計はあちら側が一次情報源）
- 投稿後の**編集・再送**を持つか（持つなら投稿メッセージの所有権を DB に持つ必要がある）
- `@everyone` / role メンションの扱い（`allowedMentions` での抑止と、Mention Everyone 権限保持時のみ許可するか）
- ダッシュボードからの投稿を **OAuth ユーザーのギルド権限でどう判定するか**（現状の Web API は `guildId ∈ jwt.guilds` の粒度しか見ていない）

### メンバーログ出力先分離の方式

**止まっているもの**: メンバーログの join/leave 出力先分離

- **A: `joinChannelId` / `leaveChannelId` へ分割**（既存 `channelId` を両方にバックフィルして廃止）。設定が常に明示的になるが、片方だけ使いたいときも2つ埋める必要がある
- **B: `channelId` を既定値として残し、`joinChannelId` / `leaveChannelId` を任意の上書きとして追加**。既存ギルドは無変更で済み、分けたい人だけ設定する

> キック機能の `notifyChannelId` / `logChannelId` と**同じ形にする必然性はない**。あちらは「宛先が違う2種類の通知」の分離、こちらは「同じ用途のイベント別出力先」で、性質が異なる。

### DM 通知トグル化の詰め残し

**止まっているもの**: キック機能の DM 通知トグル化（未承認キックのログチャンネル必須化の完了後）

1. 非アクティブ側 DM のテンプレート設計 — DM 専用テンプレートを新設するか、既存の `weekWarnMessage` / `finalWarnMessage` / `kickMessage` を流用するか（未承認側は `dmTemplate` と `notifyTemplate` を別々に持っている）
2. 不達として扱う範囲 — Discord API エラー 50007（DM 閉鎖）のみか、全ての送信失敗か
3. soft warning を入れるか — DM 有効かつ通知チャンネルが一般メンバー非公開の場合に警告を出すか（**不要寄り・未確定**）
4. 不達0人のときにもまとめログを出すか

### `resetAll` の要否 ＋ 機能単位 reset を足すか

**止まっているもの**: なし（着手時期未定）

`reset`（**`locale` と `errorChannelId` の2項目のみ**・確認済み）と `reset-all`（全消し）の間が空白で、ユーザーが小さい目的のために過剰な手段を取らされる構造 → **誤爆シナリオの温床**。両者は一体で判断する。

- **遅延削除の採用が決定したため `resetAll` は「要る」側で確定に近い**（即時削除の経路がここだけになるため）
- export/import 廃止により**誤爆時の復旧手段が無くなる**ため、確認の強度がより重要になる。残すなら、日常設定コマンドからの隔離と、サーバー名の手入力のような強めの確認（GitHub のリポジトリ削除方式）を併せて検討する

> **即時削除の経路はもう1つある**: Web API の `POST /:guildId/reset-all`（追従漏れバグ修正で `purgeGuildDataUsecase` に差し替えた3経路目）。ダッシュボードからの削除をどう扱うかもセットで判断が要る。

### 変更履歴を作るか

**止まっているもの**: なし（着手時期未定）

動機は「前どういう文面にしてたっけ？」であり、**バックアップではなく変更履歴の需要**。有力案は `setting_change_log(guildId, feature, field, oldValue, newValue, changedBy, changedAt)` をリポジトリ層でフックし、対象を**文面フィールドだけに絞る**（7機能程度）。

> ⚠️ 「JSONで吐いて後から戻せるように」を足すと軽さの根拠が全部消えて **export/import に逆戻りする**。「見えるだけ」で不便ならUIで解決する（履歴をクリックで入力欄に流し込む。保存は従来通り管理者が押す）。

### `findAllPending()` の絞り込み

**止まっているもの**: なし。ポーリング化で論点ごと消える可能性がある

起動時復元を「Bot が現在参加中のギルドのみ」に限定するか。追従漏れバグ修正で新規のゴミは出なくなったので緊急性なし。

> **ポーリング化で `restorePendingReminders` 自体が消えるなら、この論点も一緒に消える。単独で着手しないこと。**

---

## 後続に影響する

下流のタスクの前提を決めてしまうもの。遅延削除とポーリング化は未決事項でブロックされている。

### 退出時データの遅延削除 ＋ guildCreate ハンドラ ＋ 導入時／再導入時の通知 【実装】

**未決**: 猶予日数 ／ Guild 親テーブル（→「未決事項」）。**決まるまで着手できない。**

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

> **遅延削除は「データの削除」を遅らせるが、「実行中のジョブの停止」は遅らせてはいけない。** 猶予期間中 Bot はそのギルドに居ないので、ジョブが生きていると送信に失敗してエラーログを吐き続ける。**退出時にジョブは即停止、データは猶予後に削除。**

**棚卸しへの影響**: `purgeGuildDataUsecase` は reset-all 経路で**残る**（即時削除は消えないため）。遅延削除で変わるのは「`guildDelete` から呼ぶ経路」だけ。

### 未承認キックのログチャンネル必須化 【実装・中】

**依存なし。着手前に本番 DB の実測が要る。** 2026-09-18 決定。DM 通知トグル化と「メンバーログ: Bot の除外 ＋ 彩加によるキックの退出ログ抑止」の前提。

**現状はサイレントキックが成立する。** `enable` は認証ロールと Bot の `KickMembers` しか見ておらず（`unverifiedKickSettingsCommand.simple.ts:289-311`）、`logChannelId` 未設定でも有効化できる。日次実行は「チャンネルが不正なら当該通知のみスキップ・キックは継続」の設計（`unverifiedKickRunner.ts:509`）なので、ログチャンネルが無いギルドではキックまとめがどこにも出ず、誰が消えたか記録が残らない。メンバーログが有効でも「退出」としか見えない。

**通知チャンネルは任意のまま。** 予告 DM は通知チャンネルと無関係に必ず送る設計（`unverifiedKickRunner.ts:577-579`）で、メンバー側のベースラインは既にある。「DM だけでいい」サーバーの選択も残す。ただし「DM 通知トグル化」で DM を切れるようにする時は、その時点で通知チャンネルも必須にする（DM-only 禁止の原則はあちらに書いてある）。

**やること**（既存の実行時無効化 `disableAndNotify` → `disableInvalid` を流用するので小さい）

- [ ] **本番 DB で「enabled かつ `logChannelId` が null」の件数を実測する。** 0 なら誰にも見えない変更。いくつかあれば、その鯖は次回の日次実行で通知付きで止まるのでリリースノートに1行要る
- [ ] `enable` 時に `logChannelId` 未設定なら ValidationError（認証ロール未設定と同じ扱い）
- [ ] 日次実行時にログチャンネルが解決できなければ、認証ロール消失などと同じ `disableAndNotify` で無効化する。既存ギルドは次回実行で自動的にこの経路に乗るので migration も `disabledReason` の永続化も要らない
- [ ] **無効化通知のフォールバック。** `disableAndNotify` は今ログチャンネルにしか送らず（`unverifiedKickRunner.ts:416-417`）、ログチャンネルが無い時は黙って止まる。guild-settings のエラーチャンネル（`notifyWarnChannel`）→ システムチャンネルの順で落とす。既存の「認証ロール消失で無効化」にも同じ穴があるので一緒に塞がる
- [ ] `clear-log-channel` は有効中なら拒否して「先に disable」と返す
- [ ] web の PATCH で `enabled=true` の検証を揃える
- [ ] ja/en ロケール・テスト

> **取り下げたもの（2026-09-18）**: 非アクティブキックとの対称化（片側が消える）／`notifyChannelId` / `logChannelId` の分離（未承認側は分離済み）／`disabledReason` 列の追加（既存の無効化通知と `view` の enabled 表示で足りる）／`set-notify-channel` リネーム（非アクティブ側の話だった）。旧設計は Notion「Saika バグ修正〜キック機能整理〜マニュアル修正 実行計画（2026-07-29 アーカイブ）」。

### bump-reminder のポーリング化 【実装】

**未決**: 遅すぎる通知の上限値（→「未決事項」）。**決まるまで着手できない。**

動機はバグ修正ではなく**構造の単純化とメンテナンス性**。復元まわりは調査の結果ちゃんと作られていた。「キャンセルが2つある」構造上の問題の解消が本来の目的。

**やること**: ①一定間隔で回るジョブを1本立てる ②「status=pending かつ scheduledAt <= 今」を拾う（上限は未決事項で決める値で範囲指定） ③送信する ④status を sent にする

**消えるもの**: メモリ上の `Map<string, ScheduledReminderRef>` / `restorePendingReminders` / `cancelScheduledReminder` / `cancelReminder` と `cancelByGuild` の使い分け

> **独自 Map の廃止は「タイマー / スケジューラ実装の整理」から切り出してここに寄せている。** bump-reminder だけが `jobScheduler` に独自 Map を重ねており、チケット自動削除は決定的 jobId のみで同じことを実現できている。ポーリング化を採らない判断になった場合でも、**ticket 方式へ寄せるだけで Map は消せる**（その場合は整理タスク側へ戻す）。

**移行時に落としてはいけないもの**

- 期限切れの即時実行 → クエリ条件が等価になる。楽
- **重複の正規化**（同一 guild+service の pending を最新1件に）→ 現在はメモリ上の Map が担保している。**DB側で担保し直す必要がある。最大の移行ポイント**（`serviceName` が nullable な点に注意）
- 遅すぎるものの扱い → 未決事項の上限値
- **送信失敗時の status 更新 → 新方式で新たに必要。**更新しないと永久に拾い続ける
- **disable / reset で予約をキャンセルすること** → メモリ解除が無くなる分、DB 側で `pending` → `cancelled` にしないと「無効化 → 予定時刻前に再有効化」で古い予約が発火する。「`/bump-reminder-settings disable` が予約をキャンセルできていない」を参照

**既にある資産**: schema の `@@index([status, scheduledAt])`（確認済み）、`jobScheduler`

**同時に棚卸しするデッドコード**（2026-08-19 確認）

- `bumpReminderRepository.cancelByGuild()` — 本番コードからの呼び出し**ゼロ**。`BumpReminderManager.cancelAllForGuild` は Manager 側の別物で、これを置き換えてはいない。⚠️ **ただしポーリング化後の disable / reset は「DB の pending を cancelled にする」ことが必要になり、それはこのメソッドそのもの。消す前に受け皿の要否を判断すること**
- `bumpReminderRepository.cancelByGuildAndChannel()` — **同じく呼び出しゼロ**
- 追従漏れバグ修正で新設した `cancelAllForGuild` もポーリング化で不要になりうる

### Bot ステータスをサーバー参加・退出時に更新する 【実装・小】

**依存なし。小さい。**

`applyBotPresence()` は稼働サーバー数をプレゼンスに反映するが、呼び出し元が `clientReady` / `shardReady` / `shardResume` の3箇所しかない（`src/bot/handlers/clientReadyHandler.ts:74-79`）。**`guildCreate` / `guildDelete` では更新されないため、再起動または再接続まで古いサーバー数が表示され続ける。**

- [ ] ギルド参加時にプレゼンスを更新する
- [ ] ギルド退出時にプレゼンスを更新する

> **退出時データの遅延削除と実装が重なる。** 遅延削除も `guildCreate` ハンドラの新設を必要とするため、**先に着手したほうがハンドラを作り、もう一方はそこに乗せる**。二重に作らないこと。
> `applyBotPresence` は `clientReadyHandler.ts` 内のプライベート関数なので、外から呼ぶには export するか共通モジュールへ切り出す必要がある。

### `/bump-reminder-settings disable` が予約をキャンセルできていない 【実装・小・バグ】

**依存なし。最小。** 2026-08-20 の棚卸しで発見（既存の記載なし）。

> **要件は「disable したら予約が消えること」であって、`cancelAllForGuild` に差し替えることではない。** 実装手段はポーリング化の前後で変わるが、要件は変わらない（下記）。

`handleBumpReminderSettingsDisable`（`src/features/bump-reminder/commands/bumpReminderSettingsCommand.disable.ts:29`）が `cancelReminder(guildId)` を呼んでいるが、実リマインダーは常に複合キー `"guildId:serviceName"` で登録される（`scheduleBumpReminder` は `serviceName` を必須引数で受け取る）。`toBumpReminderKey(guildId, undefined)` は素の `guildId` を返すため**完全一致照合が1件もヒットせず、タイマーが解除されない**。

`f79d703` で reset 系3経路（reset-all / guildDelete / Web API）は `cancelAllForGuild` に差し替えたが、**disable だけ取り残されている。** `cancelAllForGuild` の JSDoc は「ギルド単位の後始末では必ず本メソッドを使うこと」と明記しており、それに違反している唯一の呼び出し元。

**影響範囲**: 送信直前に `sendBumpReminder` が最新設定を再取得して `enabled=false` なら抑止するため、**無効化したまま誤送信されることはない**。実害が出るのは **disable → 予定時刻より前に enable し直した場合**で、解除されなかった旧タイマーがそのまま発火し、無効化前の bump に対するリマインダーが送られる。

- [ ] `cancelReminder(guildId)` → `cancelAllForGuild(guildId)` に差し替え（`cancelAllForGuild` はメモリ解除と DB の `status=cancelled` を両方やるので、これ1本で足りる）
- [ ] 回帰テストは **「disable 後にそのギルドの pending が残っていないこと」** を見る（メモリ上の Map を直接覗かない。ポーリング化で Map ごと消えてもテストが生き残る形にする）

> ⚠️ **ポーリング化しても自動的には消えないバグ。** 消えるのは*メカニズム*（複合キー照合のすれ違い）だけで、*要件*は残る。ポーリング後は「`status=pending` かつ `scheduledAt <= now`」で拾う形になるため、**disable が pending 行を cancelled にしなければ、disable → 予定時刻前に enable で同じ症状が再現する。** その DB 側キャンセルこそ `bumpReminderRepository.cancelByGuild()` で、いま「デッドコードだから消す」候補に入っているもの。**ポーリング化の棚卸しで消すと決める前に、この経路の受け皿になるかを必ず確認すること。**

---

## 前提の完了待ち

前提となるタスク・外部条件が片付けば着手できるもの。

### 未使用ロケールキーの一括撤去 【実装・中】

**機能削除の完了待ち。** 削除する2機能ぶん23件が先に消えるので、後にやるほど対象が減る。

2026-09-05 に全名前空間をスキャンし、**未使用候補88件**を検出（代表4件を実地検証し、ロケール定義にしか存在しないことを確認済み）。全体は1000件超なので約8%。

| 名前空間 | 未使用 / 全体 | 中身 |
| --- | ---: | --- |
| **system** | 33 / 135 | `web.*` 16件（**Web API の認証・セッションのメッセージが丸ごと**）/ `database.*` 8件（旧 DB ロギング層）/ `log_prefix.*` 7件 / `shutdown.*` 2件 |
| **common** | 9 / 66 | `database.*` 6件（system と対）/ `validation.error_title` / `general.error_title` / `title_move_failed` |
| vcAutoRecruit | 13 / 88 | カテゴリ系12 ＋ `log.post_failed`（→「VC自動募集のカテゴリ残骸とデッドコードの撤去」に含む） |
| vcRecruit | 11 / 128 | 機能ごと消えるので対象外 |
| bumpReminder | 5 / 85 | **`user-response.reminder_message_disboard` / `dissoku`**（リマインダー本文そのもの）/ `embed.description.config_view` ほか |
| messageDelete / stickyMessage / ticket | 各 3 | |
| vac | 3 | トリガー設定系の残骸（`user-response.trigger_not_found` / `embed.title.remove_error` / `embed.field.name.created_vcs`）。VAC は残すので (a) として撤去 |
| afk / memberLog | 各 2 | |
| reactionRole | 1 | |

**注意: 残骸と実装漏れは見分けが要る。** 未使用キーは「消し忘れ」とは限らず、「本来使うはずが繋がっていないバグ」の可能性がある。bump-reminder のリマインダー本文2種が未使用なのは特に疑わしい。

**やること**

- [ ] 削除機能ぶん23件を除いた**65件**を3分類する。**(a) 残骸**（実装もマニュアル記載も無い → 撤去するだけ・判断不要）／**(b) 仕様判断**（実装は無いがマニュアルに載っている → 復活か仕様ごと廃止かを決める）／**(c) 実装漏れ**（実装は生きているのにキーが使われていない → **バグ**）
- [ ] (b)(c) だけを一覧にして判断を仰ぐ。(a) は件数と一覧の提示のみで1件ずつ議論しない
- [ ] (c) はバグ修正として切り出す（`system:web.*` 16件は、認証エラー応答が英語ハードコードになっていれば i18n 漏れ）
- [ ] ja / en 両方から撤去し、テストを通す

> **判定基準は `docs/guides/USER_MANUAL.md`。** specs は削除済みで、現行仕様の一次情報源はこれしかない。2026-08-19 に実装との乖離を突き合わせ済みなので基準として使える。
> ロケールキーからは出てこない乖離（マニュアルにあるのに実装に無い）は、この作業の後に別途洗う。

### ファイル冒頭の古いパスコメント一括修正 【実装・小】

**機能削除の完了待ち。** 削除する3機能のファイルも対象に含まれるため、先に消せばその分減る。

ディレクトリ再編（2026-05-29 完了）の追従漏れで、**196ファイル**が冒頭コメントに旧パス `// src/bot/features/...` を書いている（実際は `src/features/...`）。`src/features/` 配下のほぼ全域。

- [ ] `sed` で一括置換し、typecheck / lint / test を通す

> **ゼロリスクだが単独でコミットする。** 他の変更と混ぜると差分が196ファイルに埋もれてレビュー不能になる。

### キック機能の DM 通知トグル化 【実装】

**未承認キックのログチャンネル必須化の完了待ち。** 指示書: Notion「Saika キック機能 DM通知トグル化 実装計画」

> ⚠️ **非アクティブ自動キックの削除で作業量が半減する（2026-09-05）。** トグル4本 → 2本。「非アクティブ側の DM 送信実装」は丸ごと不要になり、未承認側は `sendWarnDms` が実装済みなのでトグルを被せるだけになる。**着手前に指示書の前提を読み直すこと。**

未承認・非アクティブの両キック機能に DM 通知の on/off トグルを追加する。事前通知のベースラインは**通知チャンネル（必須）**で、DM は**到達率ブーストの上乗せオプション**という位置づけ。**DM-only 構成は許可しない**（DM は相手の設定次第で送信行為自体が成立せず、予告の基盤にできないため）。

> ⚠️ **着手前に前提を必ず確認すること。** 指示書は「`enabled=true` に `notifyChannelId` / `logChannelId` の両方必須」を前提としているが、必須化タスク（2026-09-18）で必須にするのは**ログチャンネルだけ**。通知チャンネルの必須化は**本タスクに含める**。**通知チャンネル必須のバリデーションが無いまま DM トグルを入れると、通知チャンネル未設定 + DM オフで「誰にも予告が届かないままキックされる」構成が作れてしまう。**

**この順に上から実装する**（1つ = 1 PR）

- [ ] **トグル4本の追加**（警告 DM / キック時 DM × 未承認 / 非アクティブ）。**デフォルトは現状の振る舞いを再現する値**にする（未承認の警告 DM のみ true、他3本は false）。非アクティブ側を true にすると**アップデートした瞬間に既存サーバーで突然 DM が飛び始める**ため厳禁
- [ ] **非アクティブ側の DM 送信実装**（未承認側は `sendWarnDms` が実装済みでトグルを被せるだけ。非アクティブ側は新規）。**逐次 `for...await` を踏襲し `Promise.all` の一斉送信は禁止**
- [ ] **DM 不達まとめログ**（logChannel へ日次集約 Embed）。現状 `catch(() => {})` で失敗を握りつぶしており**不達情報がコード上に存在しない**ため、収集する形に変えるところから
- [ ] **ja/en locale ・ マニュアル修正**

**落としてはいけない原則**

- **「送信試行 = 警告済み」**（DM の成否ではなく試行で警告済みを立てる）。未承認側は既にこの方針で実装済みで、非アクティブ側に踏襲するだけ。**不達を検知できるようになっても変えないこと**（DM 拒否がキック回避策になる）
- 警告は**到達保証ではなくベストエフォート**。長い猶予期間が本来のセーフティネットで、警告は補助

> **export/import 削除との順序に注意。** 指示書は「エクスポートの3点セットを必ず更新」「バージョン互換を保て」と指示しているが、**export/import 削除が先に完了していればこの作業は丸ごと不要**になる。着手時点でどちらが済んでいるかを確認すること。

**未決**: DM 設計の詰め残し4件（→「未決事項」）。前提が済んでも、これが決まらないと実装に入れない。

### メンバーログ: Bot の除外 ＋ 彩加によるキックの退出ログ抑止 【実装・小】

**未承認キックのログチャンネル必須化の完了待ち**（抑止を条件なしにするため）。Bot の除外だけなら依存は無いが、同じハンドラを触るので1 PR にまとめる。2026-09-17〜18 決定。

**Bot の除外（無条件・設定にしない）**

- [ ] `guildMemberAddHandler.ts` / `guildMemberRemoveHandler.ts` の冒頭で `member.user.bot` ならスキップ

> 今は Bot の参加・退出も全部出る。招待リンクは Bot が使わないので「不明」か同時に入った人間の招待を誤って拾い、アカウント年齢・滞在期間も Bot には意味が無い。Bot の追加・削除は管理者しかできず Discord の監査ログにも残る。トグルにすると DB 列・shared・web UI・サブコマンド・ロケールが要るので**2行のスキップで済ませる**。欲しいサーバーが出たらその時にトグルを足す。他サーバーの挙動も変わるのでマニュアルとリリースノートに1行書く。

**彩加によるキックの退出ログ抑止**

- [ ] `bot/shared` に「彩加が今キックした人」を60秒ほど覚える `TtlMap`（キーは `guildId:userId`）を1つ置く
- [ ] 未承認キックの `processKicks` が `member.kick()` の直前に登録する（非アクティブキックは消えるので書き手はここだけ）
- [ ] メンバーログの退出ハンドラは載っていればスキップする
- [ ] テスト: 未承認キックで退出 Embed が出ない／通常退出では出る／60秒過ぎたら通常どおり

> 今は `member.kick()` のあと guildMemberRemove が来て、メンバーログの退出 Embed と未承認キックのキックまとめが両方出る。必須化でキックまとめが必ずログチャンネルに出るようになるので、退出 Embed 側を黙らせて1回にする。**必須化より先に入れる場合は「ログチャンネルが解決できた時だけ登録する」の条件が要る**（無いと、ログチャンネル未設定のサーバーでキックがどこにも残らない）。

### export / import の削除 【実装】

**退出時データの遅延削除の完了待ち。** 順序を逆にしないこと。

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

**マニュアル**: 「設定をエクスポートする」「設定をインポートする」セクションを削除し、「⚠️ Bot をサーバーから除外する場合」を**遅延削除の説明に書き換える**（ドキュメント修正で直した export 記述はここで消える）。

> **既知の未修正バグ（削除により解消）**: `getFullSettings` は `GuildSettings` 行が無いと即 `null` を返すため（`guildSettingsAggregateRepository.ts:93-94`）、`/guild-settings set-locale` も `set-error-channel` も実行していないギルドでは、他9機能が設定済みでも export が「設定がありません」で失敗する。**削除するため修正しない方針**だが、遅延削除の実装までの期間は「除外前に export しようとして失敗 → 設定が無いと誤解 → そのまま Bot を外してデータ消失」という導線が残る。遅延削除が長引く場合は暫定修正を検討する。

### `deleteAllSettings` のレジストリ化 【実装・条件付き】

**未決**: Guild 親テーブル（→「未決事項」）。カスケードを採るなら本タスクごと不要になる。設計判断の詳細は Notion「Saika バグ修正〜キック機能整理〜マニュアル修正 実行計画（2026-07-29 アーカイブ）」。

`Prisma.TypeMap` から「`guildId` スカラーを持つモデル名」の union を導出し、後始末処理をその union の `Record` として保持する。意図的に削除しないモデルは列挙から外すのではなく `{ action: "skip", reason: "..." }` のようにレジストリの値として書く（外すと網羅性チェックが無意味になる）。

**検証**: レジストリからモデルを1つ意図的に削り、コンパイルエラーになることを確認する。

### パッケージ更新 【保守・中】

**掃除の完了待ち。** 消す予定のコードを型エラー修正やテスト移行の対象にするのは丸ごと無駄になるため（→「進め方」）、機能削除とデッドコード撤去が終わってから着手する。2026-09-20 に棚卸し。

**掃除を待つ理由があるのは2件だけ。**

- [ ] **vitest 4 → 5 ＋ @vitest/coverage-istanbul 4 → 5**（必ず同時）。vitest 5 は coverage の include/exclude をプロジェクトルート相対の厳密マッチに変える。`vitest.config.ts` の `src/bot/features/**` 系は該当ディレクトリが存在せず既に死んでいるため、厳密マッチ化でカバレッジの分母が動く。3機能の削除も同じ閾値を動かすので、先に上げると閾値調整が2回発生し、同一 PR に混ぜると閾値割れの原因を切り分けられない
- [ ] **typescript 6 → 7**。TS 7 が削除した `baseUrl` / `target:es5` / `moduleResolution:node10` はどれも未使用で、`erasableSyntaxOnly` と `isolatedDeclarations` は「TS 7 対応」として有効化済み。移行コストは残っておらず、比例するのは新規に出る型エラーの修正だけ。急ぐ理由が無いので掃除の後でよい

**掃除を待っても作業量が変わらないもの**（掃除と1ファイルも重ならない。掃除の途中で入れてよい）

- [ ] ランタイムの minor / patch を1 PR（fastify / prisma 3点は必ず同時 / discord.js / pg / jose / i18next / zod / node-cron / @fastify/cookie / @fastify/cors）。discord.js 14.27.0 は undici の厳密固定を緩めるので `pnpm audit` のノイズが減る。prisma 系は Dockerfile 内で `prisma generate` が走るため `docker build` ＋ `docker run` の実機検証が要る
- [ ] dev 依存を1 PR（biome / commitlint 2点 / lint-staged / tsx / @types/pg）。Dockerfile の runner が `--prod` で落とすので本番イメージは1バイトも変わらない。biome は `biome.json` が `"recommended": false` で有効ルールを明示列挙しているため、パッチ更新で新ルールが既存コードに発火しない
- [ ] **`@types/node` を 25 系から 24 系（24.13.6）へ引き下げる。** Node 25 は 2026-06-01 に EOL で、実行環境は Node 24 LTS（`node:24-slim` / `engines >=24`）。型定義だけ死んだ系列を指している。26 に上げると逆に Node 24 に無い API の型が通る
- [ ] dotenv 17 → 18（単独 PR）。削除されたのは `node -r` プリロードと .env.vault で、使っている `"dotenv/config"` サブパスは v18 にも残る。使用箇所は `env.ts` と `prisma.config.ts` の2ファイルのみ。major かつランタイムなので他と混ぜない。**着手前に CHANGELOG を1度確認する**（未検証）

**期日が外部で決まるもの**

- [ ] **Node 24 → 26**。26 の LTS 入りは **2026-10-28**。それまでは上げない。上げるときは `.node-version`（CI 2ワークフローと mise が参照）・Dockerfile の2箇所・`engines`・`@types/node` を1つの PR でまとめ、`docker build` ＋ `docker run` でフル起動まで確認する
- [ ] **prisma 8**。現在の最新は `8.0.0-rc.15` で RC。本番稼働中の Bot に RC は入れない。GA は2026年10月予定。上げるときは `prisma` / `@prisma/client` / `@prisma/adapter-pg` を必ず3点同時に

> **Coolify のビルドは1本ずつ。** develop に複数 PR を積んでも、main へのリリースは1回にまとめる。
> **`@fastify/rate-limit` の CVE 対応はこのタスクに含めない。** 脆弱性なので掃除を待たず、版上げとレート制限キーの修正をまとめた別タスクとして扱う（2026-09-20 時点で起票待ち・着手順を要判断）。

### マニュアル全面修正 【文書・大】

**機能削除・掃除・リファクタ・改善がすべて終わってから、まとめて1回**（→「進め方」）。2026-09-05 に方針変更し、それまで機能ごとに分散していたマニュアル修正タスクをここへ集約した。

**削除で落ちる分だけで全体（約1750行）の約30%。**

| セクション | 行数 |
| --- | ---: |
| VC募集機能（376-659）＋ FAQ「VC募集機能について」（1690-1725） | 約320 |
| 非アクティブ自動キック機能（1356-1503） | 約148 |
| VC操作コマンド（186-239） | 約54 |

**やること**

- [ ] 削除3機能のセクションと FAQ 項目を落とす
- [ ] 「機能一覧」（47-66）と「Botに必要なサーバー権限」（27-46）から該当記述を削除
- [ ] `/afk` の変更を反映（target 必須化・自分を飛ばす用途の廃止・既定は `MoveMembers` 持ちのみ）。`/vc` 削除で部屋の作成者が同席者を切断できなくなる点（管理者に依頼）も書く
- [ ] **「コマンドの利用権限を変えたい」の節を新設**（2026-09-09）。Discord の サーバー設定 → 連携サービス → 彩加 → コマンド で、ロール・メンバー・チャンネル単位に許可／拒否できることを説明する。**Bot 側の既定（`setDefaultMemberPermissions`）はこの画面では表示されず、管理者の上書きだけが表示される**点も書く。例は `/afk`（既定はモデレーター専用 → 「VC 係」ロールに `MoveMembers` を付けずに `/afk` だけ許可する手順）。設定系コマンドを特定ロールに委任する場合も同じ手順であることを添える
- [ ] VC自動募集の変更を反映（入室デバウンス・VAC 作成 VC の募集ボタン。カテゴリ記述が残っていれば削除）
- [ ] export / import のセクションを削除し「⚠️ Bot をサーバーから除外する場合」を**遅延削除の説明に書き換える**（→「export / import の削除」）
- [ ] 未承認キックのログチャンネル必須化を実施した場合はその差分（`enable` にログチャンネル必須・有効中の `clear-log-channel` 拒否・未設定時の自動無効化と通知先）。メンバーログの Bot 除外とキック時の退出ログ抑止も反映。**実装後のコードを実際に読んで確認してから書くこと**
- [ ] 冒頭の「最終更新」日付を更新

> **ついでに招待 URL の権限（`INVITE_PERMISSIONS`）を見直せる。** 3機能が消えて不要になる権限があるかもしれない。ただし削除完了後に何が実際に不要になったか確定してから。
> **`/help` のコマンド一覧はコード側**なので、各削除タスクで自動的に正しくなる。マニュアルだけが遅れる形になるが、削除3機能は他鯖で使われていないため実害はない。

### Bot 一般公開準備

- [ ] `/about` の充実（**LP 公開時に実施**）— 公式サイト（`OFFICIAL_URL`）に加え各種リンクを追加: ダッシュボード（`DASHBOARD_URL`）/ GitHub ソース（AGPL 公開リポ）/ ユーザーマニュアル（`USER_MANUAL_URL`）。LP 完成まで現状維持
- [ ] Discord Bot 認証申請（75 サーバー到達後）

> AGPL 化・`/about` 新設・help へのダッシュボードリンク・日本語ローカライズ復活は完了済み（完了済みセクション参照）。

---

## 詳細が未設計

着手前に設計判断が要るもの。**勝手に決めないこと。**

### メッセージ出力機能 【機能追加】

Bot 名義で任意のメッセージ（プレーンテキスト / embed）を指定チャンネルへ投稿する機能。**コマンドはモーダル入力、ダッシュボードからも投稿できるようにする。**

**既にある資産**

- Bot 側のモーダル入力は前例多数（`stickyMessageSet` / `reactionRoleSettingsSetup` / `vcAutoRecruitSettingsCommand.setMessage` 等）
- web 側は `components/embed/EmbedEditor.tsx` / `EmbedPreview.tsx` が既にあり、sticky / tickets / reaction-roles の3ページで使用中。**embed 編集 UI は流用できる**

**未決**: 設計4件（→「未決事項」）。決まるまで作業範囲を切れない。

### メンバーログの join/leave 出力先分離 【機能改善】

現状 `GuildMemberLogSettings` は `channelId` 1本（`prisma/schema.prisma:77-85`）で、参加ログ（`guildMemberAddHandler.ts:31,37`）と退出ログ（`guildMemberRemoveHandler.ts:37,43`）が同じチャンネルへ出る。「参加は歓迎チャンネル・退出は管理ログ」のような分け方ができない。

**未決**: 分離方式 A / B（→「未決事項」）。下記の作業範囲は方式が決まると確定する。

**作業範囲**

- [ ] DB マイグレーション（列追加＋既存値のバックフィル）・entities / defaults / `memberLogSettingsRepository.ts`
- [ ] `memberLogSettingsService` のセッター追加（現状は `setChannelId` 1本・`resetChannel` 相当の `updatePartial(guildId, { channelId: undefined, enabled: false })` も要追従）
- [ ] コマンド: `set-channel` の扱いを A/B の判断に合わせて決定し、join/leave 用サブコマンドを追加。`enable` の必須チェック（`memberLogSettingsCommand.enable.ts:36`）と `view` の表示（`memberLogSettingsCommand.view.ts:81`）も追従
- [ ] ja/en ロケール
- [ ] shared の `MemberLogSettings`（`shared/src/api/types.ts:109`）を拡張して publish → saika / web の `#v1.3.0` 参照を更新
- [ ] web ダッシュボード `MemberLogPage.tsx` のチャンネル選択を追従
- [ ] USER_MANUAL.md

---

## 単独で実装できる

依存がなく、他のタスクにも影響しないもの。いつ着手してもよい。

### VC自動募集のカテゴリ残骸とデッドコードの撤去 【実装・中・saika ＋ shared】

**依存なし。** 2026-09-05 に棚卸し。チャンネル単位化（2026-06-30）で役目を終えたカテゴリ allowlist が全レイヤーに残っている。**設定する手段はもう無い**（カテゴリ系サブコマンドは廃止済み・web にもカテゴリ UI は無い）のに、ロジック・型・DB・API・ロケール・テストまで生きたまま通っている。

**残っているもの（棚卸し結果）**

ロジック

- `vcAutoRecruitSettingsService.ts` — `addEnabledCategory` / `addEnabledCategories` / `removeEnabledCategories` は**本番コードからの呼び出しゼロ**（テストだけが維持している）。`removeEnabledCategory` は下記 channelDelete からのみ
- `vcAutoRecruitService.ts:280-289` — `channelDelete` でカテゴリ allowlist を掃除する分岐。処理ごと不要
- `vcAutoRecruit.constants.ts:14` — `VC_AUTO_RECRUIT_ROOT_CATEGORY = "TOP"` は**定義のみでどこからも参照されていない**

データ・型

- `entities.ts:155` / `vcAutoRecruitSettingsDefaults.ts`（3箇所）/ `vcAutoRecruitSettingsRepository.ts`（3箇所）/ `guildSettingsAggregateRepository.ts:336`
- `shared/src/api/types.ts:130` — web の mock 2箇所（`mocks/data.ts` / `mocks/handlers.ts`）も追従が要る
- `prisma/schema.prisma:94` の `enabled_category_ids` 列

API

- `vcAutoRecruitResource.ts:32,53` — read / patch で往復させている
- `overviewResource.ts:39,89,187` — ダッシュボード概要が `対象カテゴリ: ${enabledCategoryIds.length}件` を表示。**設定手段が無いので実質いつも「0件」**。有効なのに0件と出るため、設定が反映されていないように読める → `enabledChannelIds` ベースの `対象チャンネル: N件` に差し替える

ロケール（ja / en 両方・すべて未使用）

- `user-response.categories_added_count` / `categories_removed_count` / `no_addable_categories` / `no_enabled_categories` / `category_top_label`
- `user-response.enable_warning_no_category` — **存在しない `/vc-auto-recruit-settings add-category` を案内する文面**。実際に使われているのは `enable_warning_no_channel` のほうなので実害は無いが、残すと次に読む人が混乱する
- `embed.field.name.categories` / `embed.field.value.categories_none` / `embed.field.value.top`
- `ui.select.add_category_placeholder` / `ui.select.remove_category_placeholder`
- `log.config_category_added` / `log.config_category_removed` / `log.category_removed_by_delete`
- **カテゴリと無関係の未使用キー**: `log.post_failed`（どこからも参照されていない）

テスト

- `vcAutoRecruitSettingsService.test.ts:261-413` — カテゴリ操作の8ケース
- `vcAutoRecruitService.test.ts:101,474` — channelDelete のカテゴリ掃除ケース

他機能のデッドコード

- `vcRecruitVoiceStateUpdate.ts:20` の `handleVcRecruitVoiceStateUpdate` — **src のどこからも呼ばれておらず、unit / integration のテストだけが維持している**（VC募集の自動削除を廃止した時の残骸。テストが生きているせいで使われているように見えるのがたち悪い）

**やること**

- [ ] 上記を一括で撤去し、overview のサマリーを `enabledChannelIds` ベースへ差し替える
- [ ] shared から削除 → publish → saika / web の参照を更新
- [ ] migration で `enabled_category_ids` 列を削除（**本番は移行時に0件であることを確認済み**・完了済みセクション参照）
- [ ] 対応するテストを削除する

**判断が要るもの**

- **テーブル名 `guild_vc_invite_settings` を直すか。** `schema.prisma:98` の `@@map` が旧称 `vc-invite` のまま（リポジトリ冒頭のコメント2箇所も同じ名前を書いている）。カテゴリ列削除の migration を打つなら**同じ migration でリネームまで済ませられる**ので、やるならこのタイミング
- **命名ドリフトを直すか。** `SUBCOMMAND.SET_CHANNEL`（値は `set-post-channel`）/ ファイル名 `vcAutoRecruitSettingsCommand.setChannel.ts` / ロケールキー `log.config_set_channel`。**ロケールのキー名リネームは影響範囲が別**なので、やるなら明示的に切り出す

> **VC自動募集の誤爆抑制より先に着手する。** 対象が `vcAutoRecruitService` / `vcAutoRecruitSettingsService` / repository / API resource と丸ごと重なるため、別々にやると同じファイルを二度開いて二度レビューすることになる。

### VC自動募集の誤爆抑制（入室デバウンス） 【実装・小〜中】

> **対象は管理者が allowlist した常設 VC のみ。** VAC が建てた VC は ID が毎回新しく allowlist に入らないので対象外で、募集は「VAC 作成 VC の募集ボタン」に委ねる。

**依存なし。** シルバーウィークのメンテとして自鯖に告知する（2026-09-18）。現状は 0人→1人 になった瞬間に投稿するため、**チャンネルを間違えて入って即抜けた場合**や、**誰かが抜けた直後に「まだ人がいる」と思って入った場合**にも通知が飛び、ping だけが残る。既存の連投抑制（`repostCooldown` / `VC_AUTO_RECRUIT_REPOST_COOLDOWN_MS = 60_000`）は投稿**後**の抑制なので、この誤爆は素通りする。さらにクールダウンが実際に効くのは「全員退出 → 60秒以内に入り直し」だけで、そのとき直前に募集終了へ差し替わっているため、**VC に人がいるのに「募集終了」のまま**という嘘の表示が残る。

**方針: 投稿は遅らせる／終了は遅らせない。** 非対称でよい。投稿が20秒遅れても誰も損しないが、終了を遅らせると空 VC を指す「🔊 VCに参加」ボタンが生き残り、上記の誤爆を機能側から作ることになる。

| | 挙動 |
| --- | --- |
| 入室デバウンス | 20秒 |
| 募集終了 | 即時（現行どおり） |
| 連投抑制クールダウン | 廃止（嘘の「募集終了」の原因） |
| 入り直し | 特別扱いしない（0人→1人 → 20秒 → 新規投稿） |

**やること**

- [ ] **0人→1人 で即投稿せず、20秒後に再判定してから投稿する**（`vcAutoRecruitService.handleJoin`）。タイマーは `jobScheduler.addOneTimeJob`（jobId = prefix + voiceChannelId・同 ID 置換がそのままデバウンスになる）
- [ ] **発火時にチャンネルを `guild.channels.fetch` で取り直してから在室判定する。** `newState.channel` はキャッシュの生参照で、握ったまま20秒後に `members` を読むと信用できない（二重通知バグと同じ罠）。あわせて enabled / 投稿先 / allowlist / 在室人間 >= 1 を再判定する
- [ ] 空室化・`channelDelete` で保留中のタイマーを解除する
- [ ] `repostCooldown` / `VC_AUTO_RECRUIT_REPOST_COOLDOWN_MS` を削除する
- [ ] テスト（fake timers）: デバウンス中に退出 → 投稿されない／滞在継続 → 投稿される／全員退出 → 入り直し → 20秒後に新規投稿（既存の「連投抑制」ケースを置き換える）

**判断済み・補足**

- **「復活」は見送り（2026-09-17・YAGNI）。** 09-09 の設計は、募集終了時に直近クローズ（ref ＋ 開始者 ＋ 時刻）を10分保持し、同一人物の入り直しなら元投稿を edit で募集中へ戻して ping を重ねない、というもの。デバウンスだけだと**再接続や短い離席で ping が二重になる**のと、同一 VC で ping を稼ぐ濫用の下限が60秒から20秒に下がる。どちらも実際に困ってから足す。`@everyone` を実ピングさせる機能なので、告知後の反応は見ておく
- **再起動耐性は持たせない。** デバウンスはプロセス内のみで消えるが、`cleanupVcAutoRecruitOnStartup` が空 VC の募集を閉じるため自己修復する。DB へ永続化して起動時に復元すると、稼働中の全 VC へ通知が飛ぶ事故のほうが怖い
- **秒数は定数で持つ。** ギルド設定化は運用の反応を見てから判断する（shared のバージョン上げ・migration・`/vc-auto-recruit-settings`・web ダッシュボード UI へ波及するため今回はやらない）
- 「タイマー / スケジューラ実装の整理」と同じ `addOneTimeJob` を使う。デバウンス用途の warn 抑止オプションが入ったら合わせて寄せる

### VAC 作成 VC の募集ボタン（vc-auto-recruit の拡張） 【機能追加・小】

**依存なし。** 2026-09-17 決定（→「決定事項」）。「カテゴリ残骸の撤去」「誤爆抑制」の後、同じサービスが温かいうちにやる。詳細設計は着手直前で足りる（以下で全部）。

VAC が建てた VC は ID が毎回新しく allowlist に入らないので、vc-auto-recruit の自動投稿は発火しない。代わりに VC のチャット欄にボタンを置き、押した時だけ既存の募集投稿を1回叩く。募集終了は「追跡中の募集があれば enabled や allowlist に関係なく実行」（`vcAutoRecruitService.ts:219-240`）、channelDelete 同期・起動クリーンアップも既存なので、**投稿の発火以外は全部既存が面倒を見る**。

- [ ] `handleVacCreate` が VC を建てて移動させた直後、その VC のチャット欄にボタン付きメッセージを1つ送る。送れなければログだけ出して続行（VC 作成は成功扱い）。VC と一緒に消えるのでパネル管理は不要
- [ ] ボタン処理は vc-auto-recruit 側に置く。検査は2つだけ: **押した人がその VC に接続中か**（VC チャットは未接続でも見えるので必須）／**その VC の募集が `activeInvites` に無いか**（あれば ephemeral で「募集中」と返す）
- [ ] 通れば既存の投稿処理を「押した人＝`{userMention}`」で呼ぶ。`handleJoin` の投稿部分をメソッドに切り出して共用する。投稿先・文面・Embed・メンションは vc-auto-recruit の設定をそのまま使い、未設定なら ephemeral で「投稿先が未設定」
- [ ] customId は固定文字列。対象 VC は押された場所（`interaction.channelId`）から取る（customId に ID を埋めない運用ルール）
- [ ] ロケール ja/en（ボタンラベル・ephemeral 2種）・テスト

**やらない（必要になってから）**: 募集文のモーダル入力・別設定行・オーナー限定・募集専用クールダウン・mentionable 検査・roleDelete 追従・Bot の SendMessages を setup 時に検証。DB・shared・web は触らない。

> vc-auto-recruit の設定を流用してはいけない理由（プレースホルダの意味・ライフサイクル）は 09-09 の批評にあったが、流用した結果が既存の allowlist 投稿と同じ挙動になる以上、新しい問題を生まない。押す人が在室している前提なので「誰も入らなかった募集の死骸」も起きない。

### タイマー / スケジューラ実装の整理 【実装・小〜中・リファクタ】

**依存なし。** 2026-08-20 に棚卸し。時間で動くコードが `jobScheduler` と生 `setTimeout` に散っており、同じ「キー付きタイマー」を3通りの書き方で持っている。

| 用途 | 実装 | 場所 |
| --- | --- | --- |
| 定期スイープ（cron） | `jobScheduler.addJob` | 非アクティブ / 未承認キックの毎時スイープ（`clientReadyHandler.ts:97,106`） |
| 予約実行（起動時復元あり） | `addOneTimeJob` のみ | チケット自動削除（`ticketAutoDeleteService.ts`） |
| 予約実行（起動時復元あり） | `addOneTimeJob` ＋ **独自 Map** | bump-reminder（`bumpReminderScheduleHelper.ts`） |
| デバウンス | 生 `setTimeout` ＋ module-level Map | スティッキー再送（`stickyMessageResendService.ts`） |
| TTL 付きエントリ | 生 `setTimeout` ＋ 二重 Map | `cooldownManager.ts` / `shared/utils/ttlMap.ts` |
| UI タイムアウト | 共通関数（13箇所で使用） | `bot/shared/disableComponentsAfterTimeout.ts` |
| UI タイムアウト | **手書き `setTimeout`** | `vcRecruitButton.ts:416` / `vcRecruitStringSelect.ts:191` ← **VC募集の削除で消える** |
| フェーズ中断 | `setTimeout` ＋ `AbortController` | message-delete（性質が違うので対象外） |

**やること**

- [x] ~~**vc-recruit の手書き無効化2箇所を `disableComponentsAfterTimeout` に寄せる。**~~ → **VC募集機能の削除で不要になった**（2026-09-05）。共通関数の引数型を `ButtonInteraction` / `StringSelectMenuInteraction` へ広げる話も、他に手書き箇所が無くなるため保留
- [ ] **`jobScheduler.stopAll()` を graceful shutdown に接続する。** 定義とテストだけがあり本番から呼ばれていない（`main.ts` の shutdown は `apiServer.close()` → `client.shutdown()` → `prisma.$disconnect()` のみ）。全ジョブが `unref()` 済みなのでプロセス終了は妨げないが、**シャットダウン中にジョブが発火しうる**
- [ ] **スティッキー再送のデバウンスを `jobScheduler.addOneTimeJob` へ寄せる。** `addOneTimeJob` は同 ID を `replaceExistingJob` で置き換えるので、デバウンスそのものになる。ただし置換のたびに `system:scheduler.job_exists` の warn が出るため、**デバウンス用途で warn を抑止するオプションを先に足すこと**（無いまま寄せるとログが荒れる）

**判断が要るもの**

- **bump-reminder の独自 Map 廃止はポーリング化に含める。** Map が持っているのは `jobId` と `reminderId` だけで、`jobId` は `toBumpReminderJobId(guildId, serviceName)` で決定的に再計算でき、`reminderId` は DB から引ける。**チケット自動削除は実際にこの形（決定的 jobId のみ・Map なし）で成立している。** ポーリング化を待たずに ticket 方式へ寄せることもできるが、二重作業を避けるためポーリング化の一部として扱う
- **`cooldownManager` と `TtlMap` の統合は見送り寄り。** どちらも「キー付き TTL エントリ」だが、`cooldownManager` は `commandName × userId` の二段 Map ＋ `expiresAt` 一致チェック（古いタイマーによる誤削除防止）を持ち、`TtlMap` に押し込むと機能が落ちる。やるなら `TtlMap` 側の拡張になるので**別タスク**

### ドキュメント整理（spec 廃止・guides 集約）

`docs/specs/` の全ファイルを廃止し、維持すべき設計意図・非自明な境界条件・決定経緯を guides に集約する。

- [ ] 各 spec を精査し、guides に移す価値のある情報（設計根拠・非自明な境界条件・決定経緯）を特定する（**spec は削除済みのため `git show <commit>:docs/specs/<file>` で参照する**）
- [ ] 特定した情報を適切なガイドに追記（ARCHITECTURE.md / IMPLEMENTATION_GUIDELINES.md 等）

> 2026-08-19 の監査で guides の事実誤り16件を修正し、`purgeGuildDataUsecase` 等の直近の設計も追記済み（完了済み参照）。残るのは spec に埋もれている設計根拠の掘り起こしのみ。
> `docs/specs/` の削除自体は完了済み（完了済みセクション参照）。

### ダッシュボード 【UI層・web リポジトリ】

**詳細と実装範囲は [web/TODO.md](../web/TODO.md) 側に記載する**（web リポジトリ単独で完結し、saika のコアには影響しないため）。ここは索引。

- リアクションロール：ロール未設定で保存できる問題（バリデーション＋警告）
- カスタムメッセージのプレビュー機能
- 本文へのチャンネル挿入ボタン
- 共通 ChannelSelect コンポーネント

### bump クールタイムを env に外出しし、サービスごとに分ける 【実装・小】

**依存なし。最小。隙間で潰せる。**

- 現状 `getReminderDelayMinutes()`（`bumpReminderConstants.ts:91`）は `env.BUMP_REMINDER_TEST_MODE ? 1 : 120` で**120分がハードコード**、かつサービス名を引数に取らないため Disboard / Dissoku 共通
- **env が持つのはクールタイムの分数だけ。サービスごとに独立して持つ**（Bot ID・コマンド名などはコード側の定数のまま）
- 予約時に絶対時刻を確定させる現在の形（`toScheduledAt`）は**維持する** → 設定値を変えても既存の予約は繰り上がらない
- env 名の付け方は実装時に決めてよい


---

## 機能拡張アイデア

- **Web API 認証の堅牢化（設定ミス耐性）** — 現状の認証防御は多層で機能しており**実害なし**。設定ミス時の事故耐性を上げる多層化として2点を検討: ①[jwt.ts](src/api/auth/jwt.ts) の `secretKey()` のフォールバック挙動を fail-closed 化（本番相当環境で署名鍵が未設定なら起動アサーション任せにせず `secretKey()` 自体で throw）。②[jwt.ts](src/api/auth/jwt.ts) の `jwtVerify` でトークン寿命を強制（`maxTokenAge` / `exp` 必須化）し、検証側でも有効期限を担保する。詳細な背景・脅威モデルは公開 TODO に書かず別途管理。
- **予約募集(イベント募集)機能** — 他タスク完了後に実装可否判断。骨子: 予約時に VC + Discord Scheduled Event 作成 / RSVP・リマインダー・開始通知は Discord 標準任せ / VC 自動削除なし(投稿削除 or イベント終了ボタンで手動)/ 編集機能あり(日時・タイトル・説明)/ setup は既存 VC 募集と同構成 / VC 名変更は既存 `/vc rename` 流用。細部は実装決定時に詰める
- ~~**キック系ユーザーデータの削除対称性の整理（個別リセットの方針統一）**~~ — **非アクティブ自動キックの削除で論点ごと消える**（2026-09-05）。非対称の原因だった `MemberActivity` がテーブルごと無くなるため。以下は経緯として残す。①の `deleteAllSettings` への `guildUnverifiedKickWarn.deleteMany` 追加は **2026-08-19 に実施済み**（下記完了済みセクション参照）。残っていた非対称は、②未承認キックの個別リセットが warn 記録を `deleteAllByGuild` で消すのに対し、③非アクティブキックの個別リセットは `MemberActivity` を残す点だった。なお**エクスポートにユーザーデータを含めないのは現仕様維持で問題なし**（再有効化時の `enabledAt` フロアで安全・個人データ/サイズ観点でも除外が妥当）と確認済み。
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
- 遅延削除を入れたとき、Bot が居ないギルドの設定がダッシュボードでどう見えるか
- 退出直後のDMが本当に届かないか（未実測。退出時DMを見送ったため優先度は低い）
- `vitest.config.ts` の `coverage.exclude` が旧パス（`src/bot/features/**`）を参照しており実質無効になっている（2026-08-19 のドキュメント監査で発見。コード側の修正が必要）
- ja / en の翻訳キー突合を機械的に検証するテストが無い。ja だけ追加しても型・実行時とも検出されず、en 環境で日本語が出る（I18N_GUIDE に運用ルールとして明記済みだが、テスト化の余地あり）

---

## 決定事項

### export / import は廃止する（2026-08-19 決定）

**遅延削除を採用し、その後 export / import を削除する。**

判断の根拠:

- **主用途が遅延削除で自動化される。** マニュアルが案内していた唯一の実用途は「Bot 除外前に export → 再招待後に import」であり、遅延削除（退出後 N 日間データを保持し再導入で復活）がこれを自動で行う。手動の劣化版が残る形になる
- **維持コストが実バグを生み続けている。** 機能・カラムを追加するたびに「3点セット」（entities 型 / repository マッピング / import の列挙）を手で更新する構造で、更新漏れが必ず**サイレント故障**（復元できたように見えて壊れている）になる。実際に `enabledChannelIds` の取りこぼし・`lastRunDate` 非対称・export 不能バグの3件が発生
- **使われている形跡がない。** `enabledChannelIds` 取りこぼしのバグは v2.2.0（2026-06-30）から存在し、round-trip した guild は「有効なのに投稿されない」状態で残るはずだが、本番調査（2026-08-19）で**該当0件**。export 不能バグも未報告

> ⚠️ **順序が重要。遅延削除を先に入れてから export/import を削除する。** 逆にすると、遅延削除が入るまでの間ユーザーが退出時の保全手段を持たない期間ができる。

**「どうなったら要るか」の再検討条件**（これに該当しない限り再検討しない）:

1. 自己ホストへの移行需要が出たとき（AGPL。同一 guildId なので現行実装で通る唯一のシナリオ）
2. 遅延削除の猶予期間より長く Bot を外す運用が現れたとき
3. 設定を丸ごと複製したい要望が出たとき（現行実装では guildId チェックにより不可能なので、実質は別機能の新規開発）

「前どういう文面にしてたっけ」という需要は、export/import ではなく**変更履歴**（棚卸し・未決）のほうが正確かつ軽量に応える。

### 退出時データの遅延削除を採用する（2026-08-19 決定）

`guildDelete` 時に即削除せず、猶予後に削除する。詳細は「退出時データの遅延削除 ＋ guildCreate ハンドラ」の項を参照。猶予日数と Guild 親テーブルの採否は未決（「未決事項」参照）。

### VAC（トリガー VC 方式）は残し、募集は vc-auto-recruit に寄せる（2026-09-17 決定）

2026-09-09 に「VAC を消して『メンバーによる VC 作成』（パネル＋モーダル）で置き換える」と決めたが撤回した。

- **置換理由②（`/vc rename`・`limit` が権限の穴）は VAC 固有ではない。** `/vc` 削除で穴は塞がり、以後の変更は作成者の `ManageChannels` overwrite で Discord の設定画面から行う。これは置換案でも同じ前提だった
- **パネル方式のほうがコードが大きい。** トリガー方式が Discord から無償で得ていた3ゲート（Connect 制限・入室による直列化・退出イベント保証）を失い、クールダウン・直列化・猶予削除・権限検査・入力正規化・通知抑制・モーダル側検証の手当てが丸ごと要る。メンテ不要化が目標なら、動いている VAC を残すほうが小さい
- **代償は「部屋名・人数を建てる時に決められない」だけ。** UX の好みの問題で、VAC の流れで良いと判断した
- **「Bot は未接続の人を移動できないから VAC が要る」は理由にしない。** 置換案も「未接続なら参加 Link ボタン」で織り込んでいた（vc-auto-recruit の「🔊 VCに参加」と同じ仕組み）。差はクリック1回

募集は新機能を作らず、vc-auto-recruit を拡張して VAC 作成 VC のチャット欄にボタンを置く（→「VAC 作成 VC の募集ボタン」）。自動投稿は常設 VC だけ、VAC 作成 VC はボタンだけ、と対象を分ける。VAC 作成 VC まで自動にすると「部屋を建てる＝毎回 ping」になり募集の任意性が消える。

**残る前提**: 最小権限 Bot（Administrator なし）で作成者への `ManageChannels` overwrite が付くかの実機検証はまだ（自鯖は Administrator 付き）。最小権限の招待リンクは 2026-06-15 に本番済みで、他鯖が VAC を有効にした時に初めて効く。「次にやること」とは独立なので、空いた時にテスト鯖で確認する。カテゴリ移動＋権限同期の検証と `channelUpdate` での戻し処理は、VAC 利用が自鯖だけで悪用も観測されていないためやらない。

> 撤回した設計の全文は `git show 06a28cc:TODO.md` の「メンバーによる VC 作成」「VC自動作成（VAC）の削除」を参照。

---

## 取り下げ済み・やらないと決めたもの

再検討時の参考用。

- **VC自動募集のカテゴリ→チャンネル移行のバックフィル欠如** — バグではなかった（移行時に本番0件を確認済みの意図的な clean migration）
- **バックフィル値1で救済されない残存リスク** — 杞憂だった（`meetsActiveCondition` が OR 条件のため、下限1が1つでもあれば救済される）
- **export / import 機能そのもの** — 遅延削除で主用途が自動化され、維持コストがサイレント故障を生み続けているため廃止。詳細と再検討条件は「決定事項」を参照
- **「export だけ残す」案** — 復元できないバックアップは意味がない
- **export/import の列挙を `satisfies` で縛る案** — 縛る対象そのものが無くなるため不要
- **エクスポート互換のバージョン分岐（v1→v2 変換）** — 同上
- **`lastRunDate` の export 非対称の修正** — 同上
- **退出時のDM通知** — サポートサーバー参加者にしか届かず、届いた人にも取れる行動がない。副次的に導入者IDの記録が不要になった
- **彩加の全面作り直し** — 「作り直さなければ実装できないもの」が1つも出なかったのが決め手
- **オーナーDM での自動無効化通知** — DM閉じ問題と公開Botでの体験劣化のため棄却
- **どのサーバーが抜けたかの特定／導入経路の確認** — 分かっても判断が変わらない
- **`validateImportData` の guildId 一致チェックの緩和（サーバー間移行）** — スコープ外
- **監査ログからの導入者特定** — `ViewAuditLog` が招待権限に含まれておらず、最小権限方針を維持するため。`guild.ownerId` にフォールバックする
- **VAC（トリガー VC 方式）の削除 ＋「メンバーによる VC 作成」（パネル＋モーダル）** — 2026-09-17 撤回。理由は「決定事項」。設計全文は `git show 06a28cc:TODO.md`
- **VC自動募集の「同一人物の復活」** — 入室デバウンスだけで出し、再接続の二重 ping が実際に困ってから足す（2026-09-17・YAGNI）。旧設計は同上
- **キック機能のチャンネル分離（非アクティブ側）・`disabledReason` 列・`set-notify-channel` リネーム** — 非アクティブキック削除で対象が消え、未承認側は分離済み。残る「ログチャンネル必須化」だけを実施する（2026-09-18）
- **メンバーログの Bot 除外をトグルにする案** — 無条件除外で足りる。欲しいサーバーが出たら足す（2026-09-17）

---

## 完了済み

> 詳細な作業経過は git log を参照。

### `/afk` の権限修正（2026-09-20 develop merge）

`/afk` を「他メンバーを動かす」専用にし、既定の実行権限を `MoveMembers` に絞った。対だった `/vc` 削除は分割して残タスクに置いてある（→「機能削除」）。

**本番リリースはしない。** `/vc move` で同じ操作が完全に代替できるため、`/afk` だけ main へ出すと一般メンバーが `/afk` を失うだけで穴は残る。`/vc` 削除と同じ release PR でまとめて出す。告知もそのタイミング。

- [x] `afk.ts` に `setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers)` を追加。**コード側ガードは足さない**（2026-09-09 訂正）。コード側で `MoveMembers` を強制すると、管理者が連携設定で「VC 係」ロールに委任した場合に Bot が弾いてしまい、Discord の委任機能を無効化するため
- [x] target 必須化。`resolveVcActionTarget` が `none` のとき `ValidationError` を投げ、「省略時は自分」分岐を削除。エラーは `vc:user-response.target_required` を流用し、`fromKey` ではなく `tInteraction` 経由にした（次の PR で `vc` 名前空間を消すとき型で検出できるようにするため）
- [x] ロケール ja/en の説明文と help の `/afk` 行（計4箇所）
- [x] テスト追従。単体で「省略時はエラーかつ副作用なし」を検証し、`target_required` で緑になって素通りする2ケースはメッセージキーまで見る形にした。統合テストは2ケースを目的が分かる名前に変え、省略時のケースを新設

> **自分移動の廃止根拠**（2026-09-20 確定）: 離席はミュート／スピーカーミュートで足りる。自鯖でも自分移動の利用を観測したことがない。
> **メンバーに使わせたい場合**はサーバー設定 → 連携サービス → 彩加 → `/afk` でロール単位に許可する（Discord 標準・既定は Bot 側、上書きは管理者）。マニュアル全面修正時に1行書く。
> **既定権限を付けても Discord と完全に同じ強さにはならない。** 移動元 VC のチャンネル個別 overwrite は誰も見ない（`interaction.memberPermissions` は呼び出しチャンネル基準のため、コード側ガードを足しても塞がらない）。厳密化は委任を潰すので採らない。マニュアルに1行添える。

### 追従漏れバグ修正とドキュメント修正の本番リリース（2026-08-19 リリース・本番デプロイ済み）

develop → main（PR #103・merge commit `490fdf6`）。Coolify のデプロイ成功を確認し、起動時の `prisma migrate deploy` でバックフィルが適用されたことを本番 DB で検証済み（対象7行が 0 件になったことを SELECT で確認・2026-08-20）。

コード変更は追従漏れバグ修正1本のみで、残り9コミットはドキュメント。リリース前に本番 DB 事前確認・ローカル DB での実データ検証・テスト Bot での実機検証（起動 / reset-all / export→reset-all→import で `enabledChannelIds` が復元され募集投稿まで発火）を実施。

影響を受けているユーザーが実在しないことを確認済みのため（export→import で壊れたギルド0件・誤キック予備軍は機能無効の1ギルドのみ・`warn_stage` 全て0）、**サポートサーバーでの告知は不要と判断**。

- [x] develop → main のリリース PR（`release:` プレフィックス・merge commit・auto-merge）
- [x] Coolify デプロイ成功（1分36秒）
- [x] バックフィル適用の本番 DB 検証（7件 → 0件）
- [x] Ikoitter 側の手作業は不要と確定（`warn_stage` 全て0）

### docs/guides と実装の乖離修正・I18N_GUIDE 全面改訂（2026-08-19 develop merge）

`docs/guides/` 全8ファイルを実装と突き合わせて監査し、事実誤り16件を修正（PR #101）。あわせて I18N_GUIDE を全面改訂（PR #102）。コード変更なし。`GIT_WORKFLOW.md` と `DEV_TIPS.md` は実装と一致していたため変更なし。

影響が大きかったもの: `ARCHITECTURE.md` の `TEST_MODE` は存在しない env 変数で、記載どおり設定しても何も起きずコード例も型エラーになる状態だった（実装は `BUMP_REMINDER_TEST_MODE`）。`I18N_GUIDE` は名前空間を `commands` / `errors` / `events` の3つとしていたが実装は機能別19個で、全編のコード例が成立しない状態だった。招待権限の `Connect` は `cd3c0e5` で `DISCORD_BOT_SETUP.md` にだけ追記され、`ARCHITECTURE.md` と `USER_MANUAL.md` が取り残されていた。

- [x] ARCHITECTURE.md: `TEST_MODE` → `BUMP_REMINDER_TEST_MODE`・招待権限に `Connect` 追加・API 層の「移行予定」削除・イベント表2件追加・DB テーブル5件追加・リポジトリ5件追加・`purgeGuildDataUsecase` と `cancelAllForGuild` を追記・デプロイ経路を Coolify に修正
- [x] TESTING_GUIDELINES.md: カバレッジ閾値 Branches 94→92・レイヤ別表とテストツリーを現行構成に更新
- [x] IMPLEMENTATION_GUIDELINES.md: locale パス修正・`ConfigService` の旧名を `SettingsService` に統一
- [x] DEPLOYMENT.md: API 層の環境変数7件を追記
- [x] DISCORD_BOT_SETUP.md: Portainer → Coolify・GitHub Actions → Coolify
- [x] USER_MANUAL.md: 権限表に「接続（Connect）」を追加
- [x] I18N_GUIDE.md: 全面改訂（翻訳関数の使い分け・ja が唯一の型基準である非対称性・キー命名規則・`logPrefixed` / `logCommand`・ロケールキャッシュ TTL・言語追加時の8箇所）

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

### docs/specs/ の削除（2026-08-19 完了）

仕様書ディレクトリを廃止し、ドキュメント体系を `docs/guides/` に一本化。**guides への設計根拠の集約は未完了**（タスク一覧「ドキュメント整理」に残っている）。

- [x] `docs/specs/_TEMPLATE.md` とディレクトリ本体を削除（2026-08-19）— 仕様書作成テンプレートとして意図的に残されていたが、spec 廃止から約2ヶ月間一度も使われず、guides への一本化と衝突するため削除。必要になれば git history から復元できる
- [x] `docs/specs/` の他ファイルを削除（2026-06-29）
- [x] README.md 更新: 機能表の `spec` 列を削除・「仕様書」セクションを削除（2026-06-29）
- [x] TODO.md 更新: 完了済みセクション内の spec リンクを除去（2026-06-29）

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

### 一般公開に向けたライセンス・導線整備（2026-06-28 完了）

一般公開の前提になるライセンス変更と、Bot 内からの導線整備。**`/about` の充実（LP 公開時）と Discord Bot 認証申請（75 サーバー到達後）は未着手**（タスク一覧「Bot 一般公開準備」に残っている）。

- [x] ライセンスを MIT → AGPL-3.0 に変更
- [x] help コマンドにダッシュボード URL リンク追加（2026-06-06 本番反映）
- [x] `/about` コマンド（2026-06-07 実装完了）
- [x] ディスカバリー審査通過後の日本語ローカライズ復活（2026-06-28 確認済み・commit `b32eb95`）

### 通知送信リファクタリング + 実行時刻設定化（2026-06-28 完了）

（2026-06-28 完了）設計書: KICK_NOTIFICATION_REFACTOR_SPEC.md

inactive-kick / unverified-kick の通知ページネーション廃止・{markerRole} 廃止＋mentionEnabled による個別メンション化・予定日別 embed（`daysLeft` グループ）・`<t:unix:f>` タイムスタンプ・`computeKickUnix()`（runHour:00 基準）・{daysLeft} プレースホルダー廃止・`sendNotification` 共通送信ユーティリティ・毎時スイープ（`"0 * * * *"`）＋ per-guild `timezone`/`runHour` フィルタ・`lastRunDate` 同日ガード・`KickedMember` 型（displayName 取得）。`setWarnStage` upsert 化・`sendPaginatedEmbeds` の `pagination.ts` 統合・preview の PREVIEW_COLLECTOR_MS=300_000 化も含む。

- [x] `setWarnStage` upsert 化・`sendPaginatedEmbeds` → `pagination.ts` 統合・`embedPaginator.ts` 削除・preview PREVIEW_COLLECTOR_MS 化（`recordMemberActivity` の getActivity 条件付き挙動はテスト定義に従い維持）
- [x] `GuildInactiveKickSettings` / `GuildUnverifiedKickSettings` に `timezone` / `runHour` / `lastRunDate` / `mentionEnabled` 追加・マイグレーション
- [x] `set-timezone` / `set-run-hour` / `mention enable` / `mention disable` コマンド追加（両機能）・セレクトメニュー・バリデーション・`view` 更新・ja/en ロケール
- [x] 毎時スイープ化・per-guild `timezone`/`runHour` フィルタ・`lastRunDate` 同日ガード・`timezone:` を `addJob` から除去
- [x] `notificationSender.ts` 新規作成・両 runner の `sendPaginatedEmbeds` を `sendNotification` へ差し替え・`warnStage` 前進条件を最初のメッセージ成功のみ必須に変更
- [x] `splitMentionFields` 動的分割・warn/kick 表示形式変更・予定日別 embed・`computeKickUnix`・`{daysLeft}` 廃止・`mentionEnabled` 制御・`KickedMember` 型
- [x] API エンドポイントに `timezone`/`runHour`/`mentionEnabled` 追加（shared v0.3.2）・Web UI（両機能の設定カードにメンション通知・タイムゾーン・実行時刻を追加）・廃止プレースホルダー警告 UI（MessageTemplateEditor）

> **未デプロイ**: saika develop → main release PR・web main push はユーザーの GO 待ち。

### web ダッシュボード Fastify API（2026-06-06 完了・本番稼働）

Bot と同一プロセスで起動する Fastify API を実装し、web ダッシュボード（`saika-dash.sonozaki.net`）の per-guild バックエンドとして本番稼働。認証は web BFF に集約し、saika は JWT 検証のみ（OAuth/refresh を持たない）。

- [x] `src/api/server.ts` + `src/api/routes/`（Bot 同一プロセス起動・CORS〔PATCH/DELETE 許可〕・rate-limit・`/health`）
- [x] 認証層（`authenticate`〔Cookie JWT 検証〕+ `requireGuildAccess`〔guildId ∈ jwt.guilds〕）
- [x] 機能別エンドポイント（config/afk/vac/member-log/bump/vc-recruit/vc-auto-recruit/inactive-kick/unverified-kick/sticky/reaction-role/ticket/overview の CRUD・パネル投稿・`GET /api/bot`〔アバター+招待URL・Administrator 権限〕・`GET /api/guilds/joined`・全設定リセット `POST /api/guilds/:id/reset-all`）
- [x] Coolify で API 公開（Docker Compose `docker-compose.coolify.yml`・`saika-api.sonozaki.net`・ホスト 8081〔8080 は coolify-proxy 占有〕）
- [x] feature→develop 統合 #57 → 本番リリース #58/#59/#60（main）。本番 E2E 成功（web 保存→bot `view` で反映確認）
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) に API 層を追記（プロセス構成図・ディレクトリツリー実態化・「API 層（web ダッシュボード）」節〔認証=web BFF 集約で saika は JWT 検証のみ・レイヤ構成・エンドポイント概要・env〕・2026-06-07）

> NOTE: パネル削除の P2025 競合修正（DB→メッセージ順）・CORS methods・テスト堅牢化等のホットフィックスを #59/#60 で対応。デプロイ知見は [web/docs/DEPLOYMENT.md](../web/docs/DEPLOYMENT.md)。

### メッセージ削除機能の改善（投稿者タイプフィルタ）（2026-06-04 完了・本番リリース済み）

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
- [x] **カテゴリ allowlist 追加（後追い）**: 募集は**明示的に有効化したカテゴリの VC でのみ**投稿（`enabledCategoryIds` jsonb・ルート直下は sentinel `"TOP"`）。`enable-category`/`disable-category` 追加、空＝投稿なし、`@everyone` 可視性は判定に使わず認証制サーバーのメンバー専用 VC も有効カテゴリなら投稿、カテゴリ削除で allowlist 自動掃除。全 2418 通過
- [x] **二重通知バグ修正（後追い）**: CreateVC 経由の参加で募集通知が2件投稿される問題を修正。原因は discord.js の `newState` がキャッシュ上のライブ参照で、VAC の `setChannel` が `newState.channelId` を破壊的に書き換えるため、`voiceStateUpdate` で VAC を先に await すると vc-auto-recruit がトリガー除外をすり抜けて生成 VC を指し、移動イベントと合わせ2件投稿されていた。ハンドラ順序を **vc-auto-recruit → VAC** に入替え、トリガー Ch を同期的に読ませて解消。全 2437 通過。release PR #49（develop→main・2026-06-04・本番デプロイ済み）

> NOTE: 起動クリーンアップ・closeInvite の Discord 副作用経路はロジック実装済み（ユニットでは主要分岐を担保）。カテゴリ allowlist 拡張は別 release PR で本番反映予定。

### 未承認ユーザー自動キック（2026-05-31 完了・未デプロイ）

参加から猶予日数（`graceDays` 1〜30）内に認証ロール未取得のメンバーを、事前警告（本人へ DM + 任意で通知チャンネルへキック予告）を経て日次で自動キック。判定は単一条件（`joinedAt` 起算・認証ロール未取得・Bot/管理者/オーナー/除外ロール以外）。`enabledAt` 起算下限で有効化直後の無警告一斉キックを防止し、warn-before-kick（`GuildUnverifiedKickWarn.warnedAt`）で日次チェック取りこぼし時のサイレントキックも防止。Notion 引き継ぎを一次情報源に、コマンド構成は inactive-kick に、本文可変・Embed 固定は member-log 流儀に揃えて実装。

- [x] 仕様書作成: UNVERIFIED_KICK_SPEC.md（`/unverified-kick-settings` / DM + 通知/ログ 2チャンネル分離 / 対象ロール〔通知直前付与・認証時 `guildMemberUpdate` 剥奪〕 / `enabledAt` 起算下限 / dry-run=`TEST_MODE`）
- [x] 実装（DB `GuildUnverifiedKickSettings` + リポジトリ/サービス + `/unverified-kick-settings` コマンド群〔19 サブコマンド + exempt グループ + preview〕 + 日次チェック `addJob`〔03:00 JST・`noOverlap`・`UNVERIFIED_KICK_CRON` 上書き〕 + 警告 DM + 通知/ログ Embed〔キック予告本文も本文可変・Embed 固定でカスタム可〕 + 対象ロール付与/剥奪 + `guildMemberUpdate` ハンドラ + guildDelete 一括削除）
- [x] サイレントキック防止（warn-before-kick・2026-06-05）: 警告判定を `ageDays == warnDays` の点比較から `warnedAt`（新 DB `GuildUnverifiedKickWarn`）の状態判定へ変更。通知猶予（`graceDays - warnDays`）確保後にのみキックし、警告日を飛び越えた未警告者はまず警告して繰り延べる。記録は認証/退出/起算リセット/警告無効化で失効削除、`enable`/`reset` で一括破棄。migration `20260605092936_add_unverified_kick_warn`
- [x] テスト（eligibility/candidates/notifier/runner/設定サービス/warn リポジトリ/コマンド定義・全 2561 通過）

> NOTE: 警告 DM 送信・通知投稿・対象ロールの通知直前付与順序・`guildMemberUpdate` 認証時剥奪はロジック実装済みだがユニットテスト未整備（Discord 副作用のため・判定ロジックは別途担保）。**未デプロイ**: 実機検証（`pnpm start` 起動 + 動作確認）と release PR（develop→main）は未実施。

### 自動キック機能（非アクティブメンバー整理）（2026-05-31 完了）

一定期間テキスト/VC/リアクションで活動がないメンバーを、段階通知（1週間前・3日前）を経て日次で自動キック。誤キック防止の安全策（警告ゲート `warnStage==2` 必須・`enabledAt` 起算下限・送信成功後に warnStage 前進・除外時の猶予クリア・dry-run `TEST_MODE`）を中核に据えた。member-log の流儀（本文可変・embed 固定・DB 保存・単一波括弧）に準拠。

- [x] 仕様書作成: INACTIVE_KICK_SPEC.md（活動=テキスト+VC+リアクション / 段階通知 / 除外=Bot・Administrator・whitelist・オーナー・VC接続中 / dry-run=`TEST_MODE` / 対象ロール自動付与。デフォルトしきい値 30 日）
- [x] 実装（DB `GuildInactiveKickSettings`/`MemberActivity` + リポジトリ/サービス + アクティビティ記録ハンドラ〔throttle 1h〕 + `/inactive-kick-settings` コマンド群〔13 サブコマンド + whitelist グループ + preview〕 + 日次チェック `addJob`〔04:00 JST・`noOverlap`〕 + 段階通知/キック実行 + `GuildMessageReactions` Intent / Partials 追加）
- [x] テスト（eligibility/candidates/notifier/runner/設定サービス/コマンド定義・全 2310 通過）
- [x] 実機検証 + UX 追補（develop 反映済み）: 事前通知を **1週間前/最終警告で別メッセージ**化、通知の**カスタム文を本文(content)・embed は固定**化（`{markerRole}` は本文に含めたときだけメンション）、**キック通知はデフォルト文なし**（未設定なら本文なし）、`view` で実際の本文を表示、preview の色を info、`whitelist remove` を**セレクト複数選択**化、検証用に **`INACTIVE_KICK_CRON`** env 上書きを追加

> NOTE: 対象ロールの階層不足スキップ・guildDelete の新テーブル一括削除はロジック実装済みだがユニットテスト未整備（spec テストケース参照）。**本番リリースは本コミットの release PR（develop→main）で実施**。

### VC 操作コマンド拡張 & ephemeral/public 監査（2026-05-30 完了・本番デプロイ済み）

VC 切断/移動コマンドの追加と、VC 操作系の出力可視性の全面整理。`/vc disconnect`・`/vc move`（個別 + VC 全員の一括、`target-member`/`target-channel` 方式）と `/afk` の target 拡張（VC 全員一括）を追加。共通の `formatActionLog` / 一括確認ダイアログ（60s）を `src/bot/shared/` に新設し、一括は「参加者全員」+ 対象メンバーのメンション一覧で表示。

- [x] 仕様確定: VC_COMMAND_SPEC / AFK_SPEC のオープン項目（target 型=target-member / target-channel の2オプション方式 / カラー=blurple / TO=60s / 配置=src/bot/shared/）
- [x] [IMPLEMENTATION_GUIDELINES.md](docs/guides/IMPLEMENTATION_GUIDELINES.md) に「コマンド設計原則（ephemeral/public）」を追加し全コマンド分類
- [x] 実装（`/vc disconnect`・`/vc move` 個別+一括 / `/afk` target 拡張 + public 化 / `formatActionLog` + 一括確認ダイアログ）
- [x] テスト（個別/一括・確認/キャンセル/タイムアウト・部分失敗・空VC no-op・target 競合 / formatActionLog）
- [x] `/vc rename`・`/vc limit` を public 化し、成功メッセージに対象VCを表示
- [x] 操作パネル（vc-panel）撤廃（全機能を `/vc`・`/afk` に一本化、VAC・VC募集の自動パネル送信を廃止）

### Postgres 移行（2026-05-30 完了・本番デプロイ済み）

SQLite → PostgreSQL のデータ層移行。コード・スキーマ・ローカル検証に加え、**本番切替まで完了**。

- [x] `schema.prisma` の provider 切替（sqlite → postgresql）+ 接続を `@prisma/adapter-pg` に変更（Prisma 7 は直接接続に driver adapter 必須）
- [x] テーブル名 `@@map` を `guild_*_configs` → `guild_*_settings` にリネーム
- [x] JSON 文字列カラム 8 件を jsonb 化 + アプリ側の `JSON.parse`/`stringify`/`parseJsonArray` を全廃
- [x] migration を PostgreSQL 用に再生成 + ローカル Docker Postgres で検証
- [x] Docker / Compose / `docker-entrypoint.sh` / `.env.example` を PostgreSQL 構成に変更
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) / [DEV_TIPS.md](docs/guides/DEV_TIPS.md) 更新
- [x] **本番切替**: infra で Coolify マネージド PostgreSQL 17 + R2 バックアップ構築 → `/guild-settings export` → `DATABASE_URL` 切替 → release deploy → `/guild-settings import` → 検証OK。ホットフィックス2件対応済み（import の upsert 化 / reaction-role の messageId 解決）。旧 sqlite ボリュームは温存中（数週間後に削除予定）

### ディレクトリ再編 + 命名整理（2026-05-29 完了）

`src/{bot,api,features,shared}/` 標準構成へ再編し、命名を `-settings` に統一。

- [x] `-config` → `-settings` リネーム（全 8 コマンド・変数・ファイル・DB **モデル名**・export 形式の `config`→`settings` フィールド・ドキュメント・仕様書 `GUILD_SETTINGS_SPEC.md`）。DB **テーブル名**（`@@map` の `guild_*_configs`）は migration 回避のため据え置き、Postgres 移行でリネーム。`vc-recruit`→`instant-recruit` は実態が VC 中心のため見送り（VC募集名を維持）
- [x] エントリポイント移動: `src/bot/main.ts` → `src/main.ts`
- [x] `src/bot/features/<f>/` と `src/shared/features/<f>/` を `src/features/<f>/` に統合（記述的ファイル名を維持。設定リポジトリも各 `src/features/<f>/<f>SettingsRepository.ts` に分散）
- [x] `src/shared/scheduler/` は saika 固有として `src/shared/` に維持、`src/shared/database/types/` も維持
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [IMPLEMENTATION_GUIDELINES.md](docs/guides/IMPLEMENTATION_GUIDELINES.md) を新構造で更新

### shared への外出し（2026-05-29 完了・本番デプロイ済み）

「他 bot でもそのまま流用できる汎用コードのみ外出し」方針で、汎用3点（`createLogger` / `DiscordWebhookTransport` / `errors` の `BaseError` 階層）を `@ayasono/shared` に移行。`locale/*` / `utils/prisma.ts` / `errors/errorUtils.ts`・`processErrorHandler.ts` は saika 固有結合が強く残置。配布は git タグ + コミット済み dist（`shared` v0.2.3。pnpm 11.4 の HTTP tarball integrity 問題を回避するため、tarball/CI 方式から最終的にこれに確定）。

- [x] `logger.ts` を `createLogger` の薄い wiring に置換（call site 無変更）、`discordWebhookTransport.ts` 削除
- [x] `customErrors.ts` 削除 + `BaseError` 階層の import 約73箇所を `@ayasono/shared/core` に全置換
- [x] shared に vitest 基盤 + core 3点テスト整備、配布を git タグ + コミット済み dist 化（`shared` v0.2.3）
- [x] docker build/run で本番同等起動を検証 → release PR #11/#12 で main 反映 → Coolify デプロイ成功

> NOTE: webhook transport・customErrors の単体テストは shared 側（`shared/tests/core/`）に移設済み。saika 側の重複テストは削除済み。

> 上記より前（guild-config export/import 完全対応化・VC 募集 UX 改善・リアクションロール ボタン色 UI 改善・Coolify 移行 ほか）は git log を参照。
