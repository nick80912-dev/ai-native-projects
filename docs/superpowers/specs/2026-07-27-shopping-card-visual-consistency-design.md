# 採買卡片視覺一致性與部分購買入口設計

## 目標

改善採買卡片的資訊辨識、代購姓名標籤、部分購買入口、採買明細密度與批次多選操作，並修正全站繁中文字在同一行出現粗細不一致的問題。

本批只調整顯示、文案與操作入口，不修改 Shopping Item `allocations[]`、個人狀態備份 v7、Ledger 21 欄、Apps Script、Google Sheet、同步或結算語意。

## 問題與原因

### 類別與品名太相近

類別目前雖已有 mint 底色，但文字使用 `var(--sea-deep)`，與品名的深色層級接近，快速掃視時仍不容易區分。

### 代購標籤包住過多文字

卡片目前把 `幫阿寶、媽媽 +1 買` 整句放進 coral 標籤。「幫／買／、／+1」都是句法輔助，不應與真正需要辨識的姓名取得相同視覺權重。

### 部分購買入口不容易發現

「部分買到」目前只在 `⋯` 選單中，使用者不容易知道項目可拆分。另一方面，自己買且總需求只有 1 的項目只有「買到／沒買到」兩種結果，不存在部分購買，不應顯示無效入口。

### 批次工具列被壓縮並遮住內容

批次工具列原本意圖使用「計數一列、動作一列」，但 `.shopping-selection-toolbar-stacked` 宣告在基礎 `.shopping-selection-toolbar` 之前，後者以相同 specificity 覆蓋 `grid-template-columns`。結果計數與三顆按鈕被塞回同一列，按鈕寬度不足時中文逐字直向換行，工具列高度增加並遮住更多清單內容。

### 已買狀態與多選狀態共用同一個 checkbox

`renderShoppingItem()` 目前只有待買項目會在多選模式改用 selection checkbox；已買項目仍顯示藍色已勾選的完成 checkbox。使用者無法分辨「已買」與「已選取」，點擊時還會把項目移回待買而不是加入批次選取。

### 同一行中文字粗細不一致

全站目前使用：

```css
"Hiragino Sans","Noto Sans TC","PingFang TC",system-ui,-apple-system,sans-serif
```

`Hiragino Sans` 是日文字型，卻排在繁中字型前。部分繁中文字形存在於 Hiragino、部分需要 fallback 到 PingFang TC 或系統繁中字型，因此同一個按鈕內的「媽媽／爸爸」、「稅與優惠券」與「信用卡」可能由不同字型繪製，看起來一粗一細。採買明細使用不同文字層級，視覺差異較不明顯，但根因仍是全站字型順序。

## 核准方案

### 1. 全站繁中字型優先

`body` 字型順序改為：

```css
"PingFang TC","Noto Sans TC","Microsoft JhengHei",system-ui,-apple-system,sans-serif
```

- iOS／macOS 優先使用 PingFang TC。
- 有安裝 Noto Sans TC 的平台使用 Noto。
- Windows 明確提供 Microsoft JhengHei。
- 最後才使用平台 `system-ui` 與通用 sans-serif。
- 不內嵌 Web Font，不增加下載量、離線快取或授權範圍。
- 表單控制與按鈕繼續使用既有 `font:inherit`／`font-family:inherit`，不為個別中文字加特殊粗細。

### 2. 類別標籤

類別改為淡金底＋深金字，外型沿用代購姓名標籤的圓角、內距與字級。類別與以下資訊形成不同語意色：

- 品名：主要墨色。
- 代購姓名：coral／淡紅底。
- 類別：深金／淡金底。
- 記帳狀態：維持既有 linked／partial／unverified／unlinked 色彩。

不改分類資料或選項。

### 3. 代購姓名標籤

卡片顯示拆成獨立片段：

```text
幫 [阿寶] [媽媽] +1 買
```

- 只有姓名放進 coral 標籤。
- 姓名之間不顯示「、」，以標籤間距自然分隔。
- 「幫」、「買」與 `+N` 使用普通字色與普通字重。
- 最多顯示前兩位姓名，三位以上維持 `+N`。
- 畫面雖不顯示頓號，容器仍提供完整 `aria-label`，例如「幫阿寶、媽媽等共 3 位買」，避免無障礙語意退化。
- 採買明細的完整對象文字維持一般文字，不套姓名 badge。

顯示資料直接取自 `allocations[]`，不解析已格式化的摘要字串。

### 4. 卡片上的「部分購買」

「部分買到」統一改名為「部分購買」，並從 `⋯` 選單移到卡片右側、`⋯` 前方。

