# 設定根頁群組列表設計

> 日期：2026-08-01（2026-08-01 依 Bar 裁定修訂：四群組 → 三個常駐群組；測試模式移出設定根頁）
> 狀態：**已核准的下一版設計，尚未實作**
> 目標版本：SW／App **v74**
> **發布順序（Bar 已裁定）：先完成並正式發布 v73，再開始 v74。** 本文件目前只是設計規格，**不得**據此建立 v74 feature branch 或修改任何 runtime。

## 0. 發布順序裁定（2026-08-01）

**確定採用：先發 v73，再開 v74。**

理由：

- v73 包含 SW 更新完整性、快取污染防線、子資源 fallback 與版本安全取值。
- 正式站目前仍是 **v18**。
- 先讓正式站進入**已驗證的 v73**，後續 v74 與旅途中可能需要的 hotfix，才能建立在可靠的更新機制上。
- **不接受正式站由 v18 一次跳到尚未實作與驗收的 v74。**

**因此**：

- `docs/batch2-device-acceptance.md` 的 **v73 驗收標準（含 E1 七區順序、E2 摘要含 `N 單位`）維持有效，不得提前改成 v74 標準，不得覆蓋或抹除 v73 已完成的驗收證據。**
- v74 的 delta 驗收標準寫在本文件 §8，待 v73 正式發布後才併入驗收清單。

## 1. 問題與目標

目前設定根頁把「身分、主題、代購對象、帳務、自訂項目、資料與版本、測試模式」各自包成一張 `.settings-section` 卡片。每張卡都重複使用區塊標題、15px 內距、12px 下間距與至少 56px 的功能列，造成垂直空間大量浪費。

本次目標是把根頁改成 iPhone 系統設定式的群組列表，在不刪除功能、不改子頁、不降低觸控面積的前提下，讓資訊密度提高、掃讀更快，並把**測試工具移出一般旅遊設定**。

成功標準：

- 設定根頁由 7 張獨立大卡片縮成 **3 個常駐群組**。
- 375px 寬度下，一般情況能在約一個畫面內看完所有群組。
- 所有可點擊列最小高度維持 52px；切換與新增按鈕最小觸控高度維持 38px。
- 既有 7 區功能、子頁入口、摘要資料、開關行為、捲動位置保存與可存取名稱全部保留（測試模式改為由專屬控制頁承載，功能不減）。
- 不修改任何資料格式、localStorage key、備份版本、帳務流程、測試模式語意或 Service Worker 策略。

## 2. 資訊架構

設定根頁改為**三個常駐群組**，順序固定如下。**常態下不顯示「進階」群組，也不顯示團體帳測試模式項目。**

### 2.1 個人

1. 目前身分
   - 左側：人像圖示、標題「目前身分」。
   - 右側：目前身分名稱、外框「切換」按鈕、方形 `＋` 按鈕。
   - 「切換」沿用 `openMemberSelector(false,false)`。
   - `＋` 沿用 `openMemberSelector(false,true)`，可存取名稱為「新增身分」。

2. 主題
   - 左側：主題圖示、標題「主題」。
   - 右側摘要：目前主題名稱，例如「海洋／岡山」。
   - 最右側 chevron。
   - 沿用 `openSettingsPage('theme')`。

### 2.2 記帳

1. 代購對象
   - 右側摘要：`N 位常用對象`。
   - 沿用 `openSettingsPage('proxy')`。

2. 帳務
   - 右側摘要：`<預設幣別> · <匯率>`，例如 `JPY · 0.22`。
   - 匯率未設定時顯示 `JPY · 未設定` 或依目前預設幣別顯示。
   - 沿用 `openSettingsPage('ledger')`。

3. 簡易結算模式
   - 獨立開關列，不再附在帳務卡片內。
   - 左側標題「簡易結算模式」。
   - 右側可顯示「已啟用／已關閉」與現有 checkbox。
   - 沿用 `isSimpleSettlementMode()` 與 `setSimpleSettlementMode(this)`。
   - 輔助說明「保留已確認結清」不常駐顯示；保留在可存取說明或必要提示中。

4. 自訂項目
   - 右側摘要：`N 類別 · N 支付方式`。
   - **採買單位數量不在根頁摘要顯示**，仍完整保留於子頁。
   - 沿用 `openSettingsPage('options')`。

5. **測試模式警告列（條件式，預設不存在）**
   - **測試模式關閉時：完全不渲染這一列**，不留佔位、不留隱藏節點。
   - **測試模式開啟時**：在「記帳」群組**最下方**出現一列警告入口：

     ```text
     ⚠ 團體帳測試模式已開啟　前往關閉 ›
     ```

   - 點擊進入 `test-mode` 控制頁（見 §2.4）。
   - **根頁不得放置任何可直接切換測試模式的 checkbox**，避免誤觸。
   - 開啟後必須**立即出現**；關閉後必須**立即消失**。

