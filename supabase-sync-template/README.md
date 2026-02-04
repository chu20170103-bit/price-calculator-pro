# 靜態網站串接 Supabase — 報告書解析範本

此資料夾為**可攜式範本**，內含報告書、設定檔範本與自動化腳本，可整包複製到其他「靜態網站 + GitHub Pages + Supabase」專案使用。

## 內容一覽

| 項目 | 說明 |
|------|------|
| `靜態網站串接Supabase解決方案報告.md` | 完整解決方案報告（導入流程、資料庫設計、自動化步驟） |
| `supabase-sync.config.json` | 設定檔範本（表名／欄位名／env）；導入新專案後由 `detect` 腳本依該專案改寫 |
| `scripts/*.mjs` | 偵測、產生 config、產生 migrations、一鍵設定、檢查連線等腳本 |

## 如何導入到其他專案

1. **複製檔案到新專案**（保持相對路徑）  
   - 將本資料夾內的 `supabase-sync.config.json` 複製到**新專案根目錄**  
   - 將本資料夾內的 `scripts/` 底下所有 `.mjs` 腳本複製到**新專案的 `scripts/`**  
   - 將 `靜態網站串接Supabase解決方案報告.md` 複製到新專案（例如 `docs/`）

2. **在新專案加入 npm scripts**（見報告書 §6.4）  
   - `supabase:detect`、`supabase:generate-config`、`supabase:generate-migrations`、`supabase:auto-setup`、`supabase:check`、`db:push`、`deploy` 等

3. **執行一鍵自動化**  
   - 在新專案根目錄執行：`npm run supabase:auto-setup`  
   - 腳本會依該專案的 migrations／程式碼判斷表名與欄位，改寫 `supabase-sync.config.json` 並產生 `src/lib/supabase-sync-config.ts`

4. **前端同步邏輯**  
   - 新專案需有 `src/hooks/useSupabaseSync.ts`（或同等邏輯）與 `src/lib/supabase-sync-config.ts`（由腳本產生），詳見報告書 §6.2。

詳細步驟、檢查清單與問題排除請直接閱讀 **`靜態網站串接Supabase解決方案報告.md`**。
