# 靜態網站串接 Supabase 資料庫 — 解決方案報告（可導入其他專案）

本報告為**可攜式範本**，可直接導入到其他「靜態網站 + GitHub Pages + Supabase」專案，並透過同一套腳本自動化部署。

---

## SOP 流程概覽

從 Lovable App 產出到網站上線、多裝置同步，建議依下列四步驟執行：

| 步驟 | 內容 | 說明 |
|------|------|------|
| **1. 下載專案** | 取得原始專案 | 專案多為 Lovable App 設計，內含專案專屬的 Meta 標籤（og:image、twitter:image 等）及相關文字。 |
| **2. 調整內容** | 移除品牌／範本痕跡 | 僅需刪除部分文字與圖案（如 Lovable 預覽圖、預設 meta），其餘程式碼可不更動。 |
| **3. 功能改寫** | 符合 GitHub 與上線需求 | 改寫程式以符合 GitHub 上傳規範，並建置可部署的靜態網頁（GitHub Pages）。 |
| **4. 資料庫整合** | 串接 Supabase | 串接 Supabase 資料庫，實現資料的**讀取、儲存與刪除**。 |

**上線後**：Page 上線後，可在不同瀏覽器與裝置上同步執行儲存、寫入、讀取或刪除；各裝置皆可即時看到最新更新狀況。

---

## 零、命名與自動判斷原則（無其他專案設計）

- **Supabase / 資料庫命名以「當前專案」為主**  
  表名、欄位名、類型與說明一律依**該專案本身**的 migrations、程式碼或專案 prefix 判斷，**不帶入本範例或其他專案的设计**。

- **共同資料庫下的子目錄（表名）**  
  使用 **projectPrefix** 作為子目錄概念：來自 `package.json` 的 `name`、或 git remote 倉庫名、或專案目錄名，轉成 snake_case（例如 `price-calculator-pro` → `price_calculator_pro`）。  
  - 若專案已有 migrations／程式碼：表名與欄位名由**偵測腳本**從現有 SQL 與 `.from()`／`.select()`／`.insert()` 擷取。  
  - 若尚無表：預設表名為 `{projectPrefix}_sync`、`{projectPrefix}_items`，欄位名為通用名稱（如 `device_id`、`data`、`updated_at`）。

- **類型、說明與欄位角色**  
  由腳本從 migrations 的 `create table`（欄位名與型別）與程式碼使用方式推斷：主表（一裝置一筆）、清單表（多筆）、以及各欄位角色（device_id、payload、current_id、item_id、name、data、created_at 等）。產出的 **supabase-sync.config.json** 僅包含該專案自己的命名與結構，無其他專案內容。

---

## 一、專案目標與成果

**目標**：將靜態網站（Vite + React，部署於 GitHub Pages）與 Supabase 雲端資料庫串接，實現資料的**讀取、寫入、刪除**，並可多裝置同步。

**成果**：
- 靜態前端直接呼叫 Supabase Client API，無需自建後端。
- 主資料與清單類資料可與雲端同步；清單項目採**單筆儲存／單筆刪除**，刪除一筆不影響其他筆。
- 部署流程：本機執行 `npm run deploy` 或 `npm run setup:deploy`，無需 GitHub Actions。

---

## 二、技術架構概覽

```
┌─────────────────────────────────────────────────────────────────┐
│  靜態網站 (Vite + React)                                         │
│  部署：GitHub Pages (gh-pages 分支)                              │
│  網址：https://<使用者>.github.io/<倉庫名>/                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS (Browser)
                            │ VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Supabase 專案                                                   │
│  • 資料庫 (PostgreSQL)                                           │
│  • 表：依專案需求（本範例為 pricing_sync、pricing_profiles）      │
│  • 匿名 (anon) 讀寫，RLS 政策依需求設定                            │
└─────────────────────────────────────────────────────────────────┘
```

- **前端**：React + Vite，使用 `@supabase/supabase-js` 在瀏覽器直接連 Supabase。
- **認證**：本範例使用 **anon key**，以 `device_id`（同步碼或預設值）區分裝置，不需登入。
- **部署**：本機建置時讀取 `.env` 的 Supabase 變數，打包後以 `gh-pages` 套件推送到 `gh-pages` 分支。

---

## 三、資料庫設計（範例）

本範例使用兩張表，可依你的專案改為自己的 schema。

### 3.1 表一：`pricing_sync`

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | uuid | 主鍵 |
| device_id | text (unique) | 裝置／同步碼 |
| games | jsonb | 主資料（如遊戲列表） |
| current_game_id | text | 當前選項 ID |
| updated_at | timestamptz | 最後更新時間 |

### 3.2 表二：`pricing_profiles`

