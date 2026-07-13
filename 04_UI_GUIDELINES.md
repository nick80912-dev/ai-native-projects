# 04 UI 準則

## 哲學
手機優先(iPhone 390px)。每個畫面只回答一個問題,3 秒找到資訊。卡片+摺疊面板收納細節,點了才展開,避免長文牆。

## 色彩(CSS 變數,定義於 :root,禁止硬編碼色碼)
- `--paper #f5f1e8` 背景 / `--card #fffdf8` 卡片
- `--sea-deep #0e3a44` 頂欄・標題 / `--sea #12707f` 主要動作・連結
- `--coral #df5f3a` 強調・下一站・時間 / `--gold #c1963c` 住宿・想逛
- `--green #3c8062` 完成・打卡 / `--violet #7659a0` 次要強調
- `--ink/#22303a`、`--ink-soft`、`--ink-faint` 文字三階

## 元件慣例(復用既有 class,不重造)
- 卡片 `.item`(行程)/ `.card`(區塊)/ `.shop-mall`;圓角 12-16px,shadow 統一 `--shadow`
- 快速動作 `.qa-btn`(高≥38px,拇指友善):`drv`導航(填色)/`pk`停車/`nf`資訊/`fr`渡輪/`sp`樓層/`mo`更多
- 展開面板 `.panel`(`togglePanel(itemId,kind,btn)`),鍵值列 `.pc-row`,提示框 `.pc-tip`
- MAP CODE `.mapcode-box`+`.mc-big`(26px 大字,**純顯示無複製鈕**,看著輸入車機)
- 下一站 `.nx-hero`(coral 外框)+特大導航鈕 `.nx-navbtn`
- 底部四分頁 `.tabbar`:今天/行程/購物/分帳;吸頂 `.hdr`(單一容器,勿拆回兩段 sticky)

## 字體
系統字("Hiragino Sans","Noto Sans TC")。內文 15px、標題 17-20px、輔助 11-13px。emoji 當 icon,不引入 icon 字型。

表單控制項(`input` / `select` / `textarea`)最小字級為 16px,此規則優先於內文字級表,避免 iOS focus 時自動放大。

## 行動手勢
- App 採單一 Scroll-only 政策：`html,body { touch-action:pan-x pan-y; }`，只允許水平與垂直捲動，不提供雙擊或捏合縮放。
- 禁止恢復 `.wrap` transform 縮放、回彈、`setupPinchZoom()` 或 JavaScript 雙擊攔截器，避免與 WebKit visual viewport 形成雙重縮放狀態。
- 輸入框 focus 造成縮放殘留時，仍只允許 viewport「瞬鎖約 100ms → 原始字串還原」；`maximum-scale` 與 `user-scalable=no` 不得常駐。
- iOS App 從背景回到前景或由 page cache 恢復時，必須還原原始 viewport 字串、清除舊 inline transform，並在兩個 animation frames 後恢復原捲動座標；禁止以 reload 或重繪清除使用者狀態。
- 桃子診斷徽章、按鈕、連結、表單控制項、垂直頁面捲動及水平清單捲動必須保持正常。
- 若完成 Scroll-only 與回前景修復後仍出現縮放或跑版，下一步只能發布事件／`visualViewport` 診斷 Build；不得自動疊加 viewport 硬鎖或恢復自製縮放。
- 診斷 Build 僅可用 passive listener 保存最多 24 筆手勢與 visual viewport 快照；禁止呼叫 `preventDefault()`、修改 viewport、寫入 storage、記錄輸入值或完整 URL。證據判讀後的任何修正仍須經 Bar 核准。

## 互動
打卡 `.chk` 勾選→卡片變灰+劃線;toast 回饋 2 秒;摺疊箭頭旋轉動畫 .25s;所有清單觸控列 ≥44px 高。
