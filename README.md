# grab-a-seat

Prisvalis（算力有限公司）網域停放頁與官網聯絡表單，以 [Cloudflare Pages Advanced Mode](https://developers.cloudflare.com/pages/functions/advanced-mode/) 部署 —— 整站邏輯全部由 [public/_worker.js](public/_worker.js) 這支 Worker 處理，沒有其他靜態檔案。

## 運作邏輯

`public/_worker.js` 依請求的 hostname / path 分三種情況處理：

1. `path === /api/contact`，或 host 是 `*.workers.dev` / `*.pages.dev`（預覽網址）→ 交給聯絡表單 handler，寄信到 `support@mail.prisvalis.com`
2. host 是 `ASSIGNED_HOSTS`（已設定好內容的正式網域）→ 直接放行給上游
3. 其他情況（尚未設定內容的網域）→ 顯示品牌化的「Hosted by Prisvalis」停放頁

## 本機開發

```bash
npm install
npm run dev
```

會啟動 `wrangler pages dev public`，在本機模擬 Pages 執行環境。

## 部署到 Cloudflare Pages

### 方式一：CLI 部署

```bash
npm install
npm run deploy
```

### 方式二：Git 整合（在 Cloudflare Dashboard 建立 Pages 專案）

連接此 GitHub repo 時填入：

| 設定 | 值 |
| --- | --- |
| Build command | （留空，不需要 build） |
| Build output directory | `public` |

首次建立專案後，Cloudflare 會讀取 [wrangler.toml](wrangler.toml) 套用 `compatibility_date` 與 `send_email` binding；也可以改在 Dashboard 的 **Settings → Functions → Bindings** 手動設定。

### 必要設定：EMAIL binding

聯絡表單使用 `env.EMAIL.send(...)`（Cloudflare Email Service 的 `send_email` binding）。部署前需要：

1. 在 Cloudflare 帳號內完成寄件網域 `mail.prisvalis.com` 的 Email Service 驗證
2. 驗證收件位址 `support@mail.prisvalis.com`（Email Routing）
3. 確認 Pages 專案有套用 [wrangler.toml](wrangler.toml) 中的 `[[send_email]]` binding（或於 Dashboard 手動新增同名 binding）

### 網域設定

- 在 Pages 專案的 **Custom domains** 內掛上所有要代管的網域（含 `prisvalis.com`、`www.prisvalis.com` 及任何尚未上線的客戶網域）
- 已正式上線、要直接放行給上游內容的網域，需加進 [public/_worker.js](public/_worker.js) 的 `ASSIGNED_HOSTS`
- 未加入 `ASSIGNED_HOSTS` 的網域一律顯示停放頁
