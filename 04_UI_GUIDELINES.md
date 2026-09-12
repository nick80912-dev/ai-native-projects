# 04 UI 準則

## v110 呈現 token 與 Today view 邊界

- 非主題呈現尺度只有五級字級 `11／12／14／20／24px`、五級間距 `4／8／12／16／24px`、四級圓角 `6／10／14／999px`；只在觸及的 Today、導覽回饋、診斷與共用操作元件採用，不作全站機械式改寫。
- 操作以 `primary／secondary／quiet／destructive` 角色 token 表達，診斷以 `info／success／warning／degraded／error` 角色 token 表達；跨主題固定的 pending、entry-secondary、Shopping category／link status 亦須先定義 `:root` 語意 token，元件不得直接寫色碼。這些 token 不新增第七組配色，也不得改動六組主題各自的 13 個 `--t-*` 值。
- `today-view.js` 只接收已選好的採買摘要資料並產生純 model、既有 HTML 與宣告式 action；`index.html` 保留 reminder 選取、目前站排除、store／clock／repository 存取與 DOM effect。不得讓 view module 變成全域 store。
- Today Hero 的可見文案、六字截斷、完整 accessible name、44px 操作區、鍵盤行為與 Shopping 定位均維持 v109 行為；模組拆分不是重新設計。
- Ledger 只在真實重複規則能由一個深 seam 移除時才拆 adapter。v110 的 history candidate 未通過刪除測試，因此保留既有 `ledger-ui-state.js` 與 `index.html` 局部 DOM adapter，不新增 `ledger-history-view.js`、store、controller、event bus 或框架。

## v108 明確導覽與診斷呈現契約

- Today Hero、下一站 Shopping badge、Shopping mall 與既有精確 day／item 入口共用同一 navigation-intent seam；一般切 tab 或重點目前 tab 不建立 target intent。
- 成功抵達後，目標必須捲到有效 sticky header 下方並套用單一 `.is-navigation-target` 樣式 1000ms，再以 `.is-navigation-target-fading` 淡出 200ms；完整「已定位：…」只存在 visually-hidden `role="status" aria-live="polite"`。`prefers-reduced-motion: reduce` 在 1000ms 後直接清除，不播放 transition。
- `shopping-list` 只開啟既有 overlay，不改 `curView`。關閉後依序回復仍存在的原 launcher、同一穩定身分的 replacement launcher，或來源 tab，並明確回復來源捲動位置；focus options 不支援或被忽略時也不得讓頁面跳位。
- 找不到目標時仍開啟目的 view 的正常位置，顯示不阻擋操作的「找不到對應地點」、記錄 Render diagnostic 並安全結束 intent；不得 throw 或錯誤套用其他頁面的舊捲動位置。
- 診斷面板可將原始 AppLog 顯示為 `info`、`degraded` 或 `action-required`，並補上當前影響與可用 fallback；已知 Ledger 增量讀取逾時必須說明目前仍可使用一般 CSV 同步。原始技術 message 必須仍可見、正確 escape，複製報告不得混入投影文案。
- navigation intent 與 diagnostic projection 都只存在目前 session／render；不得寫入 localStorage、個人備份、Queue、CMS、Ledger，亦不得改變 Health Check、retry 或 sync 判定。

## v103 設定「自訂項目」資訊架構

- `自訂項目` 先顯示記帳類別、支付方式、採買單位三個摘要入口與即時數量；一次只進入並管理一種清單。
- 單類管理頁保留新增、刪除、排序與既有資料規則，返回鍵先回 `自訂項目`，再回設定根頁。
- `個` 顯示為預設採買單位並沿用不可刪除防護；320／375／390px 不得讓名稱、標籤與三個排序／刪除控制重疊。

## v107 Today Hero actionable-summary contract

- Active trips show a small `completed / total` value, a date with decorative weather art, and one row containing the outing hint and Shopping summary.
- The resolved Shopping value is one compact right-aligned group with a 4px gap: `地點 · 第一優先分類 +N`.
- When the selected item's category is blank, the Hero renders `未分類` as the complete category label. This is a display-only fallback: the reminder model, Shopping store, form, backup, restore, and sync payload keep the original blank value.
- A location of seven or more Unicode code points renders its first six plus `…`; CSS may shorten it further on constrained widths. Category and `+N` remain complete and do not flex-shrink.
- The full location remains in the accessible name. The action stays at least 44px tall, keyboard-focusable, and contains no product name.
- 通用採買狀態的 `開啟查看 →` 與右側欄位右緣對齊；具體站點摘要顯示 `地點 · 第一個優先分類 +N`，Hero 不顯示品名，地點與分類皆可各自單行省略，數量保持可見。
- The existing next-stop badge owns the exact next Shopping stop; the Hero projects the first eligible future group and never duplicates that badge.
- This contract is active-trip only. Pre-trip views, data contracts, and storage behavior remain unchanged.



