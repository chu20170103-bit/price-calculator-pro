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

之後在 app 裡的新增/修改（遊戲、歷史、方案紀錄）會自動在約 1.5 秒後寫入 Supabase；重新開網頁時會先從 Supabase 載入該裝置的資料。

## 注意

- 目前以 **裝置 ID**（存在瀏覽器 localStorage）區分不同裝置的資料，未登入帳號。
- 若之後要改為「依使用者登入」儲存，可啟用 Supabase Auth 並在 `pricing_sync` 表改用 `user_id` 取代 `device_id`。
