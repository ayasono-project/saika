// src/shared/config/appVersion.ts
// アプリケーションのバージョンを package.json から取得する（単一情報源）

import { readFileSync } from "fs";
import { resolve } from "path";

// バージョンは実行中に変化しないため一度だけ読み取りキャッシュする
let cachedVersion: string | undefined;

/**
 * アプリケーションのバージョンを返す。
 *
 * package.json を単一情報源とし、プロセスのカレントディレクトリ
 * （dev: プロジェクトルート / 本番 Docker: WORKDIR=/app）から読み取る。
 * tsup の splitting で import.meta.dirname が不安定になるため、cwd 基準で解決する。
 * 読み取りや解析に失敗した場合は "unknown" を返す。
 * @returns セマンティックバージョン文字列（例: "2.0.0"）
 */
export function getAppVersion(): string {
  if (cachedVersion !== undefined) {
    return cachedVersion;
  }
  try {
    const pkgPath = resolve(process.cwd(), "package.json");
    const raw = readFileSync(pkgPath, "utf-8");
    const parsed = JSON.parse(raw) as { version?: string };
    cachedVersion = parsed.version ?? "unknown";
  } catch {
    cachedVersion = "unknown";
  }
  return cachedVersion;
}
