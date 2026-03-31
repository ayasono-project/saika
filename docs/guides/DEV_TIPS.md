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

### Prisma マイグレーション失敗（P3009）でコンテナが再起動ループする

`_prisma_migrations` テーブルに失敗記録が残っていると、起動時の `prisma migrate deploy` が毎回エラーになりコンテナがクラッシュループする。

```
Error: P3009
migrate found failed migrations in the target database, new migrations will not be applied.
The `<マイグレーション名>` migration started at ... failed
```

**復旧手順:**

> **ボリューム名について**: compose ファイルでは `sqlite_data` と定義しているが、Portainer がスタック名（saika）をプレフィックスとして自動付与するため、ホスト上の実際のパスは `saika_sqlite_data` になる。

```bash
# 1. ホスト側から直接 DB の失敗記録を修正
sudo sqlite3 /var/lib/docker/volumes/saika_sqlite_data/_data/db.sqlite \
  "UPDATE _prisma_migrations SET finished_at = datetime('now'), logs = NULL WHERE migration_name = '<失敗したマイグレーション名>';"

# 2. コンテナを再起動（自動再起動している場合は不要）
docker restart saika-bot
```

- `sqlite3` がない場合は `sudo apt install sqlite3` でインストール
- マイグレーション名はエラーログから確認できる
- テーブルが実際に作られていない場合は DB ファイルを削除して全マイグレーションをやり直す方法もある（`sudo rm /var/lib/docker/volumes/saika_sqlite_data/_data/db.sqlite` → 既存データは消える）
