# Ledger Sync Apps Script

`ledger-sync.gs` 是 Apps Script 部署程式的唯一維護來源。Google Apps Script 編輯器內的部署副本必須完整複製此檔；不要只在雲端編輯而不回存 Git。

## 固定資源與權限邊界

- Web App URL：`https://script.google.com/macros/s/AKfycbwtC9G5GYZYmvZU2sl81Q2YDYDoeNf-FaZgeZa2GptfQ0znKA-h9Du1GuoSv0waeuSPhA/exec`
- 執行身分：部署擁有者。
- 存取權：沿用目前已核准的 Web App 存取設定；改版時不得自行縮放或擴張。
- `分帳紀錄`：App 只做 append-only 寫入；重複 `id` 回 `{ok:true,dup:true}`。
- `TripConfig`：App 只能更新或建立 `Exchange Rate` 與 `Ledger Default Currency`。其餘鍵維持 Bar 手動管理、App 唯讀。

兩個設定鍵的精確初始格式為：

```csv
Exchange Rate,0.2
Ledger Default Currency,JPY
```

`Currency` 是旅程顯示幣別，不得改作分帳預設幣別。

## POST 契約

分帳寫入共 21 欄，固定順序為：

```text
id, time, member, category, detail, amountJpy, amountTwd, note,
participants, payMethod, recordType, targetRecordId, deleteReason, batchId,
storeName, replacesRecordId, inputCurrency, isTaxFree, priceMode, taxRate,
couponAmount
```

除 `id`、`member`、`amountJpy` 外其餘欄位依 Schema 為選填；舊 payload 未提供末端欄位時，Apps Script 會寫入空字串。`participants` 必須是 JSON Array 字串，不得使用逗號字串。`inputCurrency` 只接受 `JPY`／`TWD`、`priceMode` 只接受 `included`／`excluded`、`taxRate` 限 0–100、`couponAmount` 不得小於零。

Ledger 2.8 寫入範例：

```json
{"id":"1784428800000-test","time":"2026-07-19T08:00:00.000Z","member":"Bar","category":"交通","detail":"[TEST] Ledger 2.8 contract","amountJpy":500,"amountTwd":100,"note":"","participants":"[\"Bar\",\"Amy\"]","payMethod":"現金","recordType":"expense","targetRecordId":"","deleteReason":"","batchId":"batch-test-001","storeName":"岡山站","replacesRecordId":"","inputCurrency":"JPY","isTaxFree":true,"priceMode":"included","taxRate":10,"couponAmount":0}
```

成功回應為 `{"ok":true}`；同一個 ID 再送一次為 `{"ok":true,"dup":true}`。

共用設定更新：

```json
{"action":"updateSettings","exchangeRate":0.2,"defaultCurrency":"JPY"}
```

成功回應為：

```json
{"ok":true,"settings":{"exchangeRate":0.2,"defaultCurrency":"JPY"}}
```

匯率必須為大於零的有限數字；幣別只接受 `JPY` 或 `TWD`。設定寫入不進離線佇列。

## GET 契約（ledger 唯讀加速層）

讀取路徑仍以 Google Sheets 發布 CSV 為主；伺服器端快取約 1–5 分鐘，提高 client CSV 輪詢頻率無法改善此延遲。`doGet` 是**加速層而非取代層**：只服務「分帳紀錄」單表，其餘 7 張表維持既有 CSV 原子快照節奏。

```text
GET {WEB_APP_URL}?action=ledger&after=<N>
```

成功回應：

```json
{"ok":true,"serverTime":"2026-07-25T00:00:00.000Z","total":123,"after":120,"reset":false,"rows":[["…21 欄…"]]}
```

失敗回應為 `{"ok":false,"error":"…"}`；client 一律靜默降級回 CSV 路徑。

