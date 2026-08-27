# grab-a-seat

Prisvalis（算力有限公司）網域停放頁與官網聯絡表單，以 [Cloudflare Workers](https://developers.cloudflare.com/workers/) 部署 —— 整站邏輯全部由 [src/index.js](src/index.js) 這支 Worker 處理，沒有靜態檔案。

## 運作邏輯

`src/index.js` 依請求的 hostname / path 分三種情況處理：

1. `path === /api/contact`，或 host 是 `*.workers.dev` / `*.pages.dev`（預覽網址）→ 交給聯絡表單 handler，寄信到 `support@mail.prisvalis.com`
2. host 是 `ASSIGNED_HOSTS`（已設定好內容的正式網域）→ 直接放行給上游
3. 其他情況（尚未設定內容的網域）→ 顯示品牌化的「Hosted by Prisvalis」停放頁

## 本機開發

```bash
npm install
npm run dev
```

會啟動 `wrangler dev`，在本機模擬 Worker 執行環境。

## 部署到 Cloudflare Workers

### 方式一：CLI 部署

```bash
npm install
npm run deploy
```

### 方式二：Git 整合（Workers Builds）

在 Cloudflare Dashboard 的 **Workers & Pages** 建立專案時選擇 **Workers**（不是 Pages）並連接此 GitHub repo。Workers Builds 預設會執行：

| 步驟 | 指令 |
| --- | --- |
| Build command | （留空，不需要 build） |
| Deploy command | `npx wrangler deploy`（預設值，不用改） |

Wrangler 會讀取 [wrangler.toml](wrangler.toml) 的 `main`、`compatibility_date` 與 `send_email` binding 自動套用，不用在 Dashboard 手動設定 binding。

> 若專案已經被建成 **Pages** 類型，deploy 時會出現 `wrangler deploy` 對 Pages 專案跑不起來的錯誤（找不到 entry-point）。這種情況要嘛在 Dashboard 刪掉重建成 Workers 專案，要嘛把 Deploy command 改成 `npx wrangler deploy`（Workers 專案的預設值本來就是這個，正常不需要改）。

### 必要設定：EMAIL binding

聯絡表單使用 `env.EMAIL.send(...)`（Cloudflare Email Service 的 `send_email` binding）。部署前需要：

1. 在 Cloudflare 帳號內完成寄件網域 `mail.prisvalis.com` 的 Email Service 驗證
2. 驗證收件位址 `support@mail.prisvalis.com`（Email Routing）
3. 確認 Worker 有套用 [wrangler.toml](wrangler.toml) 中的 `[[send_email]]` binding（Workers Builds 會自動讀取；CLI 部署或 Dashboard 手動建立時，也可在 **Settings → Bindings** 手動新增同名 binding）

### 網域設定

- 在 Worker 的 **Settings → Domains & Routes → Custom Domains** 內掛上所有要代管的網域（含 `prisvalis.com`、`www.prisvalis.com` 及任何尚未上線的客戶網域）
- 已正式上線、要直接放行給上游內容的網域，需加進 [src/index.js](src/index.js) 的 `ASSIGNED_HOSTS`
- 未加入 `ASSIGNED_HOSTS` 的網域一律顯示停放頁