## 哲學
手機優先(iPhone 390px)。每個畫面只回答一個問題,3 秒找到資訊。卡片+摺疊面板收納細節,點了才展開,避免長文牆。

## 色彩（雙層 CSS 變數）
第一層為主題 token：`--t-paper`、`--t-card`、`--t-chrome`、`--t-action`、`--t-accent`、`--t-accent-bg`、`--t-ink`、`--t-ink-soft`、`--t-ink-faint`、`--t-line`、`--t-line-soft`、`--t-tabbar`、`--t-secondary`。第二層保留既有角色名稱（如 `--paper`、`--sea-deep`、`--coral`），只能 `var()` 對映第一層，不得在元件內重複主題色碼。固定語意色（完成、警告、住宿、修正邊框）不隨主題改變。

| 主題 | paper | card | chrome | action | accent | accent-bg | ink | ink-soft | ink-faint | line | line-soft | tabbar | secondary |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 海洋／岡山 | `#f5f1e8` | `#fffdf8` | `#0e3a44` | `#12707f` | `#df5f3a` | `#fbeee7` | `#22303a` | `#5c6b73` | `#7c8a90` | `#e5ddcd` | `#eee8db` | `rgba(255,253,248,.96)` | `#7659a0` |
| 象牙／靛藍 | `#faf9f5` | `#ffffff` | `#16243d` | `#800000` | `#e25a0f` | `#fdece2` | `#16243d` | `#4a5361` | `#727c8c` | `#dcd8cc` | `#e8e5dc` | `rgba(255,255,255,.96)` | `#7659a0` |
| 藤紫／夜櫻 | `#f6f3f7` | `#ffffff` | `#3b2d4d` | `#6a3d7d` | `#c0416e` | `#fae9ef` | `#2a2331` | `#575061` | `#7e7689` | `#e6dee9` | `#efe9f2` | `rgba(255,255,255,.96)` | `#2f6f6a` |
| 杉綠／宮島 | `#edf3ec` | `#fbfdf9` | `#1f3b2a` | `#2f6b4f` | `#bd4e24` | `#f8e4d8` | `#1d2b21` | `#475b4d` | `#6f8174` | `#d3dfd1` | `#e4ece2` | `rgba(251,253,249,.96)` | `#6f6532` |
| 霧藍／瀨戶 | `#edf4f8` | `#fbfdff` | `#314d63` | `#356d8c` | `#9a6614` | `#f7ecd0` | `#1e303d` | `#4d6270` | `#6f8290` | `#d2dfe7` | `#e2ebf0` | `rgba(251,253,255,.96)` | `#4b746c` |
| 焙茶／倉敷 | `#f7f0e7` | `#fff9f1` | `#49362b` | `#896748` | `#405c7a` | `#e5edf5` | `#33261d` | `#5f4e42` | `#7a695d` | `#ddcbb9` | `#eadfd2` | `rgba(255,249,241,.96)` | `#9a4f30` |

固定色：`--green #367055`、`--gold #c1963c`、`--gold-ink #85661c`，以及既有 warning／correction／shadow token。新增主題時必須補齊 13 個第一層 token 並通過自動對比測試。

## 元件慣例(復用既有 class,不重造)
- 卡片 `.item`(行程)/ `.card`(區塊)/ `.shop-mall`;圓角 12-16px,shadow 統一 `--shadow`
- 快速動作 `.qa-btn`(高≥38px,拇指友善):`drv`導航(填色)/`pk`停車/`nf`資訊/`fr`渡輪/`sp`樓層/`mo`更多
- 展開面板 `.panel`(`togglePanel(itemId,kind,btn)`),鍵值列 `.pc-row`,提示框 `.pc-tip`
- MAP CODE `.mapcode-box`+`.mc-big`(26px 大字,**純顯示無複製鈕**,看著輸入車機)
- 下一站 `.nx-hero`(coral 外框)+特大導航鈕 `.nx-navbtn`
- 底部四分頁 `.tabbar`:今天/行程/購物/分帳;吸頂 `.hdr`(單一容器,勿拆回兩段 sticky)

## 形狀語意(2026-09-12 核定:圓角區分「狀態」與「動作」,不得互換)

