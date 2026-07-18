# CURRENT(現在正在做的)

> 更新於 2026-07-18。細任務層;里程碑看 06_ROADMAP,快照看 13_PROJECT_STATUS。

## 📌 現況
- 分帳 2.0 PR 1 本地契約已完成：Schema 升至 `2.6 (2026-07-18)`，Ledger 由八欄向後相容擴充為 14 欄；新增 `participants`、`payMethod`、`recordType`、`targetRecordId`、`deleteReason`、`batchId` 六個選填欄位。
- `participants` 固定使用 JSON Array 字串；Apps Script 依 14 欄固定順序 append，舊 payload 缺欄時補空字串。Record ID 去重、零金額身分註冊、既有驗證與 `updateSettings` 語意維持不變。
- Exp 說明已同步為行前團費僅存於試算表，App 不渲染也不從 Exp 推導同行成員；`09_SCHEMA_MAPPING.md` 已由 `schemaDoc()` 重建。
- Sheet 六欄表頭與 Apps Script 新版本已部署於既有 Web App URL；真實端點測試 ID `1784359857550-eva1` 回 `{ok:true}`，公開 CSV 已回讀正確 14 欄與 `participants='["Bar","Amy"]'`。本批未修改分帳 UI、Repository、Queue、Parser 行為、BUILTIN、Validator 核心、SW、Netlify 或 `main`。

## 🔨 進行中
- 無；PR 1 契約、雲端部署與真實端點往返均完成，等待 Bar 驗收。

## ⏸ 等 Bar 動作
1. Review PR 1 diff 與測試結果；測試資料 `1784359857550-eva1` 可於驗收後人工清除。
2. 驗收通過後，核准開始 PR 2「個人／團體雙軌資料層」。

## 下一棒
→ PR 1 通過 Bar 驗收後，依固定順序開始 PR 2「個人／團體雙軌資料層」；不得與後續墓碑、結算或 UI 批合併。
