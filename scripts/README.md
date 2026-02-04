# GitHub 帳號切換（支援多帳號）

## 用瀏覽器登入（推薦）

安裝 **GitHub CLI** 後，登入會**自動打開瀏覽器**，不用在終端機打帳密：

```bash
# 1. 安裝（Mac 需先有 Homebrew：https://brew.sh）
brew install gh

# 2. 登入（會跳出瀏覽器，選要用的帳號授權）
gh auth login

# 3. 讓 Git 使用 gh 的登入狀態
gh auth setup-git
```

之後在**本機終端機**執行 `git push` 就會用你剛登入的帳號。  
要**換帳號**：再執行一次 `gh auth login`，在瀏覽器選另一個帳號即可。

---

## 方法一：一鍵清除（會再問登入）— 適合多帳號

```bash
# 在專案根目錄執行
bash scripts/switch-github.sh
```

之後執行 `git push` 時會跳出登入視窗，**選你要用的那一個 GitHub 帳號**登入即可。  
有多個帳號時：每次要換成 A、B、C 哪一個，就先執行此腳本，再 push 時登入那個帳號。  
要再換成別個帳號，再執行一次腳本即可。

---

## 方法二：SSH 多帳號（完全免輸入）

若你有 **chu20170103-bit** 的 SSH 金鑰（或對方幫你在 GitHub 加過你的公鑰），可以設成兩個 remote，推誰就自動用誰：

```bash
# 1. 本專案已有 origin 指到 chu 的倉庫，可再加一個「自己」的 remote（若需要）
# 2. 用 SSH 網址 + 不同 Host，在 ~/.ssh/config 裡指定不同金鑰
#    例如：Host github-chu → IdentityFile ~/.ssh/id_ed25519_chu
# 3. 新增 remote：git remote add chu git@github-chu:chu20170103-bit/price-calculator-pro.git
# 4. 推給 chu 的倉庫：git push chu main  （用 chu 的金鑰，不問登入）
```

需要我幫你寫好 SSH config 範例再跟我說。
