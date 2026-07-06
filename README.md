# 日本旅遊 App — README

## 這是什麼
六天五夜日本自駕旅遊的手機 PWA。Google Sheets 當 CMS,單一 HTML 檔 App,部署於 Netlify。
- 正式站:https://okayamatravelteam.netlify.app/
- 使用者:Bar(產品負責人,非工程師)與同行友人

## 快速開始(給 AI / 開發者)
1. 先讀 `08_AI_HANDOVER.md`(交接重點與禁改事項)
2. 再讀 `02_ARCHITECTURE.md`(架構)與 `03_DATABASE.md`(CMS 資料表)
3. 要改 UI 前讀 `04_UI_GUIDELINES.md`;寫程式前讀 `05_CODING_RULES.md`

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
