# 開発 Tips

> 開発中に遭遇しやすいトラブルと対処法

最終更新: 2026年9月26日

---

## ローカル開発 DB（PostgreSQL）

本番は Coolify のマネージド PostgreSQL を使うが、ローカル開発では `docker-compose.dev.yml` の Postgres を使う。`.env` の `DATABASE_URL` は `.env.example` の既定値（`postgresql://saika:saika@localhost:5432/saika?schema=public`）に合わせる。

```bash
pnpm db:up        # ローカル Postgres を起動（docker compose、バックグラウンド）
pnpm db:migrate   # マイグレーションを適用（初回・schema 変更時）
pnpm dev          # Bot を起動
pnpm db:studio    # Prisma Studio で中身を確認（任意）
pnpm db:down      # 停止（コンテナ削除。データは named volume に残る）
```

- VSCode の Debug 構成「🤖 Bot: Debug (Dev)」は `preLaunchTask` で `pnpm db:up` を自動実行するため、デバッグ開始時に Postgres が立ち上がる（初回はマイグレーション未適用なら `pnpm db:migrate` を先に実行）。
- **データを完全リセット**したい場合は volume ごと削除する:

```bash
docker compose -f docker-compose.dev.yml down -v   # volume も削除
pnpm db:up && pnpm db:migrate                       # 作り直し
```

---

## トラブルシューティング

### bot プロセスがバックグラウンドに残っている

開発コンテナ内で起動した bot がターミナルを閉じても残り続ける場合がある。

```bash
# bot プロセスを探す
ps aux | grep "dist/main.js" | grep -v grep

# 見つかったら PID を指定して停止
kill <PID>
```

TTY が `?` のプロセスはターミナルに紐づかないバックグラウンド実行なので、手動で停止する必要がある。

### VSCode で TypeScript エラーが消えない

`pnpm typecheck` は通るのに VSCode 上で赤線が残る場合、言語サーバーのキャッシュが原因。

1. `Ctrl+Shift+P` → **TypeScript: Restart TS Server** を実行
2. それでも解消しない場合は **Developer: Reload Window** を実行

### Coolify マネージド PostgreSQL について

DB は Coolify のマネージド PostgreSQL に分離されており、Bot コンテナは `DATABASE_URL` で接続する（SQLite 時代の `sqlite_data` ボリュームは廃止）。バックアップ・復元は Coolify の Scheduled Backups（→ Cloudflare R2）で行う。具体的な手順は infra リポジトリの docs を参照。

### Prisma マイグレーション失敗（P3009）でコンテナが再起動ループする

起動時の `prisma migrate deploy`（`docker-entrypoint.sh`）が失敗するとコンテナが終了し、再起動のたびに次のエラーで落ち続ける。`_prisma_migrations` に失敗の記録が残っていると、Prisma は以後のマイグレーションを一切適用しないため。

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `<マイグレーション名>` migration started at ... failed
```

**Bot のコンテナは落ち続けていて中に入れないので、復旧は DB 側で行う。** Coolify の DB リソース（saika-db）の **Runtime Logs** と **Terminal** を使う。

1. **Bot を止める**（Coolify で Stop）。再起動ループのまま進めると、途中で同じマイグレーションが再実行されて失敗記録が増える
2. **原因を見る**。DB の Runtime Logs で、失敗した時刻の `ERROR:` 行を探す。`BEGIN;` で囲んだマイグレーションは、Prisma の出力が `current transaction is aborted` という二次的なエラーになり、本当の原因はここにしか出ない
3. **途中まで適用されていないか確かめる**。
   - `BEGIN;` / `COMMIT;` で囲んだマイグレーションは、失敗した時点で全部巻き戻っている。確認は要らない
   - 囲んでいないマイグレーションは、失敗した文より前の文が適用済みのまま残っている。その分を手で戻してから次へ進む
4. **原因を取り除く**（データを直す、またはマイグレーションを直したコードを main に入れる）
5. **失敗の記録を「巻き戻し済み」にする**。Terminal でスーパーユーザーとして接続し、次を実行する（`prisma migrate resolve --rolled-back <名前>` と同じ処理）

   ```sql
   -- psql -U postgres -d saika
   SELECT migration_name, started_at FROM _prisma_migrations
    WHERE finished_at IS NULL AND rolled_back_at IS NULL;

   UPDATE _prisma_migrations SET rolled_back_at = now()
    WHERE migration_name = '<マイグレーション名>'
      AND finished_at IS NULL AND rolled_back_at IS NULL;
   ```

6. **Bot を Deploy する**。起動時の `migrate deploy` が同じマイグレーションを最初から適用し直す

- **失敗したマイグレーションを「適用済み」にしてはいけない**（`migrate resolve --applied` 相当）。実際には適用されていないので、アプリが古いスキーマのまま動く
- 手順2〜6は 2026-09-26 に使い捨て DB で確認した（途中の文を意図的に失敗させ、SQL で巻き戻し済みにして再適用できること、`migrate status` が最新になること）
