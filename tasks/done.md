# DONE(已完成)

> 更新於 2026-07-13。完成事項來自 `.ai-manifest.json` status.done 與既有 CHANGELOG;細節仍以 07_CHANGELOG.md 為準。

## 已完成
- V2 Schema 驅動 CMS:7 張 Google Sheets、ID 引用、Restaurants/Shopping/Hotels/Expenses/TripConfig。
- AI Harness 治理層:PROJECT_CONSTITUTION、10_FOLDER_STRUCTURE、11_CODING_CONVENTION、12_DEV_WORKFLOW、adr/0001-0005、健康檢查規範。
- 停車引用繼承:「停車同Pxxx」完整繼承與 MAP CODE 純顯示。
- PWA 離線基礎:三層防線、Service Worker、Netlify 託管。
- 首頁下一站模式:首頁只突出下一站,完成 / 跳過 / 復原狀態存 localStorage,不回寫 CMS。
- 首頁天氣摘要:依下一站資料推估地點,顯示簡短天氣 chip,失敗時不影響首頁。
- Restaurants 補欄位:R001 麵酒一照庵與 R006 上野商店的 Tabelog 評分 / 營業時間已在 Google Sheet 發布 CSV 確認。
- 購物頁多地點切換:GitHub `origin/main` 已確認包含 `Places.Type=購物` 來源、`全部 / 想逛 / 各購物地點` 切換與「區域 / 樓層」文案。
- 框架抽取計畫已歸檔:`FUTURE_PLAN_framework-extraction.md`。

## 文件治理
- 2026-07-13:Netlify 雙站架構上線(`main`=正式站、`dev`=測試站)，兩站部署與瀏覽器狀態完全隔離。
- 2026-07-10:修復批交付(事故處理規範 §C、雙通道 SOP §D、檢查器三新規則、CI 全測試涵蓋、測試檔治理)。
- 2026-07-09:下一站邏輯統一為時間判斷 + 自動略過過期項目(修復卡住不推進的 bug)+ 明日預告規則修正 + 新增 pick-next-stop 測試。細節見 07_CHANGELOG。
- 2026-07-09:Sanity CI 上線(qa.yml + check-doc-titles.js,防上傳錯位)+ README 閱讀順序補 15/14/16 + done.md 日期修正。
- 2026-07-09:治理層 v2 修正交付(狀態收斂、文件權威=GitHub、00 定位歷史快照、新增 14/15/16、tests 交付必附規則、憲章與 manifest 同步)。細節見 07_CHANGELOG。
- 2026-07-08:依 Bar 最新決策更新任務板:先等 Day4-6 Sheet 補完,再手機驗收、打包與 Netlify。
- 2026-07-07:GitHub 最新資料同步後,新增 project status 並更新任務板規畫進度。
- 2026-07-06:Codex Ready 文件一致性修正,對齊 README / handover / task board / changelog。
