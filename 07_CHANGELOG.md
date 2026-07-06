# 07 版本紀錄

紀錄格式:日期 / 版本 / 重點。細節不展開,新變更往上加。

## 2026-07-05 — V2.1(停車強化)
- 停車面板移除複製鈕,MAP CODE 26px 大字純顯示
- 新增 resolveParking():「停車同Pxxx」完整繼承(MAPCODE/停車費/停車備註;深度上限3;引用不存在→原文+console.warn)

## 2026-07-05 — V2(CMS 架構)⭐ 架構變更
- 資料層改為 7 張 Google Sheets(行程/Places/Restaurants/Shopping/Hotels/Expenses/TripConfig),表頭別名容錯解析
- 行程 7 欄制(新增 ID 欄),Pxxx/Rxxx 引用 + 名稱備援
- 卡片型別改由 Places.類型 明確驅動;渡輪卡簡化(末班船欄+官方時刻表連結,移除內建 206 班次)
- Restaurants 掛 Place 自動列出;Shopping 表驅動購物頁;分帳新增行前團費卡
- 每張表獨立快取與內建後備;同步徽章新增「部分更新」

## 2026-07-04 — V1(旅行助理化)
- 今天模式:下一站=第一個未打卡;自駕化(TripConfig 開關);型別卡片+快速動作列
- 停車卡(MAPCODE)、渡輪卡、購物模式(樓層摺疊/想逛/搜尋)、分帳儀表板(含日期)
- 修復:renderSplit 包裝造成的無限遞迴(改名 renderSplitCore)

## 2026-07-04 — PWA ⭐ 架構變更
- Netlify 託管(解決 file:// 沙盒);manifest+sw.js(Shell=SWR、資料=網路優先);可安裝 iPhone/Android/Desktop

## 2026-07-03~04 — 基礎版
- 試算表(發布CSV)→ 手機頁;三層防線(內建→快取→背景同步)
- WebView 相容:console polyfill、fetch clone 錯誤退回、吸頂容器合一(修重疊)
