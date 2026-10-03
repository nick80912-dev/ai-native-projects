# UI Font Audit — 2026-10-03

範圍：TripPilot A，v142 本機候選版，正式站仍 v141。依使用者要求不做全站放大、不改主題 token、間距、主要金額或主操作。前端設計原則用於維持既有視覺層級，不做重新設計。

## 盤點與裁定

宣告尺寸來自 v141 CSS；computed 僅對已建立 DOM 的 fixture 實測，不以宣告冒充實測。未測候選保留，不因盤點而全部調整。

| 九組候選 | 原宣告／實測 | A 調整／保留 |
| --- | --- | --- |
| 日期星期、旅程分頁副標 | 星期 9.5px（computed）；分頁副標 10.5px（宣告） | 星期 11px；副標保留 |
| 今天摘要標籤／副值 | 標籤 9px；副值 10px（宣告） | 標籤 11px（computed）；副值保留 |
| 住宿／交通標籤 | 10.5px（宣告，未做各狀態實測） | 保留 |
| 完成相關小徽章 | 自動略過 10px（宣告） | 保留文字與原因；未做全面徽章放大 |
| 店家分類、必買、免稅標籤 | 分類 10px，其餘 9.5–10px（宣告） | 保留，需獨立畫面證據 |
| 商品關聯、分類、附加標籤 | 9.5–10.5px（宣告） | 保留；只調整下列帳務上下文 |
| 最近帳務附加字／小徽章 | 代買前後字 8.5px、對象 9px（computed）；其他徽章 9px（宣告） | 代買前後字與對象 11px（computed）；其他徽章保留 |
| 匯率、代買說明、選項副標 | 9–10px（宣告） | 保留，避免擴大表單調整 |
| 回顧時間／狀態、健康摘要 | 約 10px（宣告） | 保留，未變更回顧／健康字體 |

實際 CSS selector 僅四個：`.day-chip .dow`、`.today-hero-summary-label`、`.ledger-recent-context .shopping-target-affix`、`.ledger-recent-context .shopping-target-badge`。新增最後一段明確 selector override，不覆蓋整站 `small`、`span` 或 `input`。

## 可重跑畫面證據

`tests/browser/ui-ux-hardening.spec.js` 的三個 supporting text 測試，320／375／390px，各輸出 `trip-font-v142.png`、`ledger-font-v142.png`、`text-resize-150-<width>.png` 到該次 Playwright artifacts；390px 另輸出六主題 `ledger-theme-*.png`。截圖非固定 golden image；每次完整 QA 會重產。

星期 RED：computed 9.5px 不符合 11px；帳務 RED：前後字 8.5px 不符合 11px。GREEN 檢查星期／摘要標籤／代買上下文字級，body 15px、設定按鈕 44px、明細輸入 16px 保留。大額測試使用 JPY 9,999,999／TWD 2,222,222 與長中文商店、品項及代買對象；既有 proxy-inline 三寬度幾何測試保留兩列、截斷、金額及選單空間斷言，只更新實際字級期望。

文字放大用實際 DOM computed 字體乘 1.5，不以 deviceScaleFactor 冒充。測試證明字體確有增加、文件無水平溢位；不能代表所有系統字型／瀏覽器設定皆已通過。Enter 展開／aria-expanded／焦點、既有店家 Space／Enter 與重繪焦點測試保留。iPhone／Android 系統大字、VoiceOver／TalkBack、外接鍵盤與實體 PWA 仍待人工驗收。

## 交付限制

桌面人工截圖對照：ocean／ivory／cedar／mist／tea／wisteria 六張 390px 帳務畫面已逐張檢視；代買摘要仍單行截斷，沒有擠出金額及右側選單。不同配色仍沿用原 token，沒有在這次字體調整中改顏色。自動略過 toast 是測試旅行日的原有提示，不代表新增健康告警。

未引入 12px 全域最低值。長代買名稱仍可截斷；完整名稱保留於詳情與可及名稱。六主題截圖與完整 QA／獨立審查結果完成後記錄於 `tasks/current.md`，此文件本身不宣稱發布或真機驗收完成。
