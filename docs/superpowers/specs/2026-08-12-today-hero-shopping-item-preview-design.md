# Today Hero 採買品名預覽設計

> 狀態：2026-08-12 經 Bar 核准方向，待書面規格確認。

## 目的

Today Hero 現在用「順路採買／今日採買＋地點＋N 項」回答下一個適合採買的地點，但使用者仍需開啟清單才能知道要買什麼。本次在不增加 Hero 高度的前提下，把摘要提升為可立即辨識的旅行提示。

## 方案比較

### 採用：地點＋第一個品名＋剩餘數量

範例：`AEON 倉敷 · 暖暖包 +2`

- 地點回答「去哪裡」，品名回答「買什麼」。
- 多項只顯示第一項與剩餘數量，維持一眼可讀。
- 第一項沿用現有 `prioritizeShoppingGroupItems()` 結果：exact category `必買` 穩定置頂，其餘維持 store order，不建立新的推薦排序。

### 不採：地點＋總項數

現況資訊密度最低，但使用者仍需開啟清單才能知道內容，行動價值不足。

### 不採：地點＋多個品名

內容較完整，但長地點與長品名會在 320px Hero 造成擁擠、換行或搶走天氣摘要空間，不符合單行 briefing 契約。

## 顯示契約

- 單項：`地點 · 品名`
- 多項：`地點 · 第一個品名 +N`，其中 `N = 該地點待買總數 - 1`
- 不再另顯示 `N 項 →`；整列本身已有按鈕語意與箭頭需求可由既有互動樣式表達，避免數量重複。
- `順路採買`／`今日採買` label、地點選擇、排除 exact next stop、點擊目標與 generic fallback 均維持現況。
- 地點是主資訊，品名是次資訊。兩者維持同一行；地點與品名各自允許 ellipsis，不能讓卡片增高或產生水平 overflow。
- 若品名 trim 後為空，安全退回只顯示地點；不虛構「未命名品項」。

## Model 與資料流

`buildShoppingTodayReminder()` 已把每個 group 的 `items` 轉為按既有規則排序的品名字串。`todayShoppingHeroModel()` 直接從選中 group 產生：

- `firstItemName`：第一個非空品名字串；沒有則為空字串。
- `remainingCount`：`Math.max(group.items.length - 1, 0)`。

Renderer 只消費 model，不重新排序或回讀 Shopping store。這維持 helper 為 Hero projection 的單一權威。

## 無障礙與互動

- accessible name 改為包含地點、第一品名與總數，例如：`開啟 AEON 倉敷的採買清單，暖暖包等 3 項待買`。
- 單項為：`開啟 AEON 倉敷的採買清單，暖暖包 1 項待買`。
- 品名與地點繼續經 HTML／attribute escaping。
- 既有 44px 觸控高度、Enter／Space、focus-visible、開啟對應 Shopping group 與停留 Today 分頁的行為不變。

## 測試

- Node model：第一品名、`remainingCount`、必買優先與 input immutability。
- Node renderer：單項、多項、空品名 fallback，以及地點／品名 attribute escaping。
- Browser：真實 Hero 顯示 `地點 · 第一品名 +N`、accessible name、點擊／鍵盤行為。
- 320／375／390px：維持單行、44px、ellipsis，Hero／文件無水平 overflow，天氣與採買摘要不重疊。
- 完整 Node、Playwright 三情境、Service Worker update、`window.healthCheck()` 與既有一致性 Gate 全部重跑。

## 範圍與回滾

預計修改 Tier 2 `index.html` 的 Hero model／renderer／CSS，以及相關測試、版本與交付文件。因 `index.html` 是 PWA App Shell，交付時 `app-version.js` 與 `sw.js` 需同步由 v103 升至下一版，`netlify.toml` cache header 不變但仍納入 PWA 風險群組核對。

不修改 Shopping store、item schema、排序規則、localStorage、個人備份、Ledger、Google Sheet、Apps Script 或 Today exact-next-stop badge。

若需回滾，依 PWA 規範以新的 forward version bump 恢復上一版 Hero model／markup／CSS，不倒退版本、不刪除 Service Worker。
