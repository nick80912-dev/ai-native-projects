# PROJECT CONSTITUTION(專案憲章)

> **本專案遵循 `ai-native-framework@1.0.0`**(私人 repo `nick80912-dev/ai-native-framework`,版本以 `.ai-manifest.json` 的 `framework` 為準)。通用規則寫在框架;本檔只記本專案的差異與專案特定規則。任何 AI 接手前必讀框架 `CONSTITUTION.md` 與本檔。啟動語:「請遵循 ai-native-framework 與本專案的 AI Constitution 開發。」
> 衝突時優先級:**本憲章 > 框架憲章 > ADR > 其他 docs > 對話當下指令**。
> - 「明確覆寫」的認定標準與對話指令效力,依框架 `EXECUTION_RULES.md` §1(本專案細則見 `15_AI_EXECUTION_RULES.md` §1)。
> - **資料規格**類衝突(欄位/gid/型別值)以 `schema.js` 為權威;若 schema.js 與本憲章或 ADR 的原則相衝,停止並回報 Bar。
> - 若本次工作環境讀不到框架 repo:先請 Bar 在新工作階段一併選取 `ai-native-framework`;在此之前只做本檔與 15 明確允許的工作,不得自行推論框架內容。

## 0. 角色
- 依框架 §0。產品負責人 = **Bar**(不寫程式,繁體中文,要直接執行不要教學)。
- AI = 全職工程團隊(CTO/工程師/UI/QA/DevOps 合一)。

## 1. 核心原則
依框架 §1(Schema First、Data Driven、3 秒原則、不過度工程化等),無差異。

## 2. 開發流程
依框架 `WORKFLOW.md`(開工 Gate、A/B/C 任務分級、十三步)。本專案差異:
- 十三步第 2 步的交接文件 = `08_AI_HANDOVER.md`;第 7 步的 Validator = `validator.js` 與 `tools/check-*.js`、`tests/`。
- 任務分級的本專案定義與情境見 `15_AI_EXECUTION_RULES.md` §5 與 `12_DEV_WORKFLOW.md`。
- 介面變更(Bar 2026-11-03):先給截圖,Bar 說「好」之後才跑完整本機測試／CI 並發版。

## 3. 未經 Bar 確認,不得為之
依框架 §3,其中「外部資料來源結構」在本專案 = **修改 Google Sheet Schema**(含 `schema.js` SCHEMA 欄位與型別值)。完整清單:
- 更換技術框架 · 大規模重構 · 破壞相容性的資料模型變更 · 刪除既有功能 · 修改 Google Sheet Schema · 推翻既有 ADR。
- 確有必要時先提框架五段提案,經 Bar 確認才實作。

## 4. 交付規範
依框架 §4。本專案差異:
- 檔案實際分級見 `14_FILE_TIERS_AND_GATE.md`(含 PWA 風險群組)。
- QA 三情境必過(斷網內建 / 連網同步 / 旅行日 mock Date),零 pageerror。
- 交付與驗收於 `dev` 分支完成;正式發版依 `16_OPS_PLAYBOOK.md` §E Release Flow(PR → Bar Review → Bar Merge → Netlify Deploy)。
- 涉及架構變更 → 同步更新 ADR、README、08_AI_HANDOVER、07_CHANGELOG、.ai-manifest.json。

### 4.1 Pre-Work Git Sync Gate
依框架 `WORKFLOW.md` §1。本專案:日常工作分支 = `origin/dev`;未經 Bar 指示,禁止 push 或 merge 至 `main`;正式 Release = Bar 核准之 PR merge(`dev → main`)。

## 5. Token Diet
依框架 §5。首讀 `.ai-manifest.json`;六類日誌的實作在 `validator.js` 的 `AppLog`。

## 6. Project Health Check
依框架 `HEALTH_CHECK.md`。資料一致性由 `window.healthCheck()` 檢測(重複ID/懸空引用/型別覆蓋/資料缺席/TripConfig 值域)。

## 7. 通用性
通用規則已於 2026-11 抽出為 `ai-native-framework`(v1.0.0);本專案為第一個實例。框架升版依框架 README「版本」節,經 Bar 核可才 bump manifest。

## 8. Ops 安全規範(已移出)
本機開發環境清理排程等 DevOps 安全規範,已於 2026-07-09 移至 `16_OPS_PLAYBOOK.md` §B(內容不變);回滾手冊見同檔 §A。
