# Supabase 與部署檢查清單

依序確認以下項目，線上版才能正常讀寫資料庫。

---

## 1. Supabase 資料表與權限（只需做一次）

- [ ] 已在 Supabase Dashboard 執行過 **SQL** 或 **CLI** 建立表：
  - **方式 A**：Dashboard → SQL Editor，貼上 `supabase/schema.sql` 或已套用 `supabase/migrations/` 的 migration（`npx supabase db push`）。
  - **方式 B**：本機執行 `npx supabase link --project-ref 你的REF` 後執行 `npx supabase db push`。
- [ ] 表名為 **`pricing_sync`**，欄位含：`device_id`, `games`, `current_game_id`, `named_profiles`, `updated_at`。
- [ ] **RLS** 已啟用，且有一條 policy 允許 **anon** 角色 **select, insert, update, delete**（例如 "Allow anon read and write"）。

---

## 2. GitHub Pages 環境變數（決定線上版能否連 Supabase）

- [ ] 到 Repo **Settings** → **Secrets and variables** → **Actions**。
- [ ] 已新增 **Repository secret**：
  - **Name**: `VITE_SUPABASE_URL`，**Value**: 你的 Supabase Project URL（例如 `https://xxxx.supabase.co`）。
  - **Name**: `VITE_SUPABASE_ANON_KEY`，**Value**: 你的 Supabase **anon public** key（Dashboard → Project Settings → API）。
- [ ] 儲存後，**重新跑一次 Actions**（Deploy to GitHub Pages）或 push 一次，讓新建置帶入這兩個變數。

若沒設這兩個 Secrets，線上版不會出現「跨裝置同步」區塊，也無法讀寫資料庫。

---

## 3. 本機開發

- [ ] 專案根目錄有 **`.env`**（不要提交到 Git），內容含：
  - `VITE_SUPABASE_URL=你的URL`
  - `VITE_SUPABASE_ANON_KEY=你的anon key`
- [ ] 執行 `npm run dev` 後，右側應出現「跨裝置同步（同步碼）」區塊。

---

## 4. 如何確認「有開好」

| 項目 | 怎麼確認 |
|------|----------|
| 表與 RLS | Supabase Dashboard → Table Editor → 有 `pricing_sync`，且 anon 可讀寫。 |
| GitHub Secrets | Repo → Settings → Secrets and variables → Actions，存在 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`。 |
| 線上版有帶變數 | 部署完成後打開 GitHub Pages 網址，若有「跨裝置同步」區塊，代表建置有帶入變數。 |
| 本機 | 有 `.env` 且跑 `npm run dev` 時能看到「跨裝置同步」。 |

---

## 5. 若線上版仍讀不到資料

- 確認上述 **2** 的兩個 Secrets 已設，且 **最近一次部署** 是在設好之後。
- 用同一組 **同步碼** 或同一裝置，資料才會對應到同一筆 `device_id`。
- 開啟瀏覽器開發者工具 → Console，若有 `[Supabase] 寫入失敗` 或 `雲端同步失敗`，依錯誤訊息檢查 Supabase 專案設定或 RLS。
