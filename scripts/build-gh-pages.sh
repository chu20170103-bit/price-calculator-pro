#!/bin/bash
# 建置給 GitHub Pages 用的靜態檔，輸出到 docs/
# 倉庫名 = price-calculator-pro，網址 = https://<帳號>.github.io/price-calculator-pro/
set -e
export BASE_PATH="/price-calculator-pro/"
npm run build
rm -rf docs
mkdir -p docs
cp -r dist/* docs/
echo "✓ 已輸出到 docs/，commit 並 push 後 GitHub Pages 會自動更新。"
