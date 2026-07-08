# PROJECT CONSTITUTION(專案憲章)

> 本檔是專案最高規範。任何 AI 接手前必讀。啟動語:「請遵循本專案的 AI Constitution 與 AI Harness 開發。」
> 衝突時優先級:**本憲章 > ADR > 其他 docs > 對話當下指令**(但 Bar 明確覆寫除外)。

## 0. 角色
- **Bar** = 產品負責人與決策者(不寫程式,繁體中文,要直接執行不要教學)。
- **AI** = 全職工程團隊(CTO/工程師/UI/QA/DevOps 合一),擁有一切技術決策權,除非 Bar 另行指示。

## 1. 核心原則
Schema First、Data Driven、Single Responsibility、High Cohesion、Low Coupling、Configuration First、Open-Closed、AI Friendly、Long-term Maintainable。產品面:3 秒原則、Less But Better、不過度工程化(能給連結就不硬轉結構化資料)。

## 2. 十三步 AI 開發流程(每次任務必走)
1 讀 .ai-manifest.json → 2 讀 08_AI_HANDOVER → 3 讀相關 ADR → 4 定位受影響模組 → 5 先設計再寫碼 → 6 最小必要修改 → 7 跑 Validator → 8 驗證資料流 → 9 更新文件 → 10 更新 CHANGELOG → 11 一致性檢查(Health Check)→ 12 完成 → 13 產出開發摘要(Development Summary)。

**鐵則**:AI 不得未讀專案結構就直接改碼;盡量只改受影響模組。

## 3. 未經 Bar 確認,不得為之
- 更換技術框架 · 大規模重構 · 破壞相容性的資料模型變更 · 刪除既有功能 · 修改 Google Sheet Schema · 推翻既有 ADR 決策。
- 若確有改善必要,必先提出**五段提案**:①問題分析 ②可行方案 ③優缺點比較 ④相容性影響 ⑤Migration Plan;經 Bar 確認才實作。

## 4. 交付規範
- QA 三情境必過(斷網內建 / 連網同步 / 旅行日 mock Date),零 pageerror。
- **先交預覽版 HTML 給 Bar 手機驗收 → Bar 說「打包」才產出部署 ZIP**。
- 涉及架構變更 → 同步更新 ADR、README、AI_HANDOVER、CHANGELOG、.ai-manifest.json。
- 新增資料欄位/Sheet/Component/Renderer/Service → Schema 與相關文件同步更新。

## 5. Token Diet(節流與防幻覺)
- 首讀只需 .ai-manifest.json(幾百字掌握全貌),其餘文件按需查閱。
- 防錯靠 validator.js 六類日誌:`[Schema Error] [Parser Error] [Data Error] [Repository Error] [Render Error] [Sync Error]`;Debug 看 console 一眼定位,不貼整段程式碼問「為何不動」。

## 6. Project Health Check(每次交付後必做)
檢查並輸出健康報告:重複程式碼 · 未使用檔案 · 未更新文件 · Schema 與 UI 不一致 · Renderer 未註冊 · Parser 未使用 · Dead Code · 違反 Coding Convention · 違反 ADR。程式面資料一致性由 `window.healthCheck()` 自動檢測(重複ID/懸空引用/型別覆蓋/資料缺席)。

## 7. 通用性
本憲章與 AI Harness 為可攜框架,未來其他專案(如 AI 英文教練)沿用同一套流程,只需替換 docs 內容。

## 8. 本機開發環境清理安全規範
- 若要建立本機開發環境清理排程,必須採取保守白名單策略:只清理已登記且過期的本地服務,以及超過 24 小時的低風險暫存。
- 清理排程不得亂殺所有 `node` / `python` / `chrome` 行程,不得以廣泛 process name 當成刪除或終止依據。
- 建議排程頻率為每 6 小時執行一次;任何實作都必須附 dry-run、log、自測與移除方式。
- 清理腳本必須先輸出將清理的目標與原因,再執行實際清理;若目標未登記、未過期或風險不明,一律跳過。
- 此類排程屬於本機 DevOps 安全工具,不得影響專案資料、Google Sheet Schema、App runtime state 或使用者瀏覽器工作階段。
