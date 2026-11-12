# 01 專案總覽(定位・里程碑・長期風險)

> 2026-11-12 起本檔合併原 `06_ROADMAP.md`(里程碑)與 `13_PROJECT_STATUS.md`(長期風險),兩檔已刪除(git 歷史保留)。
> **即時狀態**(線上版本、dev、待驗收)的唯一權威是 `tasks/current.md`;正式待辦看 `tasks/backlog.md`;逐版紀錄看 `07_CHANGELOG.md`。本檔不複述這些會變的東西。

## 願景
不是「行程檢視器」,是**旅途中的隨身旅行助理**。旅行當下唯一需要打開的 App。

## 產品哲學(每個功能實作前必問)
1. 旅途中真的會用到嗎?
2. 有沒有減少點擊次數?
3. 能在 3 秒內找到資訊嗎?

答案是否 → 不做,移到下一版。Less, But Better。避免過度工程化:資訊該留在文件(PDF/官網)就給快速連結,不硬轉結構化資料。

## 目標使用者
Bar 與同行友人(一般旅客,iPhone 為主)。旅途中單手、走路、訊號差的使用情境。

## 範圍
- 四大分頁:今天(下一站)/ 行程(卡片時間軸)/ 購物(樓層＋想逛清單)/ 分帳。
- 內容全部來自 Google Sheets(行程、地點、餐廳、購物、住宿、支出、TripConfig;選填分頁:天氣地區、行前清單、航班 —— ADR 0022)。修訂走 Sheet,即時生效免改程式。
- 離線可用(PWA 三層防線:版本綁定的內建資料 → 快取 → 背景同步)。
- 團體帳經 Apps Script 跨裝置同步(ADR 0006/0007);個人帳、打卡、想逛與採買只存手機。
- 旅程生命週期:個人旅程可封存到自己的 Google Drive 唯讀回顧(ADR 0020);可連接下一趟旅程的 Sheet(ADR 0021),每趟有自己的幣別、稅與天氣地區。
- 七組淺色主題,含繪本／和紙(ADR 0008)。

## 已明確排除
AI 聊天／推薦、帳號系統、雲端多人協作(以 Google Sheets 共編替代;團體帳的 Apps Script 同步是唯一例外)、推播通知、社群功能、GPS 距離、行程「必去」標籤(Bar 2026-11-12)、團體帳退稅追蹤(Bar 2026-11-12)。

## 里程碑(已完成)
- 基礎版:試算表→手機頁、離線內建、三層防線、WebView 相容修正。
- PWA:manifest＋SW(App Shell 依版本 generation 原子安裝,ADR 0019)、Netlify 部署、可安裝。
- V1:今天模式、自駕化、型別卡片、停車 MAPCODE、渡輪卡、購物模式、分帳儀表板。
- V2 CMS 化:Sheet 資料庫、ID 引用(Pxxx/Rxxx/Sxxx/Hxxx)、TripConfig;住宿以 HID 關聯(ADR 0017)。
- 治理層:檔案風險分級(14)、AI 執行規範(15)、Ops Playbook(16);2026-11 通用規則抽出為 `ai-native-framework` v1.0.0。
- 岡山四國旅程實際使用(2026-10-18–10-23)與回程後修正。
- 不限日本:每趟自己的幣別、稅與天氣(v168–v170、v183)。
- 收據照片(v167)、雲端辨識(v171–v177)、個人帳退稅追蹤(v177–v182)。
- 介面整理:疑難排解頁、線條圖示、繪本主題、大圓角(v185–v187)。
- 行前:行前清單與行李(v184、v188)、航班卡(v188)。

## 下一階段
1. 下一趟旅程:依 `docs/new-trip-handbook.md` 填好試算表副本並連接(ADR 0021)。
2. 其餘依 `tasks/backlog.md`。

## 長期風險與注意(與版本無關)
- 內容修訂一律走 Google Sheets,程式端不硬改資料。
- 天氣、航班、行前清單這類選填資料讀取失敗時應隱藏或沿用上次,不阻塞首頁。
- 個人狀態只存 localStorage,不進 CMS;採買與收據照片 Blob 只存目前裝置 IndexedDB,不進備份或跨裝置同步。
- 住宿關聯只用 `Places.HID → Hotels.HID` 精確對應(ADR 0017);名稱只供顯示。
- 修改核心架構、schema、Google Sheet 欄位、既有 ADR、或 14 定義的高風險檔案前,必須先取得 Bar 確認。
- `sw.js`、`shell/v188/app-version.js` 與 `netlify.toml` 的 cache header 屬同一 PWA 風險群組(見 14);升版時版本字串必須同步,否則 `tools/check-app-version.js` 會失敗。
- 文件裡的 `shell/vNNN` 路徑由 `tools/check-doc-generation.js` 守住,活文件不得停在舊 generation;歷史文件(`adr/`、`07_CHANGELOG.md`、`docs/archive/`、`tasks/done.md` 等)豁免。
- Git 推送與自動驗證**都不等於**正式站部署,也不等於 Bar 的實機驗收 —— 三者必須分別確認。