| 欄位 | 類型 | 說明 |
|------|------|------|
| id | uuid | 主鍵 |
| device_id | text | 與主表對應 |
| profile_id | text | 單筆唯一 ID |
| name | text | 名稱 |
| rows | jsonb | 內容 |
| created_at | timestamptz | 建立時間 |

**約束**：`(device_id, profile_id)` 唯一。用途：清單**一筆一筆**存／刪。

### 3.3 Migration

- `supabase/migrations/20250204100000_create_pricing_sync.sql`
- `supabase/migrations/20250204110000_create_pricing_profiles.sql`

套用：`npx supabase link --project-ref <REF>` 後執行 `npm run db:push`，或於 Supabase Dashboard SQL Editor 手動執行。

---

## 四、資料流：讀取、寫入、刪除

- **讀取**：初次載入依 `device_id` 查詢主表 + 清單表，寫入本機 state；設 `initialLoadDone` 後才允許寫入，避免空資料覆蓋雲端。切回分頁可 refetch，寫入後短時間內可略過避免被舊資料蓋回。
- **寫入**：主資料以 debounce 寫入主表；清單**新增**時對清單表單筆 **INSERT**。
- **刪除**：清單**單筆刪除**時對清單表 **DELETE WHERE device_id AND profile_id**；「清空雲端」則刪除該 device 在主表與清單表的所有筆。

---

## 五、自動化流程（三重點）

