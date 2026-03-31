// src/bot/features/member-log/handlers/accountAge.ts
// アカウント年齢の計算ユーティリティ

import { intervalToDuration } from "date-fns";

/**
 * アカウント作成日から現在までの年齢を年・月・日で返す。
 * date-fns の intervalToDuration を使用し、うるう年を含む差分を正確に算出する。
 *
 * @param createdTimestamp - `Date.now()` 相当のミリ秒タイムスタンプ
 */
export function calcDuration(createdTimestamp: number): {
  years: number;
  months: number;
  days: number;
} {
  const {
    years = 0,
    months = 0,
    days = 0,
  } = intervalToDuration({
    start: new Date(createdTimestamp),
    end: new Date(),
  });
  return { years, months, days };
}
