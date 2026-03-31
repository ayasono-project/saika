#!/usr/bin/env bash
# コードベースの .ts ファイル数・行数を集計する
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

count() {
  local dir="$1"
  local files lines
  files=$(find "$dir" -type f -name '*.ts' | wc -l)
  lines=$(find "$dir" -type f -name '*.ts' -exec cat {} + 2>/dev/null | wc -l)
  echo "$files $lines"
}

read -r src_files src_lines <<< "$(count "$ROOT_DIR/src")"
read -r test_files test_lines <<< "$(count "$ROOT_DIR/tests")"
total_files=$((src_files + test_files))
total_lines=$((src_lines + test_lines))

printf "| 対象 | ファイル数 | 行数 |\n"
printf "| --- | ---: | ---: |\n"
printf "| src | %s | %s |\n" "$src_files" "$src_lines"
printf "| tests | %s | %s |\n" "$test_files" "$test_lines"
printf "| **合計** | **%s** | **%s** |\n" "$total_files" "$total_lines"
