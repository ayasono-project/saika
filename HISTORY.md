# saika - HISTORY

> 決定の記録。**何を決めたか・何をやらないと決めたか・何を終えたか**を残す。
> これからやることは [TODO.md](TODO.md) にある。

最終更新: 2026年9月20日

**ここに書くもの**: 再検討が起きたときに判断を復元できない情報（実測値・却下理由・決定の経緯）。
**ここに書かないもの**: git log やコードを読めば分かること。

---

## 決定事項

### saika のメジャー更新は「利用者の操作が変わるか」で決める（2026-09-20 決定）

**破壊的変更ごとに major ではなく、利用者が再設定や操作の変更を迫られるなら major。** saika はライブラリではなくアプリで、バージョンを読むのは `/about` を見る人と告知を読む人だけだからこの基準にする。

この基準で 2026-09-20 の2回のリリースはこう分かれる。

| リリース | 判断 | 理由 |
| --- | --- | --- |
| **3.0.0** | major | `/vc` が無くなり、`/afk` は対象必須＋既定でモデレーター権限が必要になった。**使っていた人は使い方を変える必要がある** |
| **3.1.0** | minor | VC募集は実測で稼働ゼロ（パネルも投稿先も無い）、カテゴリ残骸は設定手段がとうに無い、入室デバウンスは黙って改善されるだけ、パスコメントとロケールは内部。**誰も何もしなくていい** |

> **当初は 3.1.0 も major にしようとした。** 「機能削除＝破壊的変更＝major」で揃えると、機能を2つ削っただけで同じ日に major が2つ進むことになり、読む人には1回の変更にしか見えない。そこで基準を引き直した。**3.0.0 に含まれた削除のうち実際に操作を変えたのは `/vc` と `/afk` だけで、非アクティブ自動キック（有効ギルド0）は変えていない。**「操作を変える項目が1つでもあれば major」という線は両方のリリースで一貫して引ける。
> **`@ayasono/shared` はこの基準の対象外。** あちらは saika と web が型で依存する本物のライブラリなので、公開 API の削除＝ major を維持する。

### VAC（トリガー VC 方式）は残し、募集は vc-auto-recruit に寄せる（2026-09-17 決定）

2026-09-09 に「VAC を消して『メンバーによる VC 作成』（パネル＋モーダル）で置き換える」と決めたが撤回した。

- **置換理由②（`/vc rename`・`limit` が権限の穴）は VAC 固有ではない。** `/vc` 削除で穴は塞がり、以後の変更は作成者の `ManageChannels` overwrite で Discord の設定画面から行う。これは置換案でも同じ前提だった
- **パネル方式のほうがコードが大きい。** トリガー方式が Discord から無償で得ていた3ゲート（Connect 制限・入室による直列化・退出イベント保証）を失い、クールダウン・直列化・猶予削除・権限検査・入力正規化・通知抑制・モーダル側検証の手当てが丸ごと要る。メンテ不要化が目標なら、動いている VAC を残すほうが小さい
- **代償は「部屋名・人数を建てる時に決められない」だけ。** UX の好みの問題で、VAC の流れで良いと判断した
- **「Bot は未接続の人を移動できないから VAC が要る」は理由にしない。** 置換案も「未接続なら参加 Link ボタン」で織り込んでいた（vc-auto-recruit の「🔊 VCに参加」と同じ仕組み）。差はクリック1回

募集は新機能を作らず、vc-auto-recruit を拡張して VAC 作成 VC のチャット欄にボタンを置く（→「VAC 作成 VC の募集ボタン」）。自動投稿は常設 VC だけ、VAC 作成 VC はボタンだけ、と対象を分ける。VAC 作成 VC まで自動にすると「部屋を建てる＝毎回 ping」になり募集の任意性が消える。

**残る前提**: 最小権限 Bot（Administrator なし）で作成者への `ManageChannels` overwrite が付くかの実機検証はまだ（自鯖は Administrator 付き）。最小権限の招待リンクは 2026-06-15 に本番済みで、他鯖が VAC を有効にした時に初めて効く。TODO.md の着手順とは独立なので、空いた時にテスト鯖で確認する。カテゴリ移動＋権限同期の検証と `channelUpdate` での戻し処理は、VAC 利用が自鯖だけで悪用も観測されていないためやらない。

> 撤回した設計の全文は `git show 06a28cc:TODO.md` の「メンバーによる VC 作成」「VC自動作成（VAC）の削除」を参照。

### `/vc`（VC操作コマンド）は修正せず削除する（2026-09-09 決定・2026-09-17 根拠差し替え）