- `after` 為 client 上次已讀到的資料列數，回傳第 `after + 1` 筆起至目前 `total`。缺省、空字串、非數字或負數正規化為 `0`，小數向下取整。
- `total` 定義為 `Math.max(sheet.getLastRow() - 1, 0)`。
- `after >= total` 為常態心跳：回 `rows: []`、`reset: false`，且**不呼叫 `getValues()`**，以壓低單次執行時間、保護每日執行配額。
- `after > total`（例如 Bar 手動刪列造成截斷）回 `reset: true` 與全量 rows，client 據此重置已讀計數；`total === 0` 且 `after > 0` 時 `total`／`after` 皆回 `0`。
- 固定讀取 21 欄，且以 `getRange(after + 2, 1, total - after, 21)` 精確讀取，不整表掃描。
- `action` 必須精確等於 `ledger`；「分帳紀錄」不存在或欄數不足 21 時回 `ok:false`。
- 錯誤訊息不含例外 stack、Sheet 物件或 Spreadsheet ID。
- `serverTime` 僅供時鐘偏移診斷，**不得**用於改寫 Ledger record、canonical ordering、settlement event server timestamp 或 server arrival ordering。
- `doGet` 唯讀且**不取 `LockService`**，避免與 `doPost` 搶鎖或額外消耗配額。`doPost` 既有契約與驗證邏輯完全不動。

## 部署

1. Bar 先在 Google Sheet「分帳紀錄」既有 16 欄末端依序新增：`輸入幣別`、`免稅品`、`價格方式`、`稅率`、`優惠券金額`，不可改序或插入既有欄位中間。
2. 執行 `node tests/apps-script-settings.test.js`，確認本機契約測試通過；Bar 再於 Apps Script 編輯器以 `apps-script/ledger-sync.gs` 完整取代部署程式並儲存。
3. Bar 開啟「部署 → 管理部署 → 編輯」。
4. Bar 建立新版本；執行身分選擇部署擁有者，存取權沿用已核准值。
5. 更新既有部署並維持相同 Web App `/exec` URL。若平台產生新 URL，停止並先回報，不得直接切換前端。

Apps Script 部署完成並通過下列真實驗收後，才可交付使用 Schema 2.8 的前端契約。

### doGet 部署與驗收（2026-07-25 新增）

新版 `doGet` 必須先由 Bar 部署，Claude 才能驗證真實 CORS 與 redirect —— 未部署前不得宣稱新 action 已通過 CORS。

1. 將新版 `apps-script/ledger-sync.gs` 完整貼進 Apps Script 編輯器並儲存。
2. 「部署 → 管理部署作業 → 新版本 → 部署」，保持原 Web App URL 不變。
3. 以無痕模式開啟 `{WEB_APP_URL}?action=ledger&after=0`。
4. 預期得到可解析 JSON，至少包含 `ok:true`、`serverTime`、`total`、`after`、`reset:false` 與 `rows`（空表時 `rows: []`，否則為現有 ledger rows）。
5. 回報部署完成與該回應後，才續行真實 GET、redirect follow、CORS、JSON parse、`after`／`reset`／`serverTime` 與前端 ledger fast pull 整合驗證。

若真實 CORS 或 redirect 驗證失敗，一律停止並回報，不得改用 `no-cors`、自行新增代理或改動既有部署架構。

## 真實驗收

1. POST `updateSettings`，確認回 `{ok:true,settings:...}`。
2. 等待已發布的 TripConfig CSV（已知延遲約 1–5 分鐘），確認精確出現 `Exchange Rate` 與 `Ledger Default Currency` 兩列。
3. 以新 ID POST 一筆含五個 Schema 2.8 新欄位的 `[TEST]` 分帳，確認回 `{ok:true}`。
4. 重送相同 ID，確認回 `{ok:true,dup:true}`。
5. 等待分帳 CSV，確認該 ID 只出現一列，且 `participants` JSON 字串、支付方式、紀錄類型、批次 ID、店名、取代紀錄 ID 與五個新欄位正確落位；既有 16 欄沒有位移。測試資料由 Bar 驗收後手動清除。

## 回滾

在 Apps Script「管理部署」把 Web App 指回上一個已知正常版本，保持同一 `/exec` URL。Schema 2.8 Apps Script 向後相容舊 payload，通常可保留；若仍需回退且前端 Schema 2.8 已發佈，應同時依專案回滾程序回復對應 Netlify 部署並再次 bump Service Worker cache，不可只回退其中一側而留下不相容契約。
