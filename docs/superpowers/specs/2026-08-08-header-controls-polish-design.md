# Header 設定與同步控制項視覺精簡設計

日期：2026-08-08  
狀態：已核准  
目標分支：`dev`

## 目標

以最小 UI 修改更新 header 的設定入口與同步狀態外觀：設定入口改用 sliders 線條圖示，設定與同步控制項的半透明白底同步縮小，但兩者既有 44px 觸控熱區、功能與資料語意不變。

## 現況與根因

- 設定入口是 `.settings-btn` 44×44px button，內含 24px 圓角六齒 inline SVG。
- 同步入口是 `.brand .sync` button，使用 `min-height:44px`、水平 padding 與 pill 圓角。
- 兩者的 `rgba(255,255,255,.1)` 背景目前直接畫在 button 本體上，因此白底視覺面積等同觸控熱區。直接縮小 button 會讓可點擊區退化。
- 兩者雖共用相同背景色與 44px 高度，但目前沒有負責「視覺底與觸控熱區分離」的共用樣式。

## 核准方案

### 設定圖示

- 將六齒 SVG 改為三條水平軌道與錯位圓形控制點的 sliders 圖示。
- 保持 inline SVG、`viewBox="0 0 24 24"`、`fill:none`、`stroke:currentColor`、圓角端點與接點。
- 實際視覺尺寸為 22×22px，stroke width 維持既有 icon system 的 1.75px。
- button 的 `aria-label="設定"`、事件與 44×44px 外框不變。

### 共用白底 chrome

- `.brand .sync` 與 `.settings-btn` 本體背景改為透明，並共同設為 `position:relative`。
- 兩者以同一組 `::before` 規則繪製半透明白底：`position:absolute`、四周 `inset:4px`、`background:rgba(255,255,255,.1)`、`border-radius:inherit`、`pointer-events:none`。
- 因外框仍為 44px，白底視覺高度縮為 36px；設定入口為 36×36px 圓形，同步 pill 寬度也比既有本體少 8px。
- 同步文字與狀態點仍由既有 padding 置中，視覺底與內容之間保留安全留白。

## 互動與相容性

- 不修改 `openSettings()`、`openSyncStatus()`、同步狀態文案、aria-label 或任何事件處理。
- pseudo element 不接受 pointer event；點擊、hover、active 與 focus 都仍作用於完整 button。
- focus-visible 保留瀏覽器／既有樣式在 44px button 上的行為，不把焦點框縮到視覺底。
- topbar 與 `currentColor` 仍由現有六主題 token 決定；不新增顏色值或主題分支。
- 不修改其他 header、chip、badge 或 icon。

## 驗證

先建立會在現況失敗的 Playwright regression，再修改 runtime。測試使用真實 header DOM，驗證：

- 設定 icon 是 sliders 結構，不再是六齒圖示。
- sliders 為 22×22px、1.75px、stroke 等於 button current color。
- 設定與同步 button 觸控高度均至少 44px。
- 兩者 pseudo-element 白底高度為 36px，且小於觸控外框。
- 圖示、同步文字與按鈕在垂直方向保持置中。
- 六主題下 SVG currentColor 與半透明 chrome 均有效。
- 320px、375px、390px 下沒有水平 overflow，sync 仍位於 settings 左側。
- 既有同步狀態與設定開啟行為不退化。

完成後執行 repo 現有必要 Node／Playwright、文件與版本檢查；只提交並 push `dev`，不修改 `main`、不部署、不建立 tag。

## 非目標

- 不改同步邏輯、設定資訊架構、Ledger／Shopping workflow。
- 不改 schema、localStorage、個人備份版本、Service Worker 或 `netlify.toml`。
- 不重做全站 icon system 或其他 control 尺寸。