権限の穴（`setDefaultMemberPermissions` も権限チェックも無く、誰でも他人を切断・移動できる）を修正で塞ぐ道は採らず、全サブコマンドを削除する。

- **`move` / `disconnect` に Bot 側の代替は用意しない。** `MoveMembers` を持つ管理者は Discord クライアントから直接できる。`/afk` は AFK チャンネルへの移動専用なので `/vc move` の代わりにはならない。**逆向きは成立する**（`/vc move target-member: to:AFKチャンネル` が `/afk` を完全に代替するため、`/afk` 単独で main へ出しても穴は塞がらない）
- **`rename` / `limit` も残さない。** 通るのは `getManagedVoiceChannel` だけで、これは「Bot 管理下の VC に自分がいるか」の確認であって権限ではない。**VAC は作成者にだけ `ManageChannels` overwrite を付けている**のに（`handleVacCreate.ts:125`）、同席していれば誰でも改名できる。VAC の権限設計を迂回している＝削除の根拠②（saika 内部で重複）
- **`rename` / `limit` には代替がある。** 作成者は `ManageChannels` overwrite により Discord の設定画面から名前・人数を変えられる。同席しているだけの人は変えられなくなるが、それが VAC の権限設計どおり
- **`disconnect` にだけ代替が無い。** 切断には `MoveMembers` が要り `ManageChannels` overwrite では足りないため、部屋の作成者が同席者を切断する手段は無くなる。管理者に頼む運用になる

VAC を残す判断（→「VAC（トリガー VC 方式）は残し、募集は vc-auto-recruit に寄せる」）はこの削除を前提にしている。

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

`guildDelete` 時に即削除せず、猶予後に削除する。詳細は「退出時データの遅延削除 ＋ guildCreate ハンドラ」の項を参照。猶予日数と Guild 親テーブルの採否は未決（TODO.md「未決（判断が要る）」参照）。

---

## 取り下げ済み・やらないと決めたもの

再検討時の参考用。

- **キック機能のチャンネル分離（非アクティブ側）・`disabledReason` 列・`set-notify-channel` リネーム** — 非アクティブキック削除で対象が消え、未承認側は分離済み。残る「ログチャンネル必須化」だけを実施する（2026-09-18）
- **VAC（トリガー VC 方式）の削除 ＋「メンバーによる VC 作成」（パネル＋モーダル）** — 2026-09-17 撤回。理由は「決定事項」。設計全文は `git show 06a28cc:TODO.md`
- **VC自動募集の「同一人物の復活」** — 入室デバウンスだけで出し、再接続の二重 ping が実際に困ってから足す（2026-09-17・YAGNI）。旧設計は同上
- **メンバーログの Bot 除外をトグルにする案** — 無条件除外で足りる。欲しいサーバーが出たら足す（2026-09-17）
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

---

## 完了済み

> 詳細な作業経過は git log を参照。

### `/about` に導線を追加し `/help` の抜けを直す（2026-09-20 develop merge）

告知を見て最初に `/about` を叩く人が行き先を見つけられないため、`/help` と同じ導線を持たせた。あわせて **`/help` に `/about` が載っていなかった**のを直した（`/about` 追加時からの漏れで、今回の削除で生まれたズレではない）。

- [x] `/about` にマニュアル（`USER_MANUAL_URL`）とダッシュボード（`DASHBOARD_URL`）のフィールドを追加。**どちらも未設定なら項目ごと省略**する `/help` と同じ env 出し分け
- [x] `/help` の「🔧 基本」に `/about` を追加（ja / en）
- [x] テスト3件（マニュアル表示・ダッシュボード表示・未設定時は死にリンクを出さない）

> **登録コマンド16個と `/help` の掲載を突き合わせて確認した。** ズレていたのは `/about` の1件だけで、設定10件・操作3件は一致していた。

### 未使用ロケールキーの撤去 ＋ VC自動募集の投稿先消失通知（2026-09-20 develop merge）

全1151キーを再スキャンして未使用候補77件を検出し、(a) 残骸 /(b) 仕様判断 /(c) 実装漏れ に分類した。結果は **誤検出2件・(c) 1件・(a) 74件・(b) 0件**。

**(c) 実装漏れ＝バグ 1件を実装した。** `vcAutoRecruit:user-response.channel_deleted_notice`（「投稿先チャンネルが削除されました。設定をリセットしたので再設定してください」）は文面だけあって**どこからも送られていなかった**。投稿先が消えると設定が黙ってリセットされ、管理者は募集が止まった理由を知る手段が無かった。メンバーログは同名のキーで同じ状況を通知しているので、そちらに合わせてエラーチャンネル（`notifyWarnChannel`）とシステムチャンネルの両方へ出すようにした。テスト2件を追加。

