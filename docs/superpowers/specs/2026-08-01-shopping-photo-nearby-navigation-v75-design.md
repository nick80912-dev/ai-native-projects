# 採買照片附件與鄰近導航設計

> 日期：2026-08-01
> 狀態：Bar 已核准，進入 v75 實作
> 目標版本：SW／App v75

## 1. 目標

本批只交付兩項旅途中直接可用的改善：

1. 每筆採買項目最多夾帶一張照片，供到店時核對商品。
2. 行程導航依資料精確度決定目的地：已解析的明確地點直接導航；一般名稱在點擊時使用裝置目前位置，讓 Google Maps 優先解析附近同名地點。

本批不加入出發時間風險提示，也不在導航按鈕旁顯示「精確地點／附近搜尋」等分類文字。

## 2. 採買照片附件

### 2.1 使用者流程

- 新增或編輯採買項目時，可由 `accept="image/*"` 的檔案輸入選取手機相簿照片；行動瀏覽器可自行提供拍照選項。
- 每個項目最多一張照片。再次選取即替換；可在編輯表單移除。
- 清單卡片不顯示縮圖或文字，只在標題旁顯示一個迴紋針 SVG；圖示以 `role="img"` 與 `aria-label="有照片附件"` 保留可存取名稱。
- 詳情頁有「查看照片」動作。照片以全畫面 overlay 顯示，不在卡片或詳情頁產生縮圖。
- 照片只存在選取照片的裝置，不上傳、不跨裝置同步、不寫入 Google Sheet／Ledger。

### 2.2 儲存模型

- 新增獨立 `shopping-photo-store.js`，以 IndexedDB database `trip-local-media`、object store `shopping-photos` 保存壓縮後 Blob。
- Shopping Item 只保存可選字串 `photoId`；沒有附件時為空字串。
- 圖片最長邊縮至 1600px，輸出 JPEG quality 0.82；原圖已是可接受 JPEG 且尺寸／容量較小時仍經統一解碼與輸出，避免 EXIF 與超大畫布差異滲入資料層。
- 檔案必須是 `image/*`，輸入上限 25 MiB；解碼、壓縮或 IndexedDB 寫入失敗時，既有採買文字資料與舊照片引用保持不變。
- IndexedDB 不可用時，App 其他功能照常運作，只拒絕新增照片並顯示錯誤。

### 2.3 引用生命週期

- 選取新照片先寫入 IndexedDB，再將新 `photoId` 放入表單草稿；取消表單會清除尚未被任何項目引用的新 Blob。
- 儲存成功後，若舊 `photoId` 已不被任何項目引用才刪除舊 Blob。
- 刪除單筆或批次刪除後，逐一檢查被移除項目的 `photoId`，只有最後一個引用消失才刪除 Blob。
- 部分購買拆分出的已買與剩餘項目共用相同 `photoId`。任何一筆仍存在時，照片不得刪除。
- 安全回併只有在同群組項目的 `photoId` 相同時才成立，避免把不同附件靜默合併。
- 清理失敗只記錄診斷，不回滾已成功的採買文字操作。

### 2.4 備份與還原

- `personalStateJson()` 匯出的 `shoppingItems` 一律剝除 `photoId`；照片 Blob 也不進 JSON。
- 還原 v1–v8 時，即使輸入 JSON 人工夾帶 `photoId`，驗證後仍剝除，避免在另一台裝置建立無效引用。
- 因 v75 備份格式沒有新增欄位，`PERSONAL_STATE_VERSION` 維持 8，支援版本清單不變。
- 資料與版本頁的說明需明確寫出「照片附件僅保存在本裝置，不包含於備份」。

## 3. 鄰近導航

### 3.1 判斷

- `resolveRef(it)` 能解析為 Places 或 Restaurants 的項目視為明確地點，沿用單一導航按鈕直接開啟 Google Maps directions URL。
- 無法解析 reference、只有行程 `place`／`act` 一般名稱的項目視為一般名稱。
- 不新增 schema 欄位、Place ID、Google API key 或後端服務。

### 3.2 一般名稱流程

1. 點擊現有導航按鈕。
2. 以 `navigator.geolocation.getCurrentPosition()` 取得目前座標；只在使用者點擊時執行，不背景追蹤。
3. 成功時在 directions URL 明確帶入 `origin=<lat>,<lng>`，目的地使用一般名稱；Google Maps 依起點與名稱解析附近結果。
4. 權限拒絕、逾時、定位 API 不存在或視窗開啟失敗時，退回既有 `名稱＋日本` directions URL。

定位選項固定為 `enableHighAccuracy:false`、`timeout:6000`、`maximumAge:300000`，避免為一次導航長時間啟動高精度 GPS。

### 3.3 導航限制

純 Maps URL 無法像 Places API／Place ID 一樣保證唯一目的地；本批以「明確資料直接導航、一般名稱帶目前起點」降低跨國與遠距同名誤判，但不宣稱能自動鎖定唯一分店。介面不增加類型標籤。

## 4. PWA 與版本

- 新增的 `shopping-photo-store.js` 必須加入 SW SHELL，確保離線啟動時附件程式存在。
- `sw.js` 與 `app-version.js` 同步升至 v75；除此以外不改 install／activate／fetch 策略。
- `netlify.toml` 必須保持 diff 0。
- 回滾採向前發布更高版本，不刪除 Service Worker、不清除 IndexedDB 使用者照片。

## 5. 驗收

- Node 測試涵蓋 photoId 正規化、拆分／回併、最後引用清理規劃、備份與還原排除，以及導航 URL 的明確／一般／fallback 分支。
- Playwright 在實際 Chromium IndexedDB 驗證：選檔、卡片只顯示無文字迴紋針、詳情全畫面查看、替換、移除、重載持久化、備份不含 photoId、刪除最後引用清 Blob。
- Playwright mock geolocation 驗證一般名稱帶目前座標；權限拒絕走日本 fallback；明確 reference 不請求定位。
- 320×700、375×812、390×844 無水平 overflow；console error 與 pageerror 都為 0。
- v74→v75 CacheStorage 只剩 `okayama-trip-v75`，換代後離線重新啟動正常。

