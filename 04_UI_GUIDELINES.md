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

## 互動
打卡 `.chk` 勾選→卡片變灰+劃線;toast 回饋 2 秒;摺疊箭頭旋轉動畫 .25s;所有清單觸控列 ≥44px 高。
