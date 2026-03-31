// src/bot/utils/commandLoader.ts
// commands/ ディレクトリを自動スキャンしてコマンドを動的ロードする

import { readdirSync } from "fs";
import { resolve } from "path";
import type { Command } from "../types/discord";

/**
 * 値が Command 型として有効かを判定するタイプガード
 * data.name / execute / data.toJSON の存在を最低限チェックする
 * @param value 判定対象の値
 * @returns Command 型として有効であれば true
 */
function isCommand(value: unknown): value is Command {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "execute" in value &&
    typeof (value as Command).execute === "function"
  );
}

/**
 * commands/ ディレクトリ配下のファイルをスキャンし、
 * Command エクスポートを含むモジュールをすべて動的インポートする。
 *
 * - 開発時（tsx）: .ts ファイルをそのまま import
 * - 本番時（tsup ビルド後）: .js ファイルを import
 *
 * @param commandsDir コマンドファイルが格納されたディレクトリの絶対パス。
 *   tsup の splitting により import.meta.dirname が共有チャンクのパスに変わるため、
 *   呼び出し元（main.ts）から正しいパスを渡すこと。
 *   省略した場合は import.meta.dirname を基準に解決する（開発時用フォールバック）。
 * @returns ロードされた Command オブジェクトの配列
 */
export async function loadCommands(
  commandsDir: string = resolve(import.meta.dirname, "../commands"),
): Promise<Command[]> {
  let files: string[];
  try {
    files = readdirSync(commandsDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `[commandLoader] commands ディレクトリが見つかりません: ${commandsDir}\n` +
          `tsup の splitting により import.meta.dirname がチャンクファイルの場所に変わる場合があります。\n` +
          `loadCommands() を呼び出す際は、呼び出し元の import.meta.dirname を基準とした絶対パスを引数に渡してください。`,
      );
    }
    throw err;
  }
  files = files.filter(
    (f) =>
      // .ts（開発）または .js（本番）のみ対象、型定義・マップファイルは除外
      (f.endsWith(".ts") || f.endsWith(".js")) &&
      !f.endsWith(".d.ts") &&
      !f.endsWith(".js.map"),
  );

  const commands: Command[] = [];

  for (const file of files) {
    // 絶対パスで動的インポート（開発・本番どちらでも動作）
    const mod: Record<string, unknown> = await import(
      resolve(commandsDir, file)
    );

    for (const [key, value] of Object.entries(mod)) {
      // default export は named export と同一オブジェクトになるためスキップして重複を防ぐ
      if (key === "default") continue;
      if (isCommand(value)) {
        commands.push(value);
      }
    }
  }

  return commands;
}
