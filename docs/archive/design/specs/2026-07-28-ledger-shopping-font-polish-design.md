# 新增消費、採買預設單位與全站字體優化設計

## 文件定位

本文件是本批實作的權威設計，涵蓋新增消費表單資訊層級、採買項目預設單位與全站中文字體。

本文件以 Bar 於 2026-07-28 核准的附件為準，並只在以下範圍取代
`2026-07-28-ledger-entry-information-hierarchy-design.md`：

- 群組標題固定為「其他資訊（選填）」。
- 類別、支付方式與日期必須位於同一個選填容器。
- 本批同時納入採買預設 `1 個` 與 `Noto Sans TC`。

既有設計中不衝突的個人／團體 Renderer、鍵盤導引與多品項邊界繼續適用。

## 目標

1. 讓新增消費先處理金額、明細與代購／分攤歸屬，再處理已有預設值的補充資訊。
2. 讓新採買項目與「儲存並新增」穩定以 `1 個` 開始，同時保留舊資料真實性。
3. 讓全站繁體中文優先使用 Google Fonts 的 `Noto Sans TC`，並在載入失敗或離線時自然回退至系統字體。

本批只調整前端 Renderer、CSS、採買表單預設值、設定頁基本單位保護、相關測試與文件。不得修改 Ledger Schema、Apps Script、Google Sheet、Queue／Bridge／Retry、結算、採買與 Ledger 類別映射、Shopping ↔ Ledger append-only 關聯或 Service Worker 策略。

## 核准方案

採用「共用 Renderer 重組」：

- 重新排列現有 Renderer 的組合順序。
- 保留同一份 `ledgerUiState.draft`、Shopping Store、事件處理器與 DOM ID。
- 不以 CSS `order` 偽造順序。
- 不建立個人帳／團體帳平行表單。
- 不新增第二份代購 Toggle 或代購對象 Store。

此方案讓視覺順序、DOM 順序、鍵盤順序與無障礙閱讀順序一致。

## 新增消費表單

### 單筆個人帳順序

保留表單頂端既有的身分、多品項、帳本與幣別控制。其後順序為：

1. 金額。
2. 明細。
3. 代購 Toggle。
4. Toggle 開啟時原地顯示代購對象。
5. 其他資訊（選填）。
6. 稅與優惠券。
7. 更多細節。
8. 儲存操作。

### 單筆團體帳順序

團體帳沒有單筆代購 Toggle，順序為：

1. 金額。
2. 明細。
3. 分攤成員。
4. 其他資訊（選填）。
5. 稅與優惠券。
6. 更多細節。
7. 儲存操作。

分攤成員繼續使用既有正式成員來源、選擇狀態與驗證。

### 多品項邊界

- 個人帳維持逐品項代購，不新增整張帳單共用的代購 Toggle。
- 團體帳維持既有共同分攤與逐品項覆寫。
- 多品項帳單資訊、逐項類別、稅額、折扣與 largest-remainder 分配不變。

### 代購行為

- Toggle 關閉時不輸出代購對象區。
- Toggle 開啟時，代購對象直接接在 Toggle 下方。
- Toggle 與對象沿用既有 `setLedgerProxy()`、`renderLedgerProxySection()` 與共用 Store。
- 重新 Render 只重組同一 draft，不清除金額、明細、日期、類別或支付方式。
- 編輯既有代購紀錄時，沿用既有 draft 還原 `isProxy` 與 `proxyTarget`。
- 個人帳與團體帳切換仍使用既有切軌契約，不修改保存語意。

### 其他資訊容器

固定標題：

```text
其他資訊（選填）
```

收合摘要依序顯示：

```text
餐飲｜現金｜今天
```

日期摘要規則：

- 與 `appNow()` 的裝置本地日期相同：`今天`。
- 同年度其他日期：`M/D`。
- 不同年度：`YYYY/M/D`。
- 日期無法解析時顯示 draft 原值，不偽裝成「今天」。

展開後：

- 類別、支付方式與日期位於同一淡色容器。
- 現有店家與時間控制保留在同一個既有次要資訊 disclosure 中，不刪除功能或改變資料來源。
- 使用現有主題低對比海洋色／灰藍色、1px 淡邊框、10–12px 圓角、10–12px 內距。
- 不使用 coral 或錯誤紅。
- 內容以 `min-width:0`、可換行 grid／flex 與既有 16px 表單控制字級支援 320／375／390／430px。
- 長日期、自訂類別與自訂支付方式不得撐破容器。

### 鍵盤導引

- 單筆明細由 `enterkeyhint="done"` 改為 `enterkeyhint="next"`。
- Enter 不再呼叫 `saveLedgerEntry(false)`。
- 個人帳將焦點／視線導向代購 Toggle，不自動開啟。
- 團體帳將焦點導向分攤成員第一個可操作控制。
- 儲存按鈕與既有驗證規則不變。
- 如果驗證錯誤位於收合的其他資訊內，先展開容器再定位錯誤欄位。

## 採買預設單位

### 單一預設來源

建立一個前端預設單位常數：

```text
個
```

`SHOPPING_COMMON_UNITS` 必須包含「個」。Shopping Unit Store 的正規化結果也必須包含「個」；若舊的自訂單位清單缺少「個」，讀取結果在記憶體中補回，但不得掃描或改寫採買項目。

### 新增與連續新增

全新表單：

```text
品名：空白
數量：1
單位：個
```

「儲存並新增」後：

```text
品名：空白
數量：1
單位：個
```

分類、行程站點及其他欄位繼續使用現行保留／重設契約。

### 編輯與舊資料