### 2.3 資料

1. 資料與版本
   - 左側標題「備份、還原與版本資訊」。
   - 右側摘要：`SW <版本>`，例如 `SW v74`；版本缺失時顯示 `SW 未知`。
   - 沿用 `openSettingsPage('data')` 與既有 `appVersionLabel()` 安全取值。

### 2.4 測試模式控制頁（不在根頁）

**裁定理由**：團體帳測試模式使用頻率極低，屬於**開發／驗收工具，不是一般旅遊設定**，不應永久占用設定根頁空間。

新增獨立 Settings 子頁：

- render function：**`renderSettingsTestModePage()`**
- 頁面識別固定使用：**`test-mode`**（加入 `SETTINGS_PAGE_IDS`）

此頁包含：

- 現有**完整**測試模式說明文字（`只顯示測試紀錄`、`關閉即回正式帳本` 等，一字不刪）
- `僅團體帳` 警告標籤
- 現有 checkbox
- `setLedgerTestMode(this)`
- 可正常返回設定根頁（沿用 `backToSettingsRoot()` 與捲動保存機制）

**三個進入點，缺一不可**：

1. **診斷面板** —— 測試模式關閉時，這是唯一的啟用入口
2. **設定根頁的條件式警告列**（測試模式開啟後才出現，見 §2.2.5）
3. **分帳頁 TEST banner 的「前往設定關閉」**（見 §2.5）

### 2.5 Legacy deep-link 契約（必須維持有效）

分帳頁的 TEST 警示 banner 目前使用（`index.html` 現行程式碼）：

```js
<button class="btn coral" onclick="openSettings('ledgerTestModeSection')">前往設定關閉</button>
```

**這個入口必須繼續有效。** v74 必須把映射改為：

```js
ledgerTestModeSection: {
  page: 'test-mode',
  anchorId: 'ledgerTestModeSection'
}
```

**不可讓它落到設定根頁中已不存在的 anchor。** 使用者在 TEST 模式中按「前往設定關閉」時，**必須直接抵達可關閉測試模式的控制頁**——這正是最不該失效的路徑。

另外兩個 legacy target **也必須保留**（現行 `SETTINGS_LEGACY_TARGETS` 內容）：

- `ledgerOptionSettingsSection` → `{page:'options', anchorId:''}`
- `ledgerProxyTargetSettingsSection` → `{page:'proxy', anchorId:''}`

## 3. 視覺結構

### 3.1 群組

- 群組標題位於卡片外，字級 12–13px、粗體、使用 `var(--sea-deep)`。
- 群組間距約 14px。
- 每個群組只有一張白色／主題卡片背景，使用現有 `var(--card)`、`var(--line)` 與 `var(--shadow)`。
- 卡片圓角維持 13–14px。
- 群組內的相鄰列使用 `1px solid var(--line-soft)` 分隔，不使用額外卡片間距。

### 3.2 列

- 基本列使用三區結構：左側圖示、中央標題、右側摘要／控制與 chevron。
- 每列最小高度 52px，水平 padding 13–14px。
- 標題字級約 14px、粗體。
- 摘要字級 12–13px、顏色 `var(--ink-soft)`，單行省略。
- Chevron 沿用目前 `settings-menu-chevron` 視覺語言。
- 圖示必須使用現有 inline SVG 或 `currentColor` 圖示方式，不加入 emoji，不載入新套件或外部圖示庫。

### 3.3 身分列

- 身分名稱顯示在右側控制區前方，過長時省略。
- 「切換」使用外框次要按鈕；新增使用 38×38px 方形 `＋` 按鈕。
- 在 320px 寬度下不得換成兩列，也不得造成水平溢位；必要時優先縮短身分名稱顯示寬度。

### 3.4 測試模式警告列

- 使用既有警告語意色，**不得讓整列高度超過一般列**。
- 只有標題文字與 chevron，**沒有任何可直接切換的控制項**。
- 關閉時完全不渲染（見 §2.2.5）。

## 4. 互動與狀態

