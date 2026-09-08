# TripPilot UI/UX v112 Design

## Goal

讓旅行前與旅行中的主要畫面更快讀、更少阻礙，並修正導覽方式與目的地國家判斷，同時維持既有四分頁、資料 Schema、Ledger 與離線契約。

## Approved scope

1. 行程導覽依單一行程項目的 `move` 文案選擇 walking／driving／transit；無明確提示才回退 TripConfig 的全域交通方式。
2. 台灣機場目的地不得附加「日本」；日本境內的 exact／nearby 查詢維持日本地區限定。
3. 行程卡以可解析的 Place／Restaurant 名稱或 `place` 為主標題，`act` 與時間降為次要資訊；不可解析時保留原有活動名稱，避免空白卡片。
4. 樓層、營業時間與等同重要的輔助資訊至少 13px，維持既有色票與六主題語意 token。
5. App 啟動不再強迫選身分；第一次進入「分帳」或執行依賴身分的 Ledger 動作時才開啟既有身分選擇器。既有已選身分不受影響。
6. Shopping／Ledger 無資料時顯示置中的主要 CTA；有資料時維持現有工具列與 FAB。
7. 出發前首頁保留倒數、日期、採買摘要與完整行程入口；Day 1 預覽縮成兩個主要目的地並顯示剩餘站數，六日摘要改以目的地優先。
8. 建立不可變 `v112` App Shell；root v110 bridge 維持 byte-identical，BUILTIN 只由既有 generator 產生。

## Non-goals

- 不改 Google Sheet、`schema.js`、資料欄位、Ledger repository、結算或同步語意。
- 不處理個人狀態還原原子性或天氣記憶體快取問題。
- 不加入 framework、套件、icon font 或新的全域 store。
- 不重新設計四分頁與既有六主題。

## Android acceptance

- Manifest 具備 `start_url`、standalone display、192／512 與 maskable icons。
- Service Worker 可在 Chromium Android 等效環境安裝、控制、離線重新載入 current generation。
- 以 390×844 touch viewport 驗證首頁、行程、採買、分帳與空狀態無水平 overflow、無 pageerror。
- 真機的「加入主畫面」提示與廠牌 WebView 差異仍列為裝置驗收，不把桌面模擬宣稱為真機證據。

## Rollback

發布前可直接撤回 v112 變更；若 v112 已被 Service Worker 接管，必須以最後正常內容建立下一個未使用版本 forward bump，不倒退版本、不刪除 `sw.js`。
