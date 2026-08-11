# 04 UI 準則

## v103 Today Hero actionable-summary contract

- Active trips show a small `completed / total` value, a date with decorative weather art, and one row containing the outing hint and Shopping summary.
- Shopping location is the primary summary copy. Its action remains at least 44px tall, keyboard-focusable, and safely ellipsizes long names.
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
| 杉綠／宮島 | `#f3f5f0` | `#ffffff` | `#23402f` | `#2f6b4f` | `#d2622c` | `#fbeadf` | `#1f2b23` | `#4d5a50` | `#79857c` | `#dfe5da` | `#eaefe6` | `rgba(255,255,255,.96)` | `#7659a0` |
| 霧藍／瀨戶 | `#f4f5f7` | `#ffffff` | `#3f4c5e` | `#416b8a` | `#c86d4e` | `#f8eae4` | `#25303d` | `#56616f` | `#747f8c` | `#dce0e5` | `#e9ecef` | `rgba(255,255,255,.96)` | `#7659a0` |
| 焙茶／倉敷 | `#f7f2ed` | `#fffdfb` | `#4e3d32` | `#896748` | `#b64f5c` | `#f8e7e9` | `#332820` | `#62564e` | `#81756d` | `#e5d9ce` | `#efe7df` | `rgba(255,253,251,.96)` | `#7659a0` |

固定色：`--green #367055`、`--gold #c1963c`、`--gold-ink #85661c`，以及既有 warning／correction／shadow token。新增主題時必須補齊 13 個第一層 token 並通過自動對比測試。

## 元件慣例(復用既有 class,不重造)
- 卡片 `.item`(行程)/ `.card`(區塊)/ `.shop-mall`;圓角 12-16px,shadow 統一 `--shadow`
- 快速動作 `.qa-btn`(高≥38px,拇指友善):`drv`導航(填色)/`pk`停車/`nf`資訊/`fr`渡輪/`sp`樓層/`mo`更多
- 展開面板 `.panel`(`togglePanel(itemId,kind,btn)`),鍵值列 `.pc-row`,提示框 `.pc-tip`
- MAP CODE `.mapcode-box`+`.mc-big`(26px 大字,**純顯示無複製鈕**,看著輸入車機)
- 下一站 `.nx-hero`(coral 外框)+特大導航鈕 `.nx-navbtn`
- 底部四分頁 `.tabbar`:今天/行程/購物/分帳;吸頂 `.hdr`(單一容器,勿拆回兩段 sticky)

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