- 所有既有子頁的 `settingsUiState.page`、`captureSettingsScroll()` 與返回根頁捲動保存機制維持不變；`test-mode` 頁同樣納入。
- 根頁重繪後，所有摘要必須由當下 store／設定即時計算，不增加新的持久化狀態。
- 簡易結算模式切換後，根頁狀態文字與 checkbox 必須一致。
- **測試模式在 `test-mode` 頁切換後，返回根頁必須立即反映最新狀態**：開啟 → 警告列出現；關閉 → 警告列消失。
- 關閉測試模式後，分帳頁必須回到正式帳本（沿用現行 `ledgerUniverseMode()` 語意，不改）。
- `APP_VERSION` 仍只能透過 `appVersion()`／`appVersionLabel()` 讀取，不得重新引入裸讀。
- 所有按鈕與可點擊列必須保留可存取名稱、鍵盤操作與 `aria-pressed`／checkbox 語意。

## 5. 範圍限制

本次只做：

- 設定根頁的 HTML 結構與 CSS。
- 新增 `test-mode` 子頁與 `renderSettingsTestModePage()`，並把測試模式從根頁移入。
- 診斷面板新增進入 `test-mode` 頁的入口。
- 根頁摘要文字精簡。
- 對應的靜態契約測試與 Playwright 驗收。
- 版本由 v73 升到 v74，以及必要文件同步。

本次不做：

- 不改主題選擇頁、代購對象頁、帳務頁、自訂項目頁、資料與版本頁的內部布局。
- 不改身分選擇器。
- 不改備份格式或 `PERSONAL_STATE_VERSION=8`。
- 不改團體帳測試模式的資料隔離、Apps Script 寫入、`[TEST]` 前綴或過濾規則。**只改它的入口位置，不改語意。**
- **不改 Service Worker 的 install／fetch／fallback 策略與 SHELL 清單**（見 §6 的因果條件）。
- **不改 `index.html` 載入 `app-version.js` 的方式**（見 §6）。
- 不新增圖示套件、前端框架或依賴。
- 不順手處理 backlog #20、#26 或其他非設定根頁事項。

## 6. 版本與發布影響

- 此變更會修改 `index.html`，因此候選版本由 v73 升為 **v74**。
- 同步修改 `sw.js` 的 `SW_VERSION` 與 `app-version.js` 的 `APP_VERSION`；`tools/check-app-version.js` 必須通過。
- **v74 必須在 v73 正式發布之後才開始實作**（見 §0）。因此使用者實際經歷的是 **v73 → v74**，是一個小 delta。

### 6.1 B2–C3 證據的有效前提（因果條件，必須遵守）

2026-07-31 於 iPhone 完成的 v18→v73 **B2–C3 實測證據**（SW 更新機制、快取內容正確性、混版本、離線 fallback），**只有在 v74 不修改下列項目時，才能作為後續版本的更新機制證據**：

- Service Worker **install** 策略
- Service Worker **fetch** 策略
- Service Worker **fallback** 策略
- **SHELL 清單**
- `index.html` **載入 `app-version.js` 的方式**

**若其中任何一項改變**：

- 既有 B2–C3 證據**不得直接外推**。
- **必須重新執行對應的升級與混版本驗證。**

目前 v74 設計**仍禁止修改上述項目**（見 §5），故證據可沿用。**這條因果關係必須在任何未來修訂中一併檢查** —— 有人動了 SHELL 而沒改這一節，證據就會在無人察覺的情況下失效。

### 6.2 v74 必須重新驗證的項目

- v73→v74 正常換代與 CacheStorage 實際內容。
- 設定根頁**三個常駐群組**順序與所有入口。
- 320／375／390px 無水平溢位。
- 身分按鈕、開關、chevron 與摘要顯示。
- E3 返回捲動位置保存（含 `test-mode` 頁）。
- 六主題下群組卡片、分隔線、文字與控制可讀。
- 測試模式控制頁、三個進入點與根頁警告列的狀態同步。
- 資料與版本頁仍可在 `APP_VERSION` 缺失時顯示 `SW 未知`。

## 7. 測試要求

### 7.1 既有契約的處理原則

`tests/ledger-entry-settings.test.js` 目前有幾項舊契約會因本次改版而失效：

- 設定根頁七區順序
- 三個 legacy targets
- 測試模式完整說明文字
- TEST banner 導向 `ledgerTestModeSection`

**v74 實作時請更新為「語意契約」，不要依賴函式在原始碼中的排列位置。**

具體規則：

