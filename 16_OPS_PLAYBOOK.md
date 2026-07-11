# 16 Ops Playbook(回滾手冊 · DevOps 安全規範)

> 由 Bar 於 2026-07-09 核准。回滾章節為新增;清理排程安全規範自 PROJECT_CONSTITUTION §8 移入(憲章保留指引連結)。

## A. 回滾手冊(部署出事時的逃生路線)

### A1. Netlify 部署回滾(最常用)
1. Netlify 後台 → 該 site → **Deploys** 頁。
2. 找到上一個正常的 deploy → 點入 → **Publish deploy**(即時切回舊版,無需重新上傳)。
3. 回滾後在 07_CHANGELOG 記錄:回滾時間、原因、退回的版本。
> Netlify 每次部署皆保留快照,拖放部署也一樣可回滾;這是本專案的第一逃生門。

### A2. Service Worker 快取災難
- 症狀:回滾後使用者仍看到壞版(SW 快取住舊 Shell)。
- 處理:回滾目標包的 `sw.js` VERSION 必須與線上現行**不同**(往前 bump,如 v3 壞 → 出 v4 內容等同 v2),觸發清舊快取;「開兩次生效」限制仍在。
- 使用者端急救口令:iPhone Safari → 設定 → Safari → 清除網站資料;或改用無痕視窗確認線上版本。
- **禁止**以刪除 sw.js 作為回滾手段(舊 SW 仍註冊在使用者裝置,會造成不可控狀態)。

### A3. Google Sheet 內容誤改
1. Sheet → 檔案 → **版本記錄 → 查看版本記錄** → 還原到誤改前版本。
2. 還原屬全表操作,會覆蓋還原點之後的所有編輯;多人共編時先在群組知會。
3. App 端無需動作:下次同步自動帶回正確資料;離線使用者在下次連網同步後恢復。

### A4. 文件/程式碼(GitHub)
- 任何檔案退回:`git revert <commit>`(保留歷史,禁用 `reset --hard` 覆蓋遠端,呼應憲章 4.1)。

## B. 本機開發環境清理排程安全規範(自憲章 §8 移入,內容不變)
- 清理排程必須採保守白名單策略:只清理**已登記且過期**的本地服務,以及**超過 24 小時的低風險暫存**。
- 「服務登記檔」定義:建立排程前,必須先建立明確的登記檔(如 `~/.dev-services-registry.json`),記錄服務名稱、PID/port、啟動時間、專案來源與過期條件;**未登記者一律不得清理**。
- 不得亂殺所有 `node` / `python` / `chrome` 行程,不得以廣泛 process name 當成刪除或終止依據。
- 建議頻率每 6 小時一次;任何實作必附 dry-run(預設第一步)、log(時間/動作/目標/理由/結果)、自測(未登記不清、未過期不清、僅逾 24h 低風險暫存才清)與移除方式。
- 清理腳本必須先輸出將清理目標與原因再執行;目標未登記、未過期或風險不明,一律跳過。
- 此類排程屬本機 DevOps 安全工具,不得影響專案資料、Google Sheet Schema、App runtime state 或使用者瀏覽器工作階段。

## C. 事故處理(Incident Response)(2026-07-10 由 Bar 核准)
**觸發條件**:GitHub Actions 紅燈、核心檔案缺失/錯位、repo 狀態與預期不符、部署後線上異常。
**鐵則:紅燈 = 停止。** CI 紅燈期間,禁止開始任何新功能、新文件、新交付;修復優先於一切。
**標準動作**:
1. 停止新工作,確認事故範圍(哪個 commit、哪些檔案)。
2. 修復(依 §A 回滾或重新上傳正確檔案)。
3. 驗證:Actions 轉綠 + AI 端 clone 核對通過,才算修復完成。
4. 事後在 07_CHANGELOG 記一筆 incident:時間、原因、影響、修復方式(不追究、只留痕,供未來防範)。
**通知**:GitHub 預設會將 Actions 失敗通知寄到 commit 者信箱;Bar 每次上傳後應等待並確認 Actions 綠勾(約 1 分鐘),綠了才離開。

## D. 雙通道交付 SOP(GitHub Desktop 為主、網頁上傳為輔)(2026-07-10 由 Bar 核准)
兩通道並行,防呆規則如下:
| 情境 | 使用通道 |
|---|---|
| 多檔交付(2 檔以上、含資料夾、含隱藏檔) | **GitHub Desktop**:解壓 ZIP 覆蓋本機 repo 資料夾 → Desktop 檢視 diff(逐檔確認,特別留意「刪除」紅字)→ Commit → Push 至 `dev` |
| 單檔小修(貼上內容、改一行) | 網頁編輯(鉛筆)可 |
| 刪除檔案 | **一律 GitHub Desktop**(diff 會明確顯示刪除範圍);網頁刪除僅限 AI 點名的單一檔案 |
**版本同步三規則(防止改到舊版)**:
1. 任何本機修改前,先在 Desktop 按 **Fetch origin / Pull**,確保本機 = GitHub 最新。
2. AI 每輪交付時會標註「基於 commit <hash>」;若你本機最新 commit 與其不符,先問 AI 再動作。
3. 上傳/Push 後等 Actions 綠勾;AI 隨後做 clone 逐檔核對,雙保險。
4. 雙通道日常交付的目標 Branch 一律為 `dev`;只有 Bar 核准的正式發版可進入 `main`。
**自動防線**(tools/check-doc-titles.js,CI 每次執行):核心檔案存在性、測試模擬檔擋入、內嵌與獨立 schema/validator 一致性、標題/檔名一致性、上傳殘留雜檔。

## E. Release Flow(發版流程)
```
dev → Pull Request → Bar Review → Bar Merge → Netlify Production Deploy → Production Verification
```
**Release Checklist**:
- CI PASS
- Claude Code Review 完成
- CHANGELOG 更新完成
- Documentation 已同步
- ADR 已更新(若涉及架構)

Push 至 `dev` 只代表開發版本已更新,不等於 Deploy。只有 Bar 核准並 Merge `dev → main` 的正式 Release 才觸發後續 Netlify Production Deploy。