**誤検出2件。** `bumpReminder:user-response.reminder_message_disboard` / `_dissoku` は [`sendBumpReminder.ts`](src/features/bump-reminder/handlers/usecases/sendBumpReminder.ts) が `` `...reminder_message_${serviceKey}` `` と**動的に組み立てて**いるため静的スキャンに掛からなかっただけで実使用。**動的組み立てはコード全体でこの1箇所のみ**であることを確認済み。

**(a) 残骸74件を ja / en 双方から撤去した。**

| 名前空間 | 件数 | 中身 |
| --- | ---: | --- |
| system | 33 | `web.*` 13（OAuth・セッション管理が web BFF へ移り saika は検証専用になった残骸）／`database.*` 8（旧 DB ロギング層）／`log_prefix.*` 7（イベントが接頭辞ログを出さなくなった）／`shutdown.*` 2 ほか |
| ticket | 10 | 存在しない `reset` サブコマンド用 ＋ DB ログ |
| common | 8 | `database.*` 6（system と対）／`validation.error_title` / `general.error_title` |
| messageDelete | 6 | 削除済みコマンドオプション `user` / `channel` 関連 |
| vac | 6 | トリガー設定系の残骸 |
| memberLog | 4 | `log.channel_not_found` ほか（実装は別キーで通知済み） |
| stickyMessage | 3 | embed タイトル（平文メッセージに置き換わった） |
| bumpReminder | 3 | `embed.description.config_view` ほか |
| reactionRole | 1 | DB ログ |

> **(b) はゼロだった。** マニュアルに載っているのに実装が無いキーは無い。`/message-delete` の `user` / `channel` はマニュアルでも**選択メニュー**として説明されており、コマンドオプションとしては書かれていない（キーの方が古い設計の名残）。ticket の `reset` もマニュアルに記載が無い。
> **ticket の `reset` は未決タスクと関係する。** 「`resetAll` の要否 ＋ 機能単位 reset を足すか」で機能単位 reset を足すと決めた場合、文面を書き直すことになる。消した根拠は「実装もマニュアル記載も無い」であり、決定が出たら新しく書けばよい。
> **撤去後に ja / en のキー集合が完全一致することを検証した。** あわせて、キーが消えて見出しだけ残ったセクションコメント4箇所も落とした。

### 非アクティブ自動キックの環境変数・Embed 色の撤去（2026-09-20 develop merge）

機能削除（2026-09-20）の追従漏れ。`env.ts` に `INACTIVE_KICK_*` の4変数が型・スキーマ両方に残り、**起動のたびに読まれ続ける死んだ設定**になっていた。`.env.example` は使えない変数を案内していた。

- [x] `env.ts` の `Env` 型と `envSchema` から `INACTIVE_KICK_CRON_OVERRIDE` / `DRY_RUN` / `SKIP_GUARDS` / `MOCK_MEMBERS` を削除
- [x] `.env.example` の該当セクションを削除
- [x] `embedColors.ts` から `INACTIVE_KICK_WARN` / `INACTIVE_KICK_KICK` を削除
- [x] VC募集削除の際に**取り残されていた `VC_RECRUIT_PANEL` の JSDoc** を撤去（定数だけ消えてコメントが孤立していた）
- [x] `STICKY_MESSAGE_DEFAULT` のコメントにあった文字化け（閉じ括弧が壊れていた）を修正

> **孤立コメントは全ファイルを走査して他に無いことを確認した。** 行単位の一括削除は定数行だけを落として直前の JSDoc を残しうるため。
> **文字化けはこの掃除より前から存在していた**（パスコメント廃止コミットの親でも同じ状態）。触ったファイルなので同時に直した。

### ファイル冒頭のパスコメントの廃止（2026-09-20 develop merge）

**直すのではなく消した。** ディレクトリ再編（2026-05-29 完了）の追従漏れで、機能削除後の時点でも **687ファイル中377件、55%が実際の位置と違うパス**を書いていた。4か月直らなかったのは、移動のたびに人が手で追従させる仕組みしか無いためで、直しても再発する。パスはエディタのタブ・パンくず・ファイルツリーが常に正確に出すので、ファイル内に持つ価値がない。