1. **自動判斷要擷取的資料庫內容**  
   - 執行 `npm run supabase:detect`（或一鍵 `npm run supabase:auto-setup`）時，腳本會：  
     - 從 **package.json / git remote / 目錄名** 取得專案名並轉成 **projectPrefix**（共同 DB 子目錄用）。  
     - 掃描 **supabase/migrations/*.sql** 的 `create table`，擷取表名與欄位名、型別。  
     - 掃描 **src/** 的 `.from('...')`、`.select('...')`、`.insert({...})`，擷取實際使用的表與欄位。  
     - 依欄位組合判斷**主表**（一裝置一筆）與**清單表**（多筆），並推斷各欄位角色（device_id、payload、current_id、item_id、name、data、created_at 等）。  
   - 產出 **supabase-sync.config.json**，內容僅為該專案的表名、欄位名、env 變數名，無其他專案設計。

2. **自動建立、串聯與執行**  
   - **建立**：依 config 產生 `src/lib/supabase-sync-config.ts`（前端讀取）、以及可選的 `supabase/migrations/*.sql`。  
   - **串聯**：前端 hook（`useSupabaseSync`）與檢查腳本（`check-supabase.mjs`）皆依 config 運作，無寫死表名。  
   - **執行**：一鍵 `npm run supabase:auto-setup` 依序執行：偵測 → 產生前端 config → 可選產生 migrations → 可選 `db:push`。  
   - 選項：`SKIP_MIGRATIONS=1` 不產生 migrations；`SKIP_DB_PUSH=1` 不執行 db push。

3. **錯誤處理（Error handling）**  
   - **detect**：若無法取得專案名則使用 `app` 作為 prefix；若解析 JSON 失敗則拋錯並 exit(1)。  
   - **generate-config**：若缺少 `supabase-sync.config.json` 或必填欄位（mainTable.name、listTable.name、env.urlKey、env.anonKey）則輸出錯誤訊息並 exit(1)。  
   - **generate-migrations**：同上驗證 config；若 `supabase/migrations` 不存在則自動建立目錄；寫檔失敗時拋錯並 exit(1)。  
   - **supabase:auto-setup**：每一步以 exit code 檢查，任一步失敗即中止並印出明確錯誤；db push 失敗時僅警告（因可能尚未 link），並提示手動執行。

---

## 六、導入到其他專案（自動化部署，依現有專案命名改寫）

本解決方案以 **supabase-sync.config.json** 為單一來源：表名、欄位名、env 變數名皆由此設定。導入到**其他專案**時，會**自動偵測該專案現有的前端／資料庫命名**，並改寫 config，因此**不會覆寫該專案的 schema 或狀態**，只會把範例適配到該專案。

### 6.1 前置條件

- 專案為 **Vite + React**（或可建出靜態 `dist/` 的專案）。
- 已安裝 **Node.js**，並有 **npm**。
- 程式碼在 **Git** 倉庫，且 **remote origin** 為 GitHub。
- **Supabase** 已建立專案，並取得 Project URL 與 anon key。

### 6.2 要複製到新專案的檔案與資料夾

從本範例專案複製以下內容到新專案**相同相對路徑**（專案根目錄為 `.`）：

| 複製來源 | 說明 |
|----------|------|
| `supabase-sync.config.json` | 表名／欄位名／env 名設定（導入後會被 detect 改寫） |
| `scripts/deploy-static.mjs` | 本機建置 + 推送 gh-pages |
| `scripts/setup-and-deploy.mjs` | 一鍵檢查環境 + 可選 db push + 部署 |
| `scripts/check-supabase.mjs` | 檢查 Supabase 連線與 anon 讀寫 |
| `scripts/detect-supabase-naming.mjs` | **偵測現有專案表名與 env，改寫 config** |
| `scripts/generate-supabase-sync-config.mjs` | 依 config 產生前端用 `src/lib/supabase-sync-config.ts` |
| `scripts/generate-migrations-from-config.mjs` | 依 config 產生 migrations（可選） |
| `supabase/` | 整個資料夾（可選；若新專案已有 schema 可不覆蓋） |
| `docs/靜態網站串接Supabase解決方案報告.md` | 本報告 |
| `src/hooks/useSupabaseSync.ts` | 同步邏輯（會讀取 `src/lib/supabase-sync-config.ts`） |
| `scripts/supabase-auto-setup.mjs` | **一鍵自動化**：偵測 → 產生 config → 可選 migrations → 可選 db push，含錯誤處理 |

**重要**：前端同步邏輯依賴 `src/lib/supabase-sync-config.ts`，該檔由 `npm run supabase:generate-config` 從 `supabase-sync.config.json` 產生，故**表名與欄位名由 config 決定**，不寫死在程式裡。

### 6.3 導入後：一鍵自動判斷並建立（推薦）

**推薦**：在新專案根目錄執行一鍵自動化（會依序：偵測 → 產生前端 config → 可選 migrations → 可選 db push，任一步失敗即中止並印出錯誤）：

```bash
npm run supabase:auto-setup
```

若不要產生 migrations 或不要執行 db push，可設環境變數：

```bash
SKIP_MIGRATIONS=1 SKIP_DB_PUSH=1 npm run supabase:auto-setup
```

**或**手動依序執行：

1. **偵測並改寫 config**（依該專案既有 migrations 與 src）  
   ```bash
   npm run supabase:detect
   ```  
   會寫入 `supabase-sync.config.json`，含 **projectPrefix**、主表／清單表名與欄位名、env 變數名，皆來自該專案。

2. **產生前端用 config**  
   ```bash
   npm run supabase:generate-config
   ```  
   會從 config 產生 `src/lib/supabase-sync-config.ts`。

3. **（可選）依 config 產生 migrations**  
   ```bash
   npm run supabase:generate-migrations
   ```  
   再執行 `npm run db:push` 套用。

完成後，同步邏輯會使用**該專案的表名與欄位名**，不會影響該專案既有資料庫狀態；若該專案已有自己的表，只要 config 與實際 schema 一致即可。

### 6.4 在 package.json 加入 scripts

在新專案的 `package.json` 的 `"scripts"` 中加入：

```json
"deploy": "node scripts/deploy-static.mjs",
"setup:deploy": "node scripts/setup-and-deploy.mjs",
"db:push": "supabase db push",
"db:link": "supabase link",
"supabase:check": "node scripts/check-supabase.mjs",
"supabase:detect": "node scripts/detect-supabase-naming.mjs",
"supabase:generate-config": "node scripts/generate-supabase-sync-config.mjs",
"supabase:generate-migrations": "node scripts/generate-migrations-from-config.mjs",
"supabase:auto-setup": "node scripts/supabase-auto-setup.mjs"
```

並安裝部署用套件（若尚未安裝）：

```bash
npm install gh-pages --save-dev
```

Supabase CLI 用於 `db:push`，可選：

```bash
npm install supabase --save-dev
```

### 6.5 環境變數

在專案**根目錄**建立 `.env`（勿提交到 Git）：

```env
VITE_SUPABASE_URL=https://你的專案REF.supabase.co
VITE_SUPABASE_ANON_KEY=你的_anon_public_key
```

可複製 `.env.example` 並改名為 `.env` 後填入。建置時 Vite 會將這兩個變數打包進前端。

### 6.6 一次性設定（Supabase 資料表）

- **方式 A**：在新專案根目錄執行  
  `npx supabase link --project-ref 你的專案REF`  
  再執行  
  `npm run db:push`  
  會套用 `supabase/migrations/` 內的 SQL。
- **方式 B**：在 Supabase Dashboard → SQL Editor 手動執行 migration 檔案內容。

### 6.7 日常部署（自動化）

在專案根目錄執行任一即可完成部署：

```bash
npm run deploy
```

或使用一鍵腳本（會先檢查 .env、可選執行 db push，再建置並推送）：

```bash
npm run setup:deploy
```

- 若不要自動跑 `db:push`，可設環境變數：  
  `SKIP_DB_PUSH=1 npm run setup:deploy`  
  或只做部署：  
  `DEPLOY_ONLY=1 npm run setup:deploy`

部署完成後，網站網址為：  
`https://<你的 GitHub 使用者名>.github.io/<倉庫名>/`

請在 GitHub Repo Settings → Pages 中將來源設為 **gh-pages 分支、根目錄**。

---

## 七、設定步驟摘要（檢查清單）

1. [ ] Supabase 專案已建立，已取得 Project URL 與 anon key  
2. [ ] 專案根目錄已建立 `.env`，並設定 config 中 `env.urlKey` / `env.anonKey`（預設為 `VITE_SUPABASE_URL`、`VITE_SUPABASE_ANON_KEY`）  
3. [ ] 已複製本範例的 `supabase-sync.config.json`、`scripts/*.mjs`、`src/hooks/useSupabaseSync.ts` 與本報告  
4. [ ] **已在新專案執行 `npm run supabase:auto-setup`**（或依序 `supabase:detect` → `supabase:generate-config`），使 config 與前端 config 依該專案判斷  
5. [ ] `package.json` 已加入 `deploy`、`setup:deploy`、`supabase:detect`、`supabase:generate-config`、`supabase:generate-migrations`、`supabase:auto-setup`、`db:push`、`db:link`、`supabase:check`  
6. [ ] 已安裝 `gh-pages`（與依需要 `supabase`）  
7. [ ] 資料表已套用（`npm run db:push` 或於 Dashboard 執行 SQL；若用產生器則先 `supabase:generate-migrations`）  
8. [ ] 執行 `npm run supabase:check` 確認連線與讀寫正常  
9. [ ] 執行 `npm run deploy` 或 `npm run setup:deploy` 完成部署  
10. [ ] GitHub Pages 來源已設為 gh-pages 分支  

---

## 八、過程中的關鍵決策與問題排除

| 項目 | 說明 |
|------|------|
| 清單單筆存刪 | 清單改為獨立表，每筆一列，新增用 INSERT、刪除用 DELETE，避免整份覆寫導致誤刪。 |
| 初次載入不寫入 | 雲端讀取完成前不寫入，避免本機空資料覆蓋雲端。 |
| 切回分頁 refetch | 寫入後短時間內略過 refetch，避免刪除後被舊快取蓋回。 |
| 建置用 @vitejs/plugin-react | 避免 @swc 原生 binding 在 Linux/CI 失敗。 |
| 本機部署、不用 CI | 以 `npm run deploy` / `npm run setup:deploy` 在本機建置並推送，流程單純。 |
| Vite 504 (Outdated Optimize Dep) | 刪除 `node_modules/.vite` 後重新 `npm run dev`。 |

---

## 九、維護與後續

- **更新網站**：改完程式後執行 `npm run deploy` 或 `npm run setup:deploy`。
- **資料庫變更**：在 `supabase/migrations/` 新增 SQL，再執行 `npm run db:push` 或於 Dashboard 執行。
- **安全性**：目前範例為 anon 讀寫；可改為 Supabase Auth + RLS 依 `auth.uid()` 限制存取。

---

## 十、本範例專案相關檔案一覽

| 路徑 | 說明 |
|------|------|
| `supabase-sync.config.json` | **單一來源**：projectPrefix、主表／清單表名與欄位名、env；由 detect 依當前專案改寫，無其他專案設計 |
| `scripts/supabase-auto-setup.mjs` | 一鍵：偵測 → 產生 config → 可選 migrations → 可選 db push，含錯誤處理 |
| `src/lib/supabase-sync-config.ts` | 由 `supabase:generate-config` 從 config 產生，供前端使用 |
| `src/hooks/useSupabaseSync.ts` | 雲端同步（依 SYNC_CONFIG 讀寫表與欄位） |
| `scripts/detect-supabase-naming.mjs` | 偵測現有專案表名與 env，改寫 supabase-sync.config.json |
| `scripts/generate-supabase-sync-config.mjs` | 依 config 產生 src/lib/supabase-sync-config.ts |
| `scripts/generate-migrations-from-config.mjs` | 依 config 產生 migrations SQL |
| `scripts/deploy-static.mjs` | 本機建置並推送 gh-pages |
| `scripts/setup-and-deploy.mjs` | 一鍵檢查 + 可選 db push + 部署 |
| `scripts/check-supabase.mjs` | Supabase 連線與讀寫檢查 |
| `supabase/migrations/*.sql` | 資料表與 RLS 定義（可選由 generate-migrations 依 config 產生） |
| `supabase/SUPABASE_SETUP.md` | 詳細設定說明 |

---

*本報告可直接導入到其他靜態網站專案；導入後執行 supabase:detect 會依該專案現有前端／資料庫命名改寫 config，再產生前端 config，不影響該專案既有狀態。*
