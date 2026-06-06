#!/usr/bin/env node
// 彩加（Bot）が参加中のサーバー一覧を Discord API から取得する。
// guildCreate を記録していないため「どこに導入されたか」を後から確認する用途。
// 依存ゼロ（Node 標準の fetch のみ）。トークンは引数 --token を最優先し、
// 無ければ環境変数 DISCORD_TOKEN、さらに無ければリポジトリ直下 .env から読む。
//
// 使い方:
//   node scripts/list-guilds.mjs                  # 整形テーブル
//   node scripts/list-guilds.mjs --json           # 生 JSON をそのまま出力
//   node scripts/list-guilds.mjs --token <TOKEN>  # トークンを引数で指定
//   node scripts/list-guilds.mjs --token=<TOKEN>  # （= 区切りも可）

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");

/** 引数から --token の値を取り出す（--token VALUE / --token=VALUE 両対応） */
function tokenFromArgs(argv) {
  const eq = argv.find((a) => a.startsWith("--token="));
  if (eq) return eq.slice("--token=".length).trim();
  const i = argv.indexOf("--token");
  if (i !== -1 && argv[i + 1] && !argv[i + 1].startsWith("--")) {
    return argv[i + 1].trim();
  }
  return "";
}

/** DISCORD_TOKEN を 引数 > env > .env の順で解決する */
function resolveToken() {
  const fromArgs = tokenFromArgs(process.argv.slice(2));
  if (fromArgs) return fromArgs;
  if (process.env.DISCORD_TOKEN) return process.env.DISCORD_TOKEN;
  try {
    const envFile = readFileSync(join(ROOT_DIR, ".env"), "utf8");
    const line = envFile
      .split(/\r?\n/)
      .find((l) => l.startsWith("DISCORD_TOKEN="));
    if (line) return line.slice("DISCORD_TOKEN=".length).trim().replace(/^["']|["']$/g, "");
  } catch {
    // .env が無ければ env のみで判定
  }
  return "";
}

/** Snowflake から生成日時（UTC ISO 文字列）を復元する */
function snowflakeToDate(id) {
  const DISCORD_EPOCH = 1420070400000n;
  const ms = (BigInt(id) >> 22n) + DISCORD_EPOCH;
  return new Date(Number(ms)).toISOString().replace(".000Z", "Z");
}

async function main() {
  const token = resolveToken();
  if (!token) {
    console.error(`DISCORD_TOKEN が未設定です（--token 引数・環境変数・${join(ROOT_DIR, ".env")} のいずれかで指定してください）`);
    process.exit(1);
  }

  const res = await fetch(
    "https://discord.com/api/v10/users/@me/guilds?with_counts=true",
    { headers: { Authorization: `Bot ${token}` } },
  );
  if (!res.ok) {
    console.error(`Discord API エラー: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }

  const guilds = await res.json();

  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(guilds, null, 2));
    return;
  }

  // サーバー作成時刻が新しい順（Snowflake 降順）に並べる。
  // 「サーバー作成日時」であり Bot の参加日時ではない点に注意。
  guilds.sort((a, b) => (BigInt(a.id) < BigInt(b.id) ? 1 : -1));

  console.log(`参加サーバー数: ${guilds.length}\n`);
  console.log("| サーバー名 | ギルドID | メンバー数(概算) | サーバー作成日時(UTC) |");
  console.log("| --- | --- | ---: | --- |");
  for (const g of guilds) {
    const members = g.approximate_member_count ?? "-";
    console.log(`| ${g.name} | ${g.id} | ${members} | ${snowflakeToDate(g.id)} |`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