- [x] `src` / `tests` 配下の全 `.ts` から1行目のパスコメントを削除（686件）
- [x] **説明行を持たない227ファイルは冒頭コメントごと消えた。** 大半がテストで、対象は `describe` が書いているため二重だった
- [x] `IMPLEMENTATION_GUIDELINES.md` のコード例からパス行を削り、書かない理由を明記
- [x] `TESTING_GUIDELINES.md` のコメント規約表とチェックリストから「ファイル先頭に `// tests/path/to/file.test.ts`」を削除

> **2行目の説明行は残した。** 移動しても腐らず、開いた瞬間に役割が分かる。実装ガイドラインの規約も「ファイル先頭で**何のファイルか**を明記する」であり、パスはコード例に含まれていただけ。
> **単独のコミットにした。** 他の変更と混ぜると差分が686ファイルに埋もれてレビュー不能になる。
> **ドキュメント内のコード例に残る `// src/...` は残した。** あれは「どのファイルの抜粋か」を示す注記で、ファイルが自分のパスを書く規約とは別物。

### VC自動募集の誤爆抑制（入室デバウンス）（2026-09-20 develop merge）

0人→1人 の瞬間に投稿していたため、**間違えて入って即抜けた**時や**誰かが抜けた直後に「まだ人がいる」と思って入った**時にも `@everyone` が飛び、ping だけが残っていた。0人→1人 から20秒待ち、満了時に条件を再判定してから投稿する。

- [x] `handleJoin` は予約だけを行い、`jobScheduler.addOneTimeJob`（jobId = 接頭辞 ＋ VC チャンネル ID）で20秒後に `postInvite` を呼ぶ。**同 ID 置換がそのままデバウンスになる**
- [x] `postInvite` は発火時に **`guild.channels.fetch` で VC を取り直してから**在室判定する。あわせて enabled / 投稿先 / allowlist / 在室人間 ≧1 を再判定する
- [x] 空室化（`handleLeave`）と `channelDelete` で保留中の予約を解除する
- [x] `repostCooldown` と `VC_AUTO_RECRUIT_REPOST_COOLDOWN_MS`、ロケールキー `log.invite_skipped_cooldown` を削除
- [x] `jobScheduler.addOneTimeJob` に `{ quiet: true }` を追加し、同ID置換時の warn を抑止できるようにした
- [x] テスト3ケース（デバウンス中に退出→投稿しない／滞在継続→投稿する／全員退出→入り直し→1回だけ投稿）を fake timers で追加

> **投稿は遅らせるが、募集終了は遅らせない。** 終了まで遅らせると空 VC を指す「🔊 VCに参加」ボタンが生き残り、誤爆を機能側から作ることになる。投稿が20秒遅れて困る人はいない。
> **連投抑制クールダウンを廃止した理由。** 投稿**後**の抑制なので、今回対象にした誤爆は素通りしていた。しかも実際に効くのは「全員退出 → 60秒以内に入り直し」だけで、その時は直前に募集終了へ差し替わっているため、**VC に人がいるのに「募集終了」のまま**という嘘の表示が残っていた。
> **発火時にチャンネルを取り直す理由。** `VoiceState.channel` はキャッシュの生参照で、握ったまま20秒後に `members` を読むと信用できない（過去に二重通知バグを生んだのと同じ罠）。
> **予約のきっかけになった本人が抜けていたら、在室者から代表を立て直す。** 抜けた人をメンションした募集を出さないため。A が入って予約 → B も入る → A だけ抜ける、で起きる。
> **再起動耐性は持たせない。** デバウンスはプロセス内のみで消えるが、`cleanupVcAutoRecruitOnStartup` が空 VC の募集を閉じるので自己修復する。DB へ永続化して起動時に復元すると、稼働中の全 VC へ通知が飛ぶ事故のほうが怖い。
> **秒数は定数で持つ。** ギルド設定化は運用の反応を見てから（shared のバージョン上げ・migration・コマンド・web UI へ波及する）。

### VC自動募集のカテゴリ残骸の撤去 ＋ shared v3.0.0（2026-09-20 develop merge）

チャンネル単位化（2026-06-30）で役目を終えたカテゴリ allowlist が、ロジック・型・DB・API・ロケール・テストの全レイヤーに残っていた。**設定する手段はとうに無い**（カテゴリ系サブコマンド廃止済み・web にも UI 無し）のに、概要 API は `対象カテゴリ: 0件` を表示し続けており、有効なのに未反映に見える状態だった。

