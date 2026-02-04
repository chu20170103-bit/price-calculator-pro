# Supabase 雲端儲存設定

專案已接好 Supabase，設定完成後**歷史紀錄**與**方案紀錄**會自動同步到雲端（依裝置 ID 區分）。

## 1. 建立資料表

1. 打開 [Supabase Dashboard](https://supabase.com/dashboard/project/wlcknwjkixxphamklvog) → **SQL Editor**。
2. 新增查詢，貼上專案裡 **`supabase/schema.sql`** 的內容，按 **Run** 執行。

## 2. 取得 API 金鑰

1. 在 Dashboard 左側選 **Project Settings** → **API**。
2. 複製 **Project URL** 與 **anon public** 的 **key**。

## 3. 設定環境變數

在專案根目錄新增 **`.env`**（不要提交到 Git）：

```env
VITE_SUPABASE_URL=https://wlcknwjkixxphamklvog.supabase.co
VITE_SUPABASE_ANON_KEY=你的_anon_public_key
```

把上面的 URL 與 key 換成你專案的實際值。

## 4. 重新啟動開發伺服器

```bash
npm run dev
```

之後在 app 裡的新增/修改（遊戲、歷史、方案紀錄）會自動在約 2 秒後寫入 Supabase；重新開網頁時會先從 Supabase 載入該裝置的資料。

## 5. 部署時一定要設環境變數（GitHub Pages / Cloudflare / Netlify）

### GitHub Pages（用 GitHub Actions 建置）

1. 到 Repo **Settings** → **Secrets and variables** → **Actions**。
2. 新增兩個 Repository secrets：
   - **Name**: `VITE_SUPABASE_URL`，**Value**: 你的 Supabase Project URL
   - **Name**: `VITE_SUPABASE_ANON_KEY`，**Value**: 你的 anon public key
3. 之後每次 push 到 `main` 觸發建置時，會帶入這兩個變數，**GitHub Pages 上的網頁就能正常寫入／讀取 Supabase**（新增、刪除、修改方案與歷史都會同步到雲端）。

### Cloudflare Pages / Netlify

**Vite 的 `VITE_*` 變數是在「建置時」打進程式碼的**，本機的 `.env` 不會跟著上傳到 Git，所以：

- **Cloudflare Pages**：專案 → **Settings** → **Environment variables**（Production 與 Preview）新增：
  - `VITE_SUPABASE_URL` = 你的 Project URL
  - `VITE_SUPABASE_ANON_KEY` = 你的 anon public key  
  儲存後**重新建置並部署**一次，線上版才會開始寫入 Supabase。
- **Netlify**：Site → **Site configuration** → **Environment variables** 同上，改完後重新 Deploy。

若沒在託管平台設定這兩個變數，線上版就不會連 Supabase，也不會寫入。

## 注意

- 目前以 **裝置 ID**（存在瀏覽器 localStorage）區分不同裝置的資料，未登入帳號。
- 若之後要改為「依使用者登入」儲存，可啟用 Supabase Auth 並在 `pricing_sync` 表改用 `user_id` 取代 `device_id`。
