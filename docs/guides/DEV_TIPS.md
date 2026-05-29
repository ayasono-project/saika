# 開発 Tips

> 開発中に遭遇しやすいトラブルと対処法

最終更新: 2026年5月29日

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

`_prisma_migrations` テーブルに失敗記録が残っていると、起動時の `prisma migrate deploy` が毎回エラーになりコンテナがクラッシュループする。

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `<マイグレーション名>` migration started at ... failed
```

**復旧手順:**

```bash
# 失敗したマイグレーションを resolve（実際に適用済みなら --applied、
# 途中で失敗してロールバックしたいなら --rolled-back）
docker exec <コンテナ名> pnpm prisma migrate resolve --applied <失敗したマイグレーション名>
# または
docker exec <コンテナ名> pnpm prisma migrate resolve --rolled-back <失敗したマイグレーション名>

# Coolify 管理画面から Restart、または:
docker restart <コンテナ名>
```

- マイグレーション名はエラーログから確認できる
- 適用状況は `docker exec <コンテナ名> pnpm prisma migrate status` で確認できる
