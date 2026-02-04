#!/bin/bash
# 一鍵清除 GitHub 登入，下次 git push 會再問你要用哪個帳號
# 適用多帳號：要換成哪一個就執行此腳本，然後 push 時登入那個帳號即可
# 用法：bash scripts/switch-github.sh

echo "正在清除已儲存的 GitHub 登入..."
git credential reject <<EOF
protocol=https
host=github.com
EOF

if [ "$(uname)" = "Darwin" ]; then
  echo ""
  echo "【Mac】若仍用舊帳號，請手動刪除鑰匙圈："
  echo "  1. 打開「鑰匙圈存取」"
  echo "  2. 搜尋「github」→ 刪除 github.com 那筆"
  echo ""
fi

echo "✓ 完成。下次執行 git push 時會跳出登入視窗，選你要用的那個 GitHub 帳號登入即可。"