- 非空單位「盒／包／瓶／自訂值」直接還原原值，不套新預設。
- 舊空白單位資料正常讀取，卡片仍顯示原本的空白單位語意。
- 打開舊空白單位資料的編輯表單時，draft 可預選「個」。
- 預選只存在表單 draft；使用者未儲存前，不更新 Store 中的 item。
- 使用者實際儲存後才把「個」寫回該筆。
- 不執行冷啟動批次 migration。
- 不修改 Personal State Schema 或 `PERSONAL_STATE_VERSION`。

### Select 與基本單位保護

- 單位 Select 不輸出空白 Option。
- 單位 Select 不輸出「不指定」Option。
- 「個」必須存在於 Select 與 Shopping Unit Store。
- 設定頁嘗試刪除「個」時立即中止，不呼叫 Store `remove()`。
- 透過既有 App Toast 顯示：

```text
「個」是新增採買項目的預設單位，無法刪除。
```

- 其他單位仍可新增、刪除、排序與選用。

## 採買與 Ledger 邊界

- 採買類別維持「必買／伴手禮／生活用品／其他」。
- Ledger 預設類別維持「餐飲／交通／票券／購物／衣物／美妝／其他」。
- 採買轉 Ledger 仍預填「購物」。
- 明細仍帶入品名，金額仍空白。
- 數量、代購對象、共用 Store 與單筆／多品項記帳流程不變。
- 「改回未記帳」及其確認說明不變。
- `ledgerLinks[]`、`recordId`、`batchId`、`linkedAt`、`releasedAt` 與三態推導不變。

## 全站字體

### 載入

在 `<head>` 靜態宣告：

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link
  href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700&display=swap"
  rel="stylesheet"
>
```

- 不使用 CSS `@import`。
- 不由 JavaScript 動態插入。
- 不提交字型檔或 Base64 字型。
- 只請求 400、500、700。

### 字體堆疊

建立全站變數：

```css
:root {
  --font-ui: "Noto Sans TC", "PingFang TC",
             "Microsoft JhengHei", system-ui,
             -apple-system, sans-serif;
}
```

`body` 使用 `font-family:var(--font-ui)`；表單、按鈕、導覽、金額、卡片、Modal／Sheet、Toast、設定與 Today／行程頁沿用 `inherit`。

不得保留以下字型作為全站中文字體：

- `Hiragino Sans`
- `Noto Sans JP`
- `Yu Gothic`

### 失敗與離線

- Google Fonts 使用 `display=swap`，不造成長時間不可見文字。
- 外部 Stylesheet 載入失敗時自然回退至 PingFang TC、Microsoft JhengHei、system-ui。
- 外部資源失敗不得阻擋首頁 Render 或 App 功能。
- 不將 Google Fonts 加入 Service Worker precache。
- 不修改 SHELL、install、activate、fetch 或離線 fallback 策略。

## Service Worker

`index.html` 是 App Shell 成員，因此完成 UI 與 Browser QA 後，Cache Version 只順延一次：

```text
okayama-trip-v65
→
okayama-trip-v66
```

除版本字串與相應精確版本測試外，不修改 `sw.js` 其他內容。

## 測試策略

先寫失敗測試，再修改實作。

### Ledger 表單

- 金額在明細前。
- 單筆個人帳為明細 → 代購 Toggle → 其他資訊。
- 單筆團體帳為明細 → 分攤成員 → 其他資訊。
- Toggle 關閉時不輸出對象；開啟時對象緊接 Toggle。
- 編輯代購紀錄正確還原狀態與對象。
- 類別、支付方式與日期位於同一「其他資訊（選填）」容器。
- 摘要顯示類別、支付方式與日期，當天使用「今天」。
- 不存在重複 ID 或平行 Renderer。
- 明細 Enter 不再儲存，並依 track 導向正確控制。

### Shopping

- 新表單與「儲存並新增」都是 `1 個`。
- Select 沒有空白／「不指定」Option。
- Store 永遠包含「個」。
- 設定頁無法刪除「個」並顯示核准 Toast。
- 非空既有單位往返不變。
- 舊空白單位讀取與卡片顯示不變，編輯預選只留在 draft。
- 冷啟動沒有批次 item migration。

### 字體與 PWA

- 字體堆疊前三順位依序為 Noto Sans TC、PingFang TC、Microsoft JhengHei。
- 不存在 Hiragino Sans、Noto Sans JP、Yu Gothic 的全站規則。
- Google Fonts URL 只含 400、500、700 與 `display=swap`。
- Stylesheet 只靜態宣告一次。
- 表單輸入維持至少 16px。
- Service Worker 精確為 v66，策略與 SHELL 不變。

### 回歸與 Browser QA

- 執行 repository 中全部 `tests/*.test.js` 與文件標題檢查。
- 驗證採買轉 Ledger 類別仍為「購物」。
- 驗證單筆、多品項、個人、團體、代購 Store、備份／還原與「改回未記帳」。
- 以 320／375／390／430px 驗證無水平溢出、控制項不重疊、字體不裁切、Button／Chip／Badge 可辨識。
- 正常網路驗證 Noto Sans TC；阻擋 Google Fonts 驗證 fallback；離線重新整理驗證 App Shell。
- Browser console error／warning 為 0。
- iPhone Safari 與加入主畫面的 PWA 保留為 Bar 真機驗收；沒有真機證據不得宣稱通過。

## 文件與交付

完成後更新：

- `07_CHANGELOG.md`
- `tasks/current.md`
- 必要的測試契約文件

交付保持未提交，提供修改摘要、檔案清單、DOM 順序、樣式、採買預設與舊資料處理、字體載入與 fallback、四種寬度 QA、完整測試結果、SW 版本、`git diff --stat`、`git status --short` 及待真機確認事項。

未經 Bar 另行核准，不 commit、push、開 PR、merge、部署或修改 GitHub Pages。