顯示條件必須全部成立：

1. 項目仍為待買。
2. item 聚合記帳狀態為 `unlinked`。
3. 所有 allocation 都是可拆分的安全正整數數量。
4. 所有 allocation 的總需求大於 1。

因此：

- 自己買 1 件：隱藏。
- 自己買 2 件：顯示。
- 三位對象各 1 件，共 3 件：顯示。
- 舊式文字數量：隱藏。
- 已記帳、部分已記帳或狀態待確認：隱藏。
- 已買卡：隱藏。

資格判定由單一純 helper 提供，卡片 render 與測試共用；`startShoppingSplit()` 的既有資料層驗證仍保留，不能只靠隱藏按鈕當作安全邊界。

### 5. 採買明細內容與密度

區塊標題：

```text
代購對象與帳本紀錄
```

改為：

```text
代購對象與記帳紀錄
```

每位對象由上下兩行改為同一個可換行 flex row：

- 已買卡：`媽媽　需求 3 包 · 已買 2 包`
- 待買卡：`媽媽　需求 3 包 · 待買 1 包`

規則：

- `原需求` 縮短為 `需求`。
- `此卡` 依 item `done` 狀態改為 `已買` 或 `待買`，不可讓待買卡誤顯示「已買」。
- 姓名與數量摘要優先同行。
- 窄螢幕或長姓名時允許自然換行，不截斷重要資訊。
- 右側記帳狀態與既有進入帳本／解除關聯操作維持不變。

明細底部：

- 同時存在「編輯」與「記帳未完成對象」時，兩顆按鈕各半寬同行。
- 只有「編輯」時維持單顆滿寬。
- 320px 下每顆按鈕高度至少 44px，文字不得溢出容器。

### 6. 批次多選與底部工具列

#### 選取狀態與完成狀態分離

一般模式：

- 待買卡顯示未勾選的完成 checkbox；勾選後將項目標為已買。
- 已買卡顯示藍色已勾選的完成 checkbox；取消後將項目移回待買。

多選模式：

- 待買與已買卡都改用獨立 selection checkbox，初始為空。
- selection checkbox 的 `checked` 只讀 `shoppingUiState.selected[item.id]`，不讀 `item.done`。
- 點 selection checkbox 或卡片 body 都只呼叫選取切換，不改 `done`、不開明細。
- 多選模式隱藏卡片列上的「部分購買」／「記帳」與 `⋯`，避免卡片同時出現單筆與批次兩套操作；相關動作只由底部工具列提供。
- 已買卡在多選模式不再顯示藍色完成勾選；所在的「已買」分頁與卡片狀態 badge 已足以表達完成狀態。
- 取消多選或切換待買／已買分頁時，沿用既有流程清空 `shoppingUiState.selected`；離開多選後恢復一般完成 checkbox。
- 已買項目的批次「移回待買」只能在選取項目後由工具列明確執行。

#### 工具列單行配置

未選取任何項目時，底部只顯示一行：

```text
請選擇項目
```

不顯示三顆 disabled 動作，降低遮擋並避免無效控制。

選取一筆以上時，同一行顯示：

```text
已選 3　[移回待買] [記帳] [刪除]
```

- 計數縮短為 `已選 N`，不顯示「項」。
- 待買頁三個動作為 `已買`／`記帳`／`刪除`。
- 已買頁三個動作為 `移回待買`／`記帳`／`刪除`。
- 三顆按鈕等寬，文字 `white-space:nowrap`，不允許逐字換行。
- 320px 時縮小按鈕左右內距，不縮成不可讀字級；工具列與按鈕高度至少 44px。
- 工具列維持固定於採買清單底部，並在清單流內保留對應高度的 spacer／bottom padding，使最後一張卡可完整捲到工具列上方。
- `取消多選` 仍位於清單上方既有入口，不在底部重複提供。

## 元件與 helper 邊界

本批預計新增或調整以下顯示層邊界：

- `shoppingItemTargetSummary(item)`：保留純文字摘要，供明細與 aria 語意使用。
- 新增卡片專用 target markup helper：逐 allocation 輸出普通前後綴與獨立姓名 badge，不解析摘要字串。
- 新增部分購買資格 helper：輸入 item 與 link summary，回傳 boolean。
- `renderShoppingItem(item)`：只組合類別 badge、target markup、部分購買按鈕與既有操作。
- `renderShoppingItemDetail(item)`：依 `item.done` 產生 `已買／待買` 文案與同行配置。
- `renderShoppingItem(item)` 的 checkbox 分支以 `shoppingUiState.selectionMode` 為最高優先，不再以 `!item.done` 排除已買卡。
- `renderShoppingSelectionToolbar()`：依選取數量輸出 prompt-only 或單行 count＋actions，不保留被覆蓋的 stacked 變體。

