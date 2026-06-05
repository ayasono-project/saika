// src/api/lib/time.ts
// ダッシュボード表示用の時刻整形

import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

/** ミリ秒タイムスタンプを「〜前」の日本語相対表記にする */
export function relativeLabel(timestampMs: number): string {
  return formatDistanceToNow(new Date(timestampMs), {
    addSuffix: true,
    locale: ja,
  });
}
