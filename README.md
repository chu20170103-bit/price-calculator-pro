# PRICElady

報價試算與方案紀錄，支援 Supabase 雲端同步。

## 本機開發

```bash
npm i
npm run dev
```

在 `.env` 設定 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY` 即可連 Supabase（見 `supabase/SUPABASE_SETUP.md`）。

## 部署（GitHub Pages）

**一步到位：** push 到 `main` 就會自動建置並部署。

1. **設定一次（必做）**
   - Repo → **Settings → Pages**：
     - **Source** 選 **Deploy from a branch**
     - **Branch** 選 **gh-pages**（不是 main！）
     - **Folder** 選 **/ (root)**，按 Save
   - Repo → **Settings → Secrets and variables → Actions**：新增 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`（線上版才能讀寫雲端）。

2. **若曾選過 main 或 /docs**
   - 現在畫面上出現 `main.tsx 404`、favicon 404，代表 Pages 還在用「原始碼」而不是建置結果。請改為 **gh-pages** 分支後，到 **Actions** 分頁手動執行一次「Deploy to GitHub Pages」，等跑完再開網址。

3. **之後**
   - 改程式 → push 到 `main` → 等 Actions 跑完，網址自動更新。  
   - 網址：`https://<你的帳號>.github.io/price-calculator-pro/`

路徑與 favicon 由建置時自動處理，不需手動改。

## 技術

Vite、React、TypeScript、Tailwind、shadcn/ui、Supabase。