- **`border-radius:999px` 膠囊 = 狀態**。三種用途:①純顯示的 badge／tag(`.now-badge`、`.ledger-tag`、`.shop-list-count`、`.ledger-pending`、`.ledger-status-pill`)②可選取的 chip／toggle(`.ledger-track-btn`、`.shopping-chip`、`.trip-filter-btn`、`.shop-filter-btn`、`.ledger-choice`)③segmented control 的 track(`.ledger-track-grid`、`.ledger-segment`、`.ledger-sheet-track`、`.ledger-currency-grid`)。
- **`.btn` 的圓角矩形 = 動作**。按下去會發生事情的命令:儲存、取消、新增第一項採買、儲存並再記一筆。
- **`border-radius:50%` 正圓 = 純圖示按鈕**。沒有文字、方形命中區的圖示控制項:`.settings-btn`、`.settings-close`、`.shop-search-clear`、`.ledger-fab`、`.shopping-add-button`、`.shopping-photo-warning-mark`。**它們是動作,但不套 `.btn` 的矩形** —— 圖示按鈕自成一類,改成矩形反而會讓它變成這個家族裡的異類。
- **不得互換**。膠囊傳達「這是一個你可以切換的狀態」,矩形傳達「這會執行一件事」,正圓傳達「這是一個圖示操作」。把選取控制項改成矩形會讓它看起來像命令;把動作做成膠囊則相反。**新增元件時先問它是狀態還是動作,再決定形狀**。
- **可選取的膠囊必須有明確的選取外觀**,不能只靠邊框顏色與文字深淺 —— 全 app 的選取狀態慣例是**填色**(`background:var(--sea)` 加白字,或淺色填底加深色字)。`0.667px` 的邊框在 12px 字級下辨識不出來。
- **圓角尺度(2026-09-12 修訂)**:既有 token 為 `--radius-sm:6px`／`--radius-control:10px`／`--radius-card:14px`／`--radius-pill:999px`。實際使用最多的是 **8px** 與 **9px**(`.btn` 家族),兩者原本不在尺度內。**現正式承認四級之外的 8／9px 為既有主力值**,新元件應優先取用既有 token;`3／4／5／11／13／18／20／22px` 等單次使用的離群值列為可收斂對象(`tasks/backlog.md` #35)。

> 頁首的同步狀態 chip(`.brand .sync`)與設定鈕(`.settings-btn`)是**成對設計**:`.brand .sync::before,.settings-btn::before` 同一條規則給兩者 `inset:4px`、`border-radius:inherit` 的 `rgba(255,255,255,.1)` 襯底。前者是狀態顯示(可點開詳情),後者是圖示動作,**形狀各依其類,不應統一**。

> 2026-09-12 實測依據:37 條規則使用 999px,分屬上述三類;`.btn` 家族為 9px。Bar 曾提議把膠囊統一為圓角矩形,經盤點後確認形狀承載語意而未採納,改為明文寫下規則。

## 字體
全站使用 `"Noto Sans TC","PingFang TC","Microsoft JhengHei"` 優先的繁中字體 stack。內文 15px、標題 17-20px、輔助 11-13px。主導覽四個功能圖示與設定入口使用同一組 inline outline SVG（`currentColor`），不引入 icon font；交通、天氣等內容 Emoji 可保留。桃子診斷徽章維持 PNG。

表單控制項(`input` / `select` / `textarea`)最小字級為 16px,此規則優先於內文字級表,避免 iOS focus 時自動放大。

## 行動手勢
- App 採單一 Scroll-only 政策：`html,body { touch-action:pan-x pan-y; }`，只允許水平與垂直捲動，不提供雙擊或捏合縮放。
- 禁止恢復 `.wrap` transform 縮放、回彈、`setupPinchZoom()` 或 JavaScript 雙擊攔截器，避免與 WebKit visual viewport 形成雙重縮放狀態。
- 輸入框 focus 造成縮放殘留時，仍只允許 viewport「瞬鎖約 100ms → 原始字串還原」；`maximum-scale` 與 `user-scalable=no` 不得常駐。
- iOS App 從背景回到前景或由 page cache 恢復時，必須還原原始 viewport 字串、清除舊 inline transform，並在兩個 animation frames 後恢復原捲動座標；禁止以 reload 或重繪清除使用者狀態。
- 桃子診斷徽章、按鈕、連結、表單控制項、垂直頁面捲動及水平清單捲動必須保持正常。
- 正常 Dev 不長期收集 `touch`、`gesture`、`dblclick` 或 `visualViewport` 手勢事件；若問題重現，須經 Bar 核准才可啟用短期證據 Build。
- 短期證據 Build 只能使用 passive listener，禁止呼叫 `preventDefault()`、修改 viewport、寫入 storage、記錄輸入值或完整 URL；證據判讀後的任何修正仍須另行核准。

## 互動
打卡 `.chk` 勾選→卡片變灰+劃線;toast 回饋 2 秒;摺疊箭頭旋轉動畫 .25s;所有清單觸控列 ≥44px 高。
- 首頁父子串點卡展開後，子卡整列可導向同日行程頁的對應卡片並展開既有資訊；父卡只負責展開／收合，非父子卡維持既有導向。
- 父列本身具有地點或 ID 時，該父列即為展開清單的第一站，保留原始時間與行程 ID；父卡維持不可導向，第一站及後續子站皆使用各自原始 ID 精確開啟行程卡。