- [x] `vcAutoRecruitSettingsService` からカテゴリ操作4メソッドを削除（`addEnabledCategory` / `removeEnabledCategory` / `addEnabledCategories` / `removeEnabledCategories`）
- [x] `channelDelete` のカテゴリ allowlist 掃除分岐と、定義のみで未参照だった `VC_AUTO_RECRUIT_ROOT_CATEGORY = "TOP"` を撤去
- [x] entities / defaults / repository / アグリゲートリポジトリ / API resource から `enabledCategoryIds` を除去
- [x] 概要 API のサマリーを `対象カテゴリ: N件` から **`対象チャンネル: N件`**（`enabledChannelIds` ベース）へ差し替え
- [x] ロケール ja/en の未使用キー15件を撤去（カテゴリ系14 ＋ `log.post_failed`）。**全件について src からの参照がゼロであることを確認してから消した**
- [x] migration で `enabled_category_ids` 列を削除し、**テーブル名を `guild_vc_invite_settings` から `guild_vc_auto_recruit_settings` へ改称**
- [x] shared から `enabledCategoryIds` と VC募集の型2つを削除し **v3.0.0** として publish。saika / web の参照も更新
- [x] カテゴリ操作のテスト8ケース、`channelDelete` のカテゴリ掃除ケースを削除

> **テーブル名を同じ migration で直した理由**（2026-09-20 決定）。`@@map` が旧称 `vc-invite` のまま残っており、列削除と同時なら migration 1本で済む。別々にやると改称のためだけにもう1本切ることになる。
> **shared はここで1回だけ publish した**（2026-09-20 決定）。VC募集の型削除とカテゴリ列削除はどちらも破壊的変更だが、タスクごとに publish すると v3.0.0 と v4.0.0 を短期間に2つ消費する。掃除の残り（入室デバウンス・パスコメント廃止・未使用ロケールキー撤去）は shared に触らないため、このタイミングが唯一の publish 機会だった。
> **`enable_warning_no_category` は存在しないサブコマンドを案内していた。** 実際に使われているのは `enable_warning_no_channel` なので実害は無かったが、読む人を混乱させるため一緒に落とした。

### VC募集機能の削除（2026-09-20 develop merge）

実測で**行は自鯖の1件のみ、かつ `setups` が空**（2026-09-05）。パネルも投稿先も存在せず稼働しておらず、他鯖はゼロ。削除の根拠①（誰も使っていない）に該当する。saika の src 28ファイル・テスト34ファイルが消えた。

`enabled=true` になっていたのは `addSetup` が立てたフラグを false に戻す経路が無かったため（`enable`/`disable` サブコマンドが無く、teardown は `setups` から消すだけ）。デフォルトも `enabled: true` で、**このフラグは最初から意味を持っていなかった。**

- [x] `src/features/vc-recruit/` 一式と `/vc-recruit-settings` コマンド、テストを削除
- [x] **未配線のデッドコード `handleVcRecruitVoiceStateUpdate` を撤去。** src からの参照ゼロでテストだけが維持していた（自動削除を廃止した時の残骸）
- [x] `messageDelete` / `channelDelete` からフックを外し、composition root・モーダル2本・ボタン3本・セレクト3本の配線を除去
- [x] API の `vcRecruitResource` とルート登録、概要 API の該当カードを削除（機能カードは12→10）
- [x] ロケールの `vcRecruit` 名前空間（ja/en 各128キー）、help、`system.ts` のログ接頭辞、`embedColors`
- [x] `guild-settings` の export / import・アグリゲートリポジトリ・型定義・`shared/database/types/vcRecruitTypes.ts` から除去
- [x] migration で `guild_vc_recruit_settings` を削除
- [x] web ダッシュボードの `VcRecruitPage`・ルート・ナビ・モックを削除
- [x] **招待 URL からスレッド系の権限3件を削除**（下記）
- [x] README・ARCHITECTURE・IMPLEMENTATION_GUIDELINES・I18N_GUIDE・GIT_WORKFLOW・DISCORD_BOT_SETUP を追従

> **スレッド系の招待権限を外した理由**（2026-09-20 決定）。`CreatePublicThreads` / `ManageThreads` / `SendMessagesInThreads` はすべて VC募集の募集スレッド用で、削除後の src に**スレッド操作が1箇所も残らない**ことを確認した。チャンネル選択はすべて型制限されており、唯一スレッドを選べる message-delete は対象のメッセージを消すだけで投稿しない。既存サーバーは再招待するまで付与済み権限のまま。
> **ARCHITECTURE.md は非アクティブキック削除の追従漏れも直した。** `GuildInactiveKickSettings` / `MemberActivity` とそのリポジトリが表に残っており、`guildId` を持つモデル数も 16 のままだった（実際は13）。
> **`shared` の `VcRecruitSetup` / `VcRecruitSettings` はまだ消していない。** 掃除の最後に v3.0.0 として1回で publish する方針のため（2026-09-20 決定）。使われない型が残るのは掃除の間だけ。
> **マニュアル（USER_MANUAL.md）は触っていない。** 削除3機能ぶんをまとめて落とす「マニュアル全面修正」タスクで対応する。非アクティブキックと `/vc` も同じ状態。