資料正規化、拆分演算法與 Ledger resolver 不新增平行實作。

## 錯誤與退化

- allocation 數量無效或為 legacy `null` 時，卡片不顯示「部分購買」；使用者仍可從編輯流程轉成結構化數量。
- item 於畫面顯示後被其他操作刪除時，既有 `startShoppingSplit()` 查無項目的提示維持不變。
- 記帳狀態在點擊前改變時，既有 store／split 驗證仍會阻擋不合法拆分。
- 系統找不到前三個繁中字型時退回 `system-ui`，但不再先混用日文 Hiragino。
- 批次操作執行前仍以目前 `shoppingUiState.selected` 與 store 內容重新取項目；selection checkbox 只是 UI 狀態，不是資料授權或有效性邊界。
- 批次操作完成、取消多選或切換分頁後必須清空 selection，避免已不存在或已移動項目的 ID 留在下一個畫面。

## 測試

### 自動測試

- 字型順序以 PingFang TC／Noto Sans TC／Microsoft JhengHei 優先，且 Hiragino Sans 不在繁中字型前。
- 類別 badge 使用獨立淡金語意色與與姓名 badge 一致的形狀契約。
- 卡片 target markup 只有姓名位於 `.shopping-target-badge`，不包含 `幫`、`買`、`、` 或 `+N`。
- 多位姓名之間不輸出可見的「、」，但 `aria-label` 保留完整語意。
- 自購 1 件隱藏「部分購買」。
- 自購 2 件顯示「部分購買」。
- 多人各 1 件、總數大於 1 時顯示。
- legacy、linked、partial、unverified 與 done 狀態隱藏。
- `⋯` 選單不再輸出「部分買到」或「部分購買」。
- 明細標題為「代購對象與記帳紀錄」。
- 已買明細顯示 `需求 … · 已買 …`；待買明細顯示 `需求 … · 待買 …`。
- 兩顆底部按鈕同行，單顆時仍滿寬。
- 待買與已買進入多選後都輸出 selection checkbox，且其 checked 狀態只依 `shoppingUiState.selected`。
- 已買多選的 checkbox 不得直接觸發 `toggleShoppingItemDone()`。
- 多選模式不得輸出列上「部分購買」／「記帳」或 `⋯`。
- 選取數量為 0 時只輸出「請選擇項目」，不輸出 disabled 批次按鈕。
- 選取數量大於 0 時輸出單行 `已選 N` 與三顆等寬按鈕，文案不含「項」。
- 工具列按鈕禁止換行，舊的 `.shopping-selection-toolbar-stacked` 不再控制版面。
- 多選模式提供底部 spacer／padding，最後一張卡不會永久被固定工具列遮住。

### Browser QA

以 320×700、375×812、390×844 驗證：

- 長品名＋兩位姓名＋`+N`＋類別＋記帳狀態。
- 自購 1 件與多人各 1 件的「部分購買」入口差異。
- 待買／已買明細的 `待買／已買` 文案。
- 明細同行資訊與底部雙按鈕。
- 待買／已買多選 checkbox 的視覺與點擊語意；取消多選後恢復完成 checkbox。
- 0 筆選取的 prompt-only 工具列，以及 1／多筆選取的單行三動作工具列。
- 已買頁「移回待買」與待買頁「已買」批次動作。
- 採買對象選擇、稅與優惠券、信用卡的字型一致性。
- 文件、採買 panel、卡片、明細 panel 與批次工具列無水平溢出；最後一張卡可捲到工具列上方。
- 可互動按鈕維持至少 40px；主要明細按鈕至少 44px。
- console error／warning 為 0。

## 版本與文件

- UI QA 通過後，Service Worker cache 由 `okayama-trip-v64` 升至 `okayama-trip-v65`，本批只升一次。
- 更新 `CONTEXT.md` 的採買列資訊分層、部分購買入口與多選狀態分離規則。
- 在 `07_CHANGELOG.md` 記錄字型根因、卡片與明細調整、測試證據。
- 更新受 SW 版本契約影響的測試斷言。

## 不在本批範圍

- 不更改 allocation 數量或對象資料。
- 不改部分購買的拆分結果與原子寫入。
- 不改記帳狀態 resolver、Ledger links 或解除關聯語意。
- 不新增 Web Font。
- 不調整採買表單欄位、備份版本或同步格式。
- 不改批次操作本身的完成、記帳、移回待買與刪除資料語意。
- 不部署正式站。
