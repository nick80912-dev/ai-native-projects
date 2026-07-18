# CURRENT(現在正在做的)

> 更新於 2026-07-18。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.0 PR 4 已完成純函式結算核心：participants JSON 快照解析、最大餘數整數分配、每人雙幣已付／應付／淨額與確定性貪婪轉帳建議；不依賴 DOM 或目前成員名單。
- JPY／TWD 分開計算，分配總和與淨額總和維持守恆；同額 tie-break 使用正式註冊順序，其次正規化名稱。同一輸入產生相同結果，不宣稱全域最少轉帳次數。
- 缺失或無效 participants、負數、非整數及超出安全整數範圍的金額會 `console.warn`、列為資料異常並原子排除；墓碑、被刪除紀錄、身分註冊、TEST、個人帳與舊版非 expense 紀錄不參與結算。
- 分帳 2.0 PR 3 已完成個人真刪與團體墓碑刪除：個人帳確認後直接移除本機紀錄；團體帳以必填原因的 `recordType=deletion` 墓碑保留共享稽核軌跡。
- 墓碑與目標紀錄由單一有效紀錄解析器排除於列表、筆數及總額；重複墓碑冪等，非法目標安全忽略並警告。身分註冊、墓碑及已刪除紀錄均無刪除入口。
- 舊負數沖銷 UI 與建立邏輯已移除，既有負數歷史紀錄仍可讀取並維持原有金額效果；離線墓碑沿用 Ledger Repository、Queue、Retry，送達後以本機 bridge 銜接至公開 CSV 更新。
- TEST 模式只影響團體帳。團體一般支出保存支付方式、`recordType=expense` 與註冊成員 JSON 快照；身分註冊保存 `recordType=identity_registration`。個人明細即使以 `[TEST]` 開頭仍正常計入個人總額。
- 設定頁可管理預設／自訂類別與支付方式，支援 trim、非空、最長 6 字、去重、刪除與上下排序；歷史未知值維持顯示。
- 備份升至 version 2，加入個人帳與兩份自訂清單；version 1 安全相容，無效 JSON 或 localStorage 寫入失敗不覆蓋現有資料。SW cache 已升至 v19。
- 390px 本機 QA 已通過個人刪除入口、團體墓碑對話框、原因必填阻擋與取消流程；無水平溢出，browser error 為 0，未送出團體墓碑。
- 公開 Ledger CSV 另有四筆先前移動欄位留下的錯位身分註冊資料：`1784340861362-ps5u`、`1784341033589-0zh3`、`1784341935496-1mn8`、`1784342199638-6m9j`。本批未自動修改 Sheet；Bar 可於驗收時人工刪除或修正。
- 本批未修改 Schema、Validator、Apps Script、Google Sheet、BUILTIN、SW、Netlify、結算或完整儀表板。

## 🔨 進行中
- 無；PR 4 純函式實作與自動測試已完成，等待 Bar 驗收。

## ⏸ 等 Bar 動作
1. Review PR 4 的 participants 異常排除、雙幣守恆、tie-break 與轉帳建議測試。
2. 驗收通過後核准開始 PR 5 UI 批次；不得回頭重寫 PR 4 計算邏輯。

## 下一棒
→ PR 4 通過 Bar 驗收後，依固定順序開始 PR 5。
