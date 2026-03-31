// src/bot/utils/eventLoader.ts
// events/ ディレクトリを自動スキャンしてイベントを動的ロードする

import { readdirSync } from "fs";
import { resolve } from "path";
import type { BotEvent } from "../types/discord";

/**
 * 値が BotEvent 型として有効かを判定するタイプガード
 * name / execute の存在を最低限チェックする
 * @param value 判定対象の値
 * @returns BotEvent 型として有効であれば true
 */
function isBotEvent(value: unknown): value is BotEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    "execute" in value &&
    typeof (value as BotEvent).execute === "function"
  );
}

/**
 * events/ ディレクトリ配下のファイルをスキャンし、
 * BotEvent エクスポートを含むモジュールをすべて動的インポートする。
 *
 * - 開発時（tsx）: .ts ファイルをそのまま import
 * - 本番時（tsup ビルド後）: .js ファイルを import
 *
 * @param eventsDir イベントファイルが格納されたディレクトリの絶対パス。
 *   tsup の splitting により import.meta.dirname が共有チャンクのパスに変わるため、
 *   呼び出し元（main.ts）から正しいパスを渡すこと。
 *   省略した場合は import.meta.dirname を基準に解決する（開発時用フォールバック）。
 * @returns ロードされた BotEvent オブジェクトの配列
 */
export async function loadEvents(
  eventsDir: string = resolve(import.meta.dirname, "../events"),
): Promise<BotEvent[]> {
  let files: string[];
  try {
    files = readdirSync(eventsDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `[eventLoader] events ディレクトリが見つかりません: ${eventsDir}\n` +
          `tsup の splitting により import.meta.dirname がチャンクファイルの場所に変わる場合があります。\n` +
          `loadEvents() を呼び出す際は、呼び出し元の import.meta.dirname を基準とした絶対パスを引数に渡してください。`,
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

  const events: BotEvent[] = [];

  for (const file of files) {
    // 絶対パスで動的インポート（開発・本番どちらでも動作）
    const mod: Record<string, unknown> = await import(resolve(eventsDir, file));

    for (const [key, value] of Object.entries(mod)) {
      // default export は named export と同一オブジェクトになるためスキップして重複を防ぐ
      if (key !== "default" && isBotEvent(value)) {
        events.push(value);
      }
    }
  }

  return events;
}