### Bot ステータスをギルド参加・退出時に更新する（2026-09-20 完了・本番デプロイ済み）

`applyBotPresence()` の呼び出し元が `clientReady` / `shardReady` / `shardResume` の3箇所しかなく、参加・退出しても**再起動または再接続まで古いサーバー数が表示され続けていた**。

- [x] `applyBotPresence` を `clientReadyHandler.ts` のプライベート関数から `bot/services/botPresence.ts` へ切り出して export
- [x] `guildCreateHandler` と `guildCreate` イベントを新設し、参加時にプレゼンスを更新（ログも出す。ロケールに `guild_create.joined` と `log_prefix.guild_create` を追加）
- [x] `guildDeleteHandler` で退出時に更新する。設定削除の成否に依存しないよう purge より前に呼ぶ
- [x] テスト9件（プレゼンス適用・両ハンドラ・イベント委譲・削除失敗時も更新されること）

> **定期リフレッシュは入れない（2026-09-20 決定）。** discord.js を読んで確認した結果、件数が変わる経路と表示が消える経路はこの5イベントで塞がる。`guildCreate` はキャッシュへの追加後、`guildDelete` はキャッシュからの削除後に発火するので、ハンドラ内で `guilds.cache.size` を読めば更新後の件数になる。**障害時は `guildUnavailable` が飛び `guildDelete` は飛ばず**、キャッシュからも消えないため件数は変わらない（これは「まだ参加している」という意味で正しい）。残る穴は20秒に6サーバー以上を出入りしてプレゼンスのレート制限に当たる場合だけで、常時レート制限の枠を食う定期実行に見合わない。
> **`guildCreate` ハンドラは「退出時データの遅延削除」でも必要になるもの**で、あちらはこのハンドラに乗せる（TODO を更新済み）。

### 開発 Bot に残るグローバルコマンド残骸の恒久対応（2026-09-20 完了・本番デプロイ済み）

ソースから消したコマンド（`/vc` など）が開発サーバーのサジェストに出続けていた。**一括 PUT は指定したスコープしか置き換えない**ため、過去に `DISCORD_GUILD_ID` 未設定で起動したときのグローバル登録が残り、ギルド登録と合わさって二重に見えていた。手で1回消しても、次に `DISCORD_GUILD_ID` を外して起動すれば再発する。

- [x] `main.ts` のギルド登録後に、`NODE_ENV === "development"` のときだけグローバル側へ空配列を PUT する
- [x] ロケールに `bot.commands.global_cleared` を追加（ja / en）
- [x] `main.test.ts` に回帰テスト2件（開発環境では空 PUT が走る / それ以外ではグローバル側に触れない）

> **開発環境に限定した理由。** 本番はグローバル登録で動いているため、本番で誤って `DISCORD_GUILD_ID` を設定して起動すると、この処理が本番のコマンドを全消しする。`NODE_ENV` で縛れば本番では絶対に走らない。
> **開発 Bot と本番の彩加は別の Discord アプリケーション**なので、開発側のグローバルを空にしても本番には影響しない。

### 非アクティブ自動キック機能の削除（2026-09-20 完了・本番デプロイ済み）

実測で**有効ギルド0**（2026-09-05）。自鯖でも未使用で、削除の根拠①（誰も使っていない）に該当する。saika だけで42ファイル・約8,000行が消え、参照していた配線・API・ロケール・テストも合わせて整理した。

**告知は出していない。** 自鯖への告知は掃除が終わってからまとめて出す（→ TODO.md の残タスク サマリー）。

- [x] `src/features/inactive-kick/` 一式と `/inactive-kick-settings` コマンド、テストを削除
- [x] `messageCreate` / `voiceStateUpdate` / `guildMemberRemove` からフックを外し、**`messageReactionAdd` はリスナーごと削除**（利用者がこの機能だけだった）
- [x] **`client.ts` から `GuildMessageReactions` インテントと `Partials.Reaction` を削除。** 公開 Bot の要求インテントを1つ減らせた。`Partials.Message` はメッセージ削除系で使うので残す
- [x] `clientReadyHandler` の毎時スイープ登録、composition root、モーダル3本・セレクト2本の配線を除去
- [x] API の `inactiveKickResource` とルート登録、概要 API の該当カードを削除
- [x] ロケールの `inactiveKick` 名前空間（18→17）、help、`system.ts` のログ接頭辞
- [x] `guild-settings` の export / import・アグリゲートリポジトリ・型定義から除去
- [x] migration で `guild_inactive_kick_settings` と `member_activities` を削除
- [x] web ダッシュボードの `InactiveKickPage`（539行）・ルート・ナビ・モックを削除
- [x] shared から `InactiveKickSettings` / `InactiveKickTier` を削除し **v2.0.0** として publish。saika / web の参照も更新

