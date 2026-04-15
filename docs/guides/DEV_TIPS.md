# 開発 Tips

> 開発中に遭遇しやすいトラブルと対処法

最終更新: 2026年3月21日

---

## トラブルシューティング

### bot プロセスがバックグラウンドに残っている

開発コンテナ内で起動した bot がターミナルを閉じても残り続ける場合がある。

```bash
# bot プロセスを探す
ps aux | grep "dist/bot/main.js" | grep -v grep

# 見つかったら PID を指定して停止
kill <PID>
```

TTY が `?` のプロセスはターミナルに紐づかないバックグラウンド実行なので、手動で停止する必要がある。

### VSCode で TypeScript エラーが消えない

`pnpm typecheck` は通るのに VSCode 上で赤線が残る場合、言語サーバーのキャッシュが原因。

1. `Ctrl+Shift+P` → **TypeScript: Restart TS Server** を実行
2. それでも解消しない場合は **Developer: Reload Window** を実行

### Coolify のボリューム名について

Coolify はアプリ ID をプレフィックスとして付与するため、compose 上の `sqlite_data` はホスト上では `<app-id>_sqlite-data` になる。

```bash
# 実際のボリューム名を確認
docker volume ls | grep sqlite
```

Coolify 管理画面の **Storages** でも確認できる。以下の手順ではこのボリューム名を `<VOLUME>` と表記する。

### Coolify で DB データを復旧する

Coolify のアプリ再作成やボリューム再生成でデータが消えた場合、バックアップやコピー元のボリュームからデータを復旧する。

```bash
# 1. Coolify のコンテナ名を確認して停止
docker ps --filter label=coolify.managed=true
docker stop <コンテナ名>

# 2. コピー元ボリュームからCoolifyボリュームにDBファイルをコピー
docker run --rm \
  -v <コピー元ボリューム>:/src:ro \
  -v <VOLUME>:/dst \
  alpine sh -c "cp /src/db.sqlite /dst/db.sqlite"

# 3. コンテナを再起動
docker start <コンテナ名>
```

- コピー元がホスト上のファイルの場合はバインドマウントに置き換える（例: `-v /path/to/backup:/src:ro`）
- 復旧後は Coolify 管理画面の Logs または `docker logs <コンテナ名>` で起動を確認する

### Prisma マイグレーション失敗（P3009）でコンテナが再起動ループする

`_prisma_migrations` テーブルに失敗記録が残っていると、起動時の `prisma migrate deploy` が毎回エラーになりコンテナがクラッシュループする。

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `<マイグレーション名>` migration started at ... failed
```

**復旧手順:**

```bash
# 1. ホスト側から直接 DB の失敗記録を修正
docker run --rm -v <VOLUME>:/data alpine sh -c \
  "apk add --no-cache sqlite && sqlite3 /data/db.sqlite \
   \"UPDATE _prisma_migrations SET finished_at = datetime('now'), logs = NULL WHERE migration_name = '<失敗したマイグレーション名>';\""

# 2. Coolify 管理画面から Restart、または:
docker restart <コンテナ名>
```

- マイグレーション名はエラーログから確認できる
- テーブルが実際に作られていない場合は DB ファイルを削除して全マイグレーションをやり直す方法もある（既存データは消える）
