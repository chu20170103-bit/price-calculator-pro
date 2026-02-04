# PRICElady

靜態網頁 + Supabase，報價試算與方案紀錄可存雲端。

## 本機開發

```bash
npm i
```

在專案根目錄建 `.env`：

```
VITE_SUPABASE_URL=你的 Supabase 專案 URL
VITE_SUPABASE_ANON_KEY=你的 Supabase anon key
```

然後：

```bash
npm run dev
```

即可在本機跑、並從 Supabase 讀寫資料。資料表設定見 `supabase/SUPABASE_SETUP.md`。

## 部署（靜態網頁 + Supabase）

**本機建置後推上 GitHub Pages，不需 CI。**

1. **GitHub 設定一次**
   - Repo → **Settings → Pages** → Source 選 **Deploy from a branch**，Branch 選 **gh-pages**，Folder 選 **/ (root)**，儲存。

2. **本機部署**
   - 確保 `.env` 已設好 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`
   - 執行：
   ```bash
   npm run deploy
   ```
   - 會自動：用目前 .env 建置 → 把 `dist` 推到 `gh-pages` 分支。完成後開 `https://<你的帳號>.github.io/price-calculator-pro/` 即可，靜態網頁會從 Supabase 讀到資料。

之後改程式或改 .env 後，再跑一次 `npm run deploy` 即可更新網站。

## 技術

Vite、React、TypeScript、Tailwind、shadcn/ui、Supabase。
