# 13 Project Status

更新於 2026-07-07。此文件是目前專案規畫進度快照；細節以 `.ai-manifest.json`、`tasks/` 與 `07_CHANGELOG.md` 為準。

## 目前階段

專案已從 V2 CMS / PWA 基礎版，推進到「旅途中首頁 UX」階段。GitHub 最新版已包含首頁下一站模式、完成 / 跳過 / 復原狀態、首頁天氣摘要，以及對應的設計規格與實作計畫文件。

## 已完成

- V2 Schema 驅動 CMS：7 張 Google Sheets、ID 引用、表頭容錯與資料快取。
- AI Harness 治理層：憲章、handover、ADR、工作流程、任務板與 changelog。
- PWA 基礎：Service Worker、離線後備、Netlify 託管規畫。
- 停車引用繼承：支援「停車同Pxxx」並保持 MAP CODE 純顯示。
- 首頁下一站模式：首頁突出下一站，完成 / 跳過狀態存 localStorage，不回寫 CMS。
- 首頁天氣摘要：依下一站推估地點，使用本地快取，不使用 GPS，不改 schema。

## 目前等待

- Bar 手機驗收 GitHub 最新預覽版。
- 確認首頁下一站、完成 / 跳過 / 復原、天氣摘要、購物頁、分帳頁與 7 表同步狀態。
- 驗收通過後，由 Bar 明確說「打包」再進入部署包整理。

## 下一步

1. 手機預覽驗收 `日本行程V2預覽.html`。
2. 若有 UI/資料顯示問題，先修正最小範圍，不動 schema。
3. 驗收通過後整理部署包：外掛 `schema.js` / `validator.js`、更新 `sw.js` 版本與 shell assets、跑離線回歸。
4. 部署到 Netlify 並做線上驗證。

## 風險與注意

- Day3-6 內容仍依 Google Sheet 更新，自動生效；程式端不應硬改資料。
- 天氣摘要是輔助資訊，失敗時應隱藏，不能阻塞首頁。
- 個人狀態只存在 localStorage，不進 CMS。
- 修改核心架構、schema、Google Sheet 欄位、既有 ADR 前，必須先取得 Bar 確認。