> **shared をメジャーに上げた理由**（2026-09-20 決定）。公開 API の削除は破壊的変更で、セマンティックバージョニングではメジャーを上げる。`v1.1.0` と `v1.2.0` も実際には破壊的変更だったが minor で出しており、同じ誤りを3度目にしないための判断。利用者は saika と web だけで、どちらもタグを固定して同時に更新するためコストはゼロ。将来 Dependabot / Renovate を入れたとき、メジャーとマイナーで扱いを分けられる利点もある。
> **テーブルも同時に削除した。** 有効ギルド0で機能ごと廃止するため、残しても使い道がない。

### `/vc`（VC操作コマンド）の削除（2026-09-20 完了・本番デプロイ済み）

権限の穴を修正ではなく削除で塞いだ（判断は→「決定事項」）。`/vc` に `setDefaultMemberPermissions` が無く、実行側の権限チェックも無かったため、サーバーの誰でも他人を切断・移動でき、`target-channel` を指定すれば通話中の VC を丸ごと吹き飛ばせた。

`/afk` の権限修正・レート制限の恒久対応と合わせて1本の release PR（[#108](https://github.com/ayasono-project/saika/pull/108)）で出した。**告知はまだ出していない**（掃除完了後にまとめて出す）。

- [x] `src/features/vc-command/` 8ファイルと `/vc` コマンド、テスト10ファイルを削除
- [x] ロケールの `vc` 名前空間を廃止。共通ヘルパー3ファイルと `/afk` が参照し続ける `action-log.*` / `bulk-confirm.*` / `user-response.*` などは **キー名を変えずに `afk` 名前空間へ移設**した。名前空間は19個から18個に
- [x] `isManagedVacChannel`（`vacSettingsService.ts`）を削除。最後の利用者が `getManagedVoiceChannel` だった
- [x] 到達不能になったコードを撤去。`VcActionType` を `"afk"` だけに絞り、`disconnect` / `move` の分岐・絵文字・i18n キーを削除
- [x] `/vc` 専用だった `reason` オプションの受け渡しを削除。入力経路が無くなり常に未指定になるため、結果 Embed の「理由」フィールドとそのキー2件も落とした
- [x] `afk` 名前空間に残っていた未使用キー3件（`user-response.moved` / `member_not_found` / `user_not_in_voice`）を削除。移設してくる `member_not_found` と名前が衝突したため、同時に解消した
- [x] help・README・`DISCORD_BOT_SETUP.md`・`IMPLEMENTATION_GUIDELINES.md`・`I18N_GUIDE.md`・招待権限のコメントを追従

> **共通ヘルパー3ファイル（`vcBulkAction.ts` / `vcActionLog.ts` / `vcActionTarget.ts`）は残した。** `/afk` が使い続けるため。利用者が1つになったので `/afk` 側へ畳む整理はできるが、ファイル名の変更や統合は掃除フェーズで行う。`VcActionType` が単一メンバーの union になっているのはその名残。
> **結果 Embed から「理由」フィールドが消える。** `/vc disconnect` / `/vc move` の `reason` オプションからしか値が入らなかったため、残すと常に「指定なし」を表示し続けることになる。マニュアルへの反映は「マニュアル全面修正」でまとめて行う。

### Web API のレート制限すり抜けの恒久対応（2026-09-20 完了・本番デプロイ済み）

`server.ts` が `trustProxy: true` だったため、`request.ip` が `X-Forwarded-For` の最左、つまり攻撃者が送った値になり、誰でもレート制限（300回/分）をすり抜けられた。本番の `/health` に偽のヘッダを付けて3回叩き、残り回数が 299 のまま減らないことで実在を確認した。あわせて `@fastify/rate-limit` 11.1.0 の IPv6 アドレス回転によるすり抜け（CVE-2026-15144・CVSS 7.3）も塞いだ。データ漏えい・認証破りではないので hotfix にはしていない。

**本番リリースはしない。** develop には `/afk` の修正が載っているので、`/vc` 削除と同じ release PR でまとめて出す。release 後の本番確認は TODO.md の `/vc` 削除タスクに移してある。

- [x] 実測。Coolify のターミナルで bot コンテナの `/proc/net/route` と `/proc/net/tcp` を読み、API への接続がすべて Docker ネットワークのゲートウェイ `10.0.1.1` から来ることを確認した（コンテナは `10.0.1.2`。eth0 `10.0.1.0/24` と eth1 `10.0.2.0/24` の2ネットワークに所属）。Cloudflare の「Remove visitor IP headers」がオフであることは、偽のヘッダが origin まで届いた挙動から確認した
- [x] `trustProxy` を `TRUSTED_PROXY_RANGES`（`["loopback", "10.0.0.0/8"]`・`src/api/constants.ts`）に変更。経路と理由は定数の JSDoc に残した
- [x] `@fastify/rate-limit` を 11.2.0 へ。`ipv6Subnet` は既定の64
- [x] 回帰テスト5件（`tests/unit/api/server.test.ts`）。`true`・中継数 `1`・`["loopback"]`・11.1.0 に1つずつ戻し、それぞれ該当のケースが落ちることを実際に確かめた
- [x] `ARCHITECTURE.md` に「クライアント IP は `request.ip` だけを使う」規約、`DEPLOYMENT.md` に到達経路・見直しの条件・確認手順を追記
- [x] `bodyLimit` を既定の 1MiB から 256KiB へ。Fastify は認証（`preHandler`）より前に本文をパースするため、認証が要るルートでも未認証のリクエストに本文を読ませられる。正規の本文の最大は数十KB（リアクションロールのパネル・チャンネル ID の配列）なので十分な余裕がある。あわせて 413 が契約コードに無く `INTERNAL_ERROR` になっていたのを `VALIDATION_ERROR` へ写像
- [x] `ARCHITECTURE.md` のプラグイン登録順の誤りを修正（実装は cookie → cors → rate-limit → routes。認証はミドルウェアではなく `decorate`）
- [x] `DEPLOYMENT.md` の構成図からコンテナ名 `saika-bot` を削除。Coolify は `<サービス名>-<UUID>` で命名するため固定ではなく、公開ポートで探す手順に差し替えた
- [x] web リポの BFF も `trustProxy: true` を同じ信頼範囲に変更（別リポジトリ・別コミット）。`request.ip` / `host` / `protocol` の利用箇所は無く潜在的な問題だったが、使い始めた時点で穴になるため先に塞いだ。OAuth の `redirect_uri` は `WEB_BASE_URL` から組み立てておりホストヘッダ由来ではないことを確認済み

> **信頼範囲を `10.0.0.0/8` にした理由**: インターネット上の攻撃者は 10.x から接続できないので、本来の穴はこれで塞がる。Docker は別のネットワーク同士の通信を遮断するので、実際に saika へ直接つなげるのはホストと、saika と同じネットワークにいる自前のコンテナだけ。`10.0.1.1` や `10.0.1.0/24` に絞ると、ネットワークが作り直されてアドレスが変わった瞬間に外れ、全員が同じ枠に入って黙って劣化する。恒久性を優先した。
> **採らない案と理由**: ①**鍵だけ `CF-Connecting-IP` に差し替える** — `request.ip` の汚染が残り、将来 `request.ip` を使った箇所で同じ穴を踏む（場当たりの修正はしない方針・2026-09-20）。②**中継数での指定** — 直前の中継のアドレスを確かめないので、経路が縮むと黙って偽装可能になる。fastify 5.12.1 以降では数値指定が黙って「誰も信頼しない」になる。③**環境変数化** — 運用画面から `true` に戻せてしまい、テストで守れない。④**`CF-Connecting-IP` の併用** — IP の取得口が2つになり、どちらが正しいかがまた割れる。⑤**`keyGenerator` の差し替え** — 11.2.0 の IPv6 正規化が自動では効かなくなる。
> **調査中に見つかった周辺の不備は、同じ機会にまとめて直した**（2026-09-20 判断）: `bodyLimit` 未設定／413 の写像漏れ／`ARCHITECTURE.md` のプラグイン順の誤り／`DEPLOYMENT.md` の固定コンテナ名／web BFF の `trustProxy: true`。いずれも同じ「プロキシ前提の設定が実態と合っていない」系で、別タスクに分けても同じファイルを二度開くことになるため。

### `/afk` の権限修正（2026-09-20 完了・本番デプロイ済み）

`/afk` を「他メンバーを動かす」専用にし、既定の実行権限を `MoveMembers` に絞った。対だった `/vc` 削除は分割して残タスクに置いてある（→ TODO.md「いま着手できる」）。

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
