# CURRENT(現在正在做的)

> 更新於 2026-07-18。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.0 PR 2 已完成雙軌資料層：預設個人帳只寫 `trip_personal_ledger`，團體帳維持 Ledger Repository、Queue、Retry 與跨裝置同步；兩軌列表、筆數與總額隔離。
- TEST 模式只影響團體帳。團體一般支出保存支付方式、`recordType=expense` 與註冊成員 JSON 快照；身分註冊保存 `recordType=identity_registration`。個人明細即使以 `[TEST]` 開頭仍正常計入個人總額。
- 設定頁可管理預設／自訂類別與支付方式，支援 trim、非空、最長 6 字、去重、刪除與上下排序；歷史未知值維持顯示。
- 備份升至 version 2，加入個人帳與兩份自訂清單；version 1 安全相容，無效 JSON 或 localStorage 寫入失敗不覆蓋現有資料。SW cache 已升至 v19。
- 390px 本機 QA 已通過四分頁、雙軌切換、個人本機保存、團體隔離、自訂類別新增／刪除與 Settings；無水平溢出，browser error 為 0。
- 公開 Ledger CSV 另有四筆先前移動欄位留下的錯位身分註冊資料：`1784340861362-ps5u`、`1784341033589-0zh3`、`1784341935496-1mn8`、`1784342199638-6m9j`。本批未自動修改 Sheet；Bar 可於驗收時人工刪除或修正。
- 本批未修改 Schema、Validator、Apps Script、Google Sheet、BUILTIN、Netlify、墓碑、結算或完整儀表板。

## 🔨 進行中
- 無；PR 2 自動測試與 390px 瀏覽器 QA 已完成，等待 Bar 驗收。

## ⏸ 等 Bar 動作
1. PR 2 push 後以手機驗收個人／團體切換、個人離線保存、團體待同步、自訂選項與備份還原。
2. 驗收通過後核准開始 PR 3「個人真刪與團體墓碑刪除」。

## 下一棒
→ PR 2 通過 Bar 驗收後，依固定順序開始 PR 3；不得與結算或完整 UI 批合併。