1. **三個 legacy mappings 必須保留**（`ledgerTestModeSection` → `test-mode`、`ledgerOptionSettingsSection` → `options`、`ledgerProxyTargetSettingsSection` → `proxy`）。
2. **測試模式完整文字必須存在於 `renderSettingsTestModePage()`**。
3. **測試需精確擷取或呼叫新的 render function**，不得用「從 `openSettings(` 切到某個後續函式」這種位置相依的 source slice 來間接驗證。
4. **不得為配合舊 source slice，刻意安排函式在檔案中的位置。** 契約由語意決定，不由排版決定。
5. **TEST banner deep link 必須解析到 `test-mode` page**（測 `normalizeSettingsTarget('ledgerTestModeSection')` 的實際回傳值）。
6. **測試模式關閉時，設定根頁不得出現相關列**（斷言渲染結果完全不含該列，而非只是視覺隱藏）。
7. **測試模式開啟時，條件式警告列必須出現。**
8. **診斷面板必須能進入測試模式控制頁。**
9. **關閉測試模式後，設定警告列消失且分帳回到正式帳本。**

### 7.2 其他測試

- `tests/theme-system.test.js`：六主題下的新群組列表仍使用語意 token，不引入硬編碼主題色。
- 新增設定根頁測試（建議獨立檔，不塞進 `settings-backup-ux.test.js` —— 後者職責是備份 UX 流程）：三群組順序、列標題、摘要、入口函式與 `test-mode` 頁存在。
- `tests/app-version-fallback.test.js`：資料與版本摘要仍使用安全 helper，不允許裸讀 `APP_VERSION`。
- Playwright：320×700、375×812、390×844 驗證無水平溢位；根頁→子頁→返回的捲動位置保持；六主題快速切換；測試模式狀態同步（關→開→關的完整循環）。
- 完整 `tests/*.test.js`、Playwright、`tools/check-doc-titles.js`、`tools/check-app-version.js`、`git diff --check` 全部通過。

## 8. v74 delta 驗收標準（待 v73 發布後才併入驗收清單）

> ⚠️ **本節不得提前套用到 v73。** `docs/batch2-device-acceptance.md` 現行的 v73 E1（七區順序）與 E2（摘要含 `N 單位`）**仍是有效的 v73 驗收標準**，已完成的 v73 驗收證據不得被覆蓋或抹除。

### v74 新 E1

設定根頁**三個常駐群組**順序：

```text
個人 → 記帳 → 資料
```

### v74 新 E2

摘要要求：

- 代購對象：`N 位常用對象`
- 自訂項目：`N 類別 · N 支付方式`

採買單位仍保留於子頁，但**不再顯示於根頁摘要**。

### v74 測試模式驗收

- 關閉時根頁**不顯示**測試模式（完全不渲染）。
- 診斷面板可進入並啟用。
- 開啟後根頁**出現**警告列。
- 分帳 TEST banner 可直接進入關閉頁。
- 根頁警告列可直接進入關閉頁。
- 關閉後警告列**立即消失**。
- 關閉後回到正式帳本。

### v74 其餘驗收

Bar 在 iPhone PWA 上確認：

1. 根頁依序顯示「個人、記帳、資料」三群組，常態下看不到測試模式。
2. 所有原有入口都能使用，沒有功能遺失。
3. 身分列在 320px 等級寬度下不換行、不溢位，切換與新增皆可點。
4. 簡易結算模式可切換，顯示狀態與實際值一致。
5. 設定根頁明顯比 v73 緊湊，沒有「每項各一張大卡片」的浪費感。
6. 六個主題下文字、分隔線、圖示與按鈕都清楚可讀。
7. v73→v74 更新後，設定頁顯示 `SW v74`，新版群組列表內容確實生效。

## 9. 決策摘要

採用方案一：iPhone 系統設定式群組列表。

核心決策：

- **三個常駐群組**（個人／記帳／資料），不做兩欄磁磚，**不設常駐「進階」群組**。
- **測試模式移出設定根頁** —— 它是開發／驗收工具，不是一般旅遊設定。啟用入口在診斷面板；開啟後才在「記帳」群組底部出現條件式警告列。
- 專屬 `test-mode` 控制頁承載完整說明與 checkbox，三個進入點皆須有效。
- Legacy deep-link `ledgerTestModeSection` 必須解析到 `test-mode`，不得落到不存在的 anchor。
- 保留 52px 以上觸控列，不以犧牲可用性換取密度。
- 子頁與資料語意不變，只重排根頁。
- **發布順序：先發 v73，再開 v74。** 發布候選版屆時升為 v74。

## 10. 執行狀態

- **2026-08-01：設計規格已核准，尚未實作。**
- **不得**據此建立 v74 feature branch、修改 `index.html`／`sw.js`／`app-version.js`／`tests/`／`tools/`／CI，或變更版本號。
- 下一步是完成 v73 的發布流程（G1 剩餘項 → R1-c → PR → G4 merge → 部署 → `production-v73` tag）。
- **v73 正式發布完成後**，才啟動 v74 實作。
