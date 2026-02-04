# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## GitHub Pages 部署（網頁要能開）

**完成後網址：** **https://chu20170103-bit.github.io/price-calculator-pro/**

### 第一步：確認有 push 到 GitHub（含 .github）

```bash
git add .
git status   # 確認有 .github/workflows/deploy-gh-pages.yml
git commit -m "Add GitHub Pages deploy"
git push origin main
```

若遠端預設分支是 `master`，就改成 `git push origin master`。**一定要有 `.github/workflows/` 資料夾**，否則不會自動建站。

### 第二步：在 GitHub 開啟 Pages（只需做一次）

1. 打開：**[Settings → Pages](https://github.com/chu20170103-bit/price-calculator-pro/settings/pages)**
2. **Build and deployment** 底下 **Source** 選 **「Deploy from a branch」**
3. **Branch** 選 **「gh-pages」**，資料夾選 **「/ (root)"**，按 Save

（第一次 push 後，Actions 會自動建出 `gh-pages` 分支，若當下沒有這個選項，先完成第三步再回來選。）

### 第三步：等 Actions 跑完

1. 到 **[Actions](https://github.com/chu20170103-bit/price-calculator-pro/actions)**
2. 點最新的「Deploy to GitHub Pages」workflow，確認是綠色打勾
3. 若有紅色失敗，點進去看是哪一步錯（常見：`npm ci` 失敗代表缺 `package-lock.json`，請在本機執行 `npm install` 後把 `package-lock.json` 一併 commit 推送）

### 第四步：開網頁

等 1～2 分鐘後打開：**https://chu20170103-bit.github.io/price-calculator-pro/**

---

### 還是看不到時請檢查

| 狀況 | 做法 |
|------|------|
| 開網址是 404 | 確認 Settings → Pages 的 Branch 已選 **gh-pages** |
| Actions 是紅色 | 點進該次 run 看錯誤；缺 lock 檔就執行 `npm install` 並 push `package-lock.json` |
| 網頁空白或錯版 | 等 2～5 分鐘再重新整理，或再 push 一次觸發重新部署 |
| 不確定有沒有 .github | 在 GitHub 倉庫看根目錄有沒有 `.github/workflows/deploy-gh-pages.yml`，沒有就從本機再 push 一次 |

## 疑難排解：MIME type "application/octet-stream" 錯誤

若出現「Expected a JavaScript module script but the server responded with a MIME type of application/octet-stream」：

- **本機開發**：請用 `bun run dev` 或 `npm run dev` 啟動 Vite，不要用 `file://` 開 index.html，也不要對專案根目錄開靜態檔案伺服器（否則會把 .tsx 當成二進位檔送出）。
- **部署**：需讓主機對 `.js` / `.mjs` 回傳 `Content-Type: application/javascript`。已提供 `netlify.toml` 給 Netlify；若用其他主機（如 S3、自建 nginx），請在伺服器設定中為 JS 檔加上正確 MIME type。

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
