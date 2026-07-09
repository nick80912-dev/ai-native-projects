# 日本旅遊 App — README

## 這是什麼
六天五夜日本自駕旅遊的手機 PWA。Google Sheets 當 CMS,單一 HTML 檔 App,部署於 Netlify。
- 正式站:https://okayamatravelteam.netlify.app/
- 使用者:Bar(產品負責人,非工程師)與同行友人
- **權威來源**:程式與文件以 **GitHub 本 repo 為唯一權威**;Google Drive 僅為備份。內容資料來源為 Drive 試算表「261018-261023岡山四國六天五夜」(發布 CSV,見 03/schema.js)。

## 快速開始(給 AI / 開發者)
第一閱讀順序:
`.ai-manifest.json` → `PROJECT_CONSTITUTION.md` → `08_AI_HANDOVER.md` → 相關 `adr/` → 依任務讀 `03_DATABASE.md` / `09_SCHEMA_MAPPING.md` / `05_CODING_RULES.md` / `11_CODING_CONVENTION.md` / `12_DEV_WORKFLOW.md`。

- `.ai-manifest.json`:AI 導航檔,掌握專案全貌
- `PROJECT_CONSTITUTION.md`:專案最高規範與 AI Harness 流程
- `08_AI_HANDOVER.md`:交接重點、禁改事項、常見陷阱
- `adr/`:架構決策,重構或推翻既有設計前必讀
- `03_DATABASE.md`:CMS 資料表快速概覽
- `09_SCHEMA_MAPPING.md`:Schema / CMS 欄位細節
- `05_CODING_RULES.md`:程式規範快速概覽
- `11_CODING_CONVENTION.md`:程式規範細節
- `12_DEV_WORKFLOW.md`:常見任務步驟鏈
- `14_FILE_TIERS_AND_GATE.md`:檔案風險分級與 Gate 保護範圍
- `15_AI_EXECUTION_RULES.md`:AI 決策權限、指令效力、不確定性協議、任務分級
- `16_OPS_PLAYBOOK.md`:回滾手冊與 DevOps 安全規範

## 開發工作流程(必守)
1. Bar 用白話描述需求 → AI 以資深工程團隊身分執行
2. 只做被要求的修改,不重構整個專案
3. 交付順序:**先出「預覽版 HTML」給 Bar 手機驗收 → Bar 說「打包」才產出部署 ZIP**
4. 每次修改需通過 QA(斷網/連網/旅行日情境),更新 `07_CHANGELOG.md`
5. 資料內容改動走 Google Sheets,不改程式;程式只在功能/邏輯變動時修改

## 專案檔案
- `index.html` — 完整 App(CSS+JS 內嵌單檔)
- `sw.js` — Service Worker(離線快取,改版時 bump VERSION)
- `manifest.json` + icon-*.png — PWA 安裝
- 部署方式:Netlify Deploys 頁面直接拖入資料夾
