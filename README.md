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

1. **在 GitHub 開啟 Pages**  
   倉庫 → **Settings** → 左側 **Pages** → **Build and deployment** 的 **Source** 選 **GitHub Actions**（不要選 Deploy from a branch）。

2. **推送程式碼**  
   推送後會自動跑「Deploy to GitHub Pages」workflow；跑完後網址為：  
   `https://<你的帳號>.github.io/<倉庫名>/`  
   例如：`https://myuser.github.io/price-calculator-pro-main/`

3. 若之前選過「Deploy from a branch」或沒選過 Source，請改選 **GitHub Actions** 再等 workflow 跑完。

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
