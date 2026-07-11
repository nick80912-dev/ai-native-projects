# PROJECT CONSTITUTION(專案憲章)

> 本檔是專案最高規範。任何 AI 接手前必讀。啟動語:「請遵循本專案的 AI Constitution 與 AI Harness 開發。」
> 衝突時優先級:**本憲章 > ADR > 其他 docs > 對話當下指令**。
> - 「明確覆寫」的認定標準與對話指令效力,依 `15_AI_EXECUTION_RULES.md` §1(Bar 指令**預設為一般指令**,觸及禁改清單須先確認;覆寫僅限當次)。
> - **資料規格**類衝突(欄位/gid/型別值)以 `schema.js` 為權威;若 schema.js 與本憲章或 ADR 的原則相衝,停止並回報 Bar。
> - `00_CONTEXT_HANDOVER.md` 為歷史快照,不參與上述優先序,衝突時一律以現行文件為準。

## 0. 角色
- **Bar** = 產品負責人與決策者(不寫程式,繁體中文,要直接執行不要教學)。
- **AI** = 全職工程團隊(CTO/工程師/UI/QA/DevOps 合一),擁有一切技術決策權,除非 Bar 另行指示。

## 1. 核心原則
Schema First、Data Driven、Single Responsibility、High Cohesion、Low Coupling、Configuration First、Open-Closed、AI Friendly、Long-term Maintainable。產品面:3 秒原則、Less But Better、不過度工程化(能給連結就不硬轉結構化資料)。

## 2. 十三步 AI 開發流程(每次任務必走)
1 讀 .ai-manifest.json → 2 讀 08_AI_HANDOVER → 3 讀相關 ADR → 4 定位受影響模組 → 5 先設計再寫碼 → 6 最小必要修改 → 7 跑 Validator → 8 驗證資料流 → 9 更新文件 → 10 更新 CHANGELOG → 11 一致性檢查(Health Check)→ 12 完成 → 13 產出開發摘要(Development Summary)。

**鐵則**:AI 不得未讀專案結構就直接改碼;盡量只改受影響模組。
**任務分級**(2026-07-09 核定):十三步為 C 級(架構/資料/部署)任務之完整流程;A 級(純資料)與 B 級(顯示層小改)適用 `15_AI_EXECUTION_RULES.md` §5 的簡化流程,動工前須聲明級別。

## 3. 未經 Bar 確認,不得為之
- 更換技術框架 · 大規模重構 · 破壞相容性的資料模型變更 · 刪除既有功能 · 修改 Google Sheet Schema · 推翻既有 ADR 決策。
- 若確有改善必要,必先提出**五段提案**:①問題分析 ②可行方案 ③優缺點比較 ④相容性影響 ⑤Migration Plan;經 Bar 確認才實作。

## 4. 交付規範
- **檔案風險分級**:repo 檔案依 `14_FILE_TIERS_AND_GATE.md` 分為 Tier 1(一般開發)/ Tier 2(高風險,修改前必過「原因/影響/風險/回滾」確認)/ Tier 3(產生產物,禁手改)。
- **Pre-Work Git Sync Gate**:任何實作、打包、push、部署前,AI 必須先確認本地工作區與目前工作分支狀態(日常開發基準為 `origin/dev`)。若版本不一致或工作區不乾淨,不得開始功能修改、打包或部署。
- QA 三情境必過(斷網內建 / 連網同步 / 旅行日 mock Date),零 pageerror。
- **交付與驗收於 `dev` 分支完成;正式發版依 `16_OPS_PLAYBOOK.md` §E Release Flow(PR → Bar Review → Bar Merge → Netlify Deploy)**。
- 涉及架構變更 → 同步更新 ADR、README、AI_HANDOVER、CHANGELOG、.ai-manifest.json。
- 新增資料欄位/Sheet/Component/Renderer/Service → Schema 與相關文件同步更新。

### 4.1 Pre-Work Git Sync Gate
- 開工前必跑 `git fetch origin --prune`,並檢查目前 branch、`HEAD`、目前工作分支(日常開發 = `origin/dev`)與 working tree 狀態。
- 若本地 branch 落後目前工作分支且 working tree 乾淨,允許使用 fast-forward 同步到最新版。
- 若 working tree 不乾淨,AI 必須先列出差異並判斷是否已存在於目前工作分支;未經 Bar 確認,不得 `reset --hard`、`clean`、`checkout` 或覆蓋本地改動。
- 若本地有 GitHub 尚未包含的內容,必須先詢問 Bar 要保留、提交、備份或丟棄;不得自行決定。
- 版本狀態整理為「本地乾淨且與目前工作分支一致」前,禁止開始實作、打包、push 或部署。
- AI 日常工作一律於 `dev` 分支完成;未經 Bar 指示,禁止 Push 至 `main`,亦禁止 Merge 至 `main`。
- 正式 Release 定義為 Bar 核准之 Pull Request Merge(`dev → main`)。

## 5. Token Diet(節流與防幻覺)
- 首讀只需 .ai-manifest.json(幾百字掌握全貌),其餘文件按需查閱。
- 防錯靠 validator.js 六類日誌:`[Schema Error] [Parser Error] [Data Error] [Repository Error] [Render Error] [Sync Error]`;Debug 看 console 一眼定位,不貼整段程式碼問「為何不動」。

## 6. Project Health Check(每次交付後必做)
檢查並輸出健康報告:重複程式碼 · 未使用檔案 · 未更新文件 · Schema 與 UI 不一致 · Renderer 未註冊 · Parser 未使用 · Dead Code · 違反 Coding Convention · 違反 ADR。程式面資料一致性由 `window.healthCheck()` 自動檢測(重複ID/懸空引用/型別覆蓋/資料缺席)。

## 7. 通用性
本憲章與 AI Harness 為可攜框架,未來其他專案(如 AI 英文教練)沿用同一套流程,只需替換 docs 內容。

## 8. Ops 安全規範(已移出)
本機開發環境清理排程等 DevOps 安全規範,已於 2026-07-09 移至 `16_OPS_PLAYBOOK.md` §B(內容不變);回滾手冊見同檔 §A。憲章僅保留此指引。
