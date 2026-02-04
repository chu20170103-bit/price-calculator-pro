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

## GitHub Pages 部署（靜態網頁，直接就能用）

**網址：** **https://chu20170103-bit.github.io/price-calculator-pro/**

不用 Netlify、不用 Actions，建好靜態檔推到 GitHub 即可。

### 1. 建置靜態檔到 docs/

```bash
npm run build:gh
```

會把建置結果放到 **docs/** 資料夾（已含正確路徑給 GitHub Pages）。

### 2. 推送到 GitHub

```bash
git add docs
git commit -m "Update GitHub Pages"
git push origin main
```

### 3. 在 GitHub 開啟 Pages（只需做一次）

1. 打開 [Settings → Pages](https://github.com/chu20170103-bit/price-calculator-pro/settings/pages)
2. **Source** 選 **Deploy from a branch**
3. **Branch** 選 **main**，資料夾選 **/docs**，按 Save

幾分鐘後開：**https://chu20170103-bit.github.io/price-calculator-pro/**

---

之後要更新網站：改完程式 → `npm run build:gh` → `git add docs` → `git commit` → `git push`。

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
