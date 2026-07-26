# 16 Ops Playbook(回滾手冊 · DevOps 安全規範)

> 由 Bar 於 2026-07-09 核准。回滾章節為新增;清理排程安全規範自 PROJECT_CONSTITUTION §8 移入(憲章保留指引連結)。

## A. 回滾手冊(部署出事時的逃生路線)

### A1. Netlify 部署回滾(最常用)
1. Netlify 後台 → 該 site → **Deploys** 頁。
2. 找到上一個正常的 deploy → 點入 → **Publish deploy**(即時切回舊版,無需重新上傳)。
3. 回滾後在 07_CHANGELOG 記錄:回滾時間、原因、退回的版本。
> Netlify 每次部署皆保留快照,拖放部署也一樣可回滾;這是本專案的第一逃生門。
> 正式站與測試站為兩個獨立 Netlify site，部署快照與回滾操作各自獨立。

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
3. 驗證:`dev` 執行同等本機 CI；Pull Request / `main` 需 Actions 轉綠；再由 AI 核對遠端 commit，才算修復完成。
4. 事後在 07_CHANGELOG 記一筆 incident:時間、原因、影響、修復方式(不追究、只留痕,供未來防範)。
**通知**:GitHub 預設會將 Actions 失敗通知寄到 commit 者信箱;Pull Request 或 `main` push 觸發 workflow 後，Bar 應等待並確認 Actions 綠勾(約 1 分鐘),綠了才離開。`dev` push 目前以同等本機 CI 驗證，是否加入 workflow 另見 backlog。

## D. 雙通道交付 SOP(GitHub Desktop 為主、網頁上傳為輔)(2026-07-10 由 Bar 核准)
兩通道並行,防呆規則如下:
| 情境 | 使用通道 |
|---|---|
| 多檔交付(2 檔以上、含資料夾、含隱藏檔) | **GitHub Desktop**:解壓 ZIP 覆蓋本機 repo 資料夾 → Desktop 檢視 diff(逐檔確認,特別留意「刪除」紅字)→ Commit → Push 至 `dev` |
| 單檔小修(貼上內容、改一行) | 網頁編輯(鉛筆)可 |
| 刪除檔案 | **一律 GitHub Desktop**(diff 會明確顯示刪除範圍);網頁刪除僅限 AI 點名的單一檔案 |
**版本同步規則(防止改到舊版)**:
1. 任何本機修改前,先在 Desktop 按 **Fetch origin / Pull**,確保本機 = GitHub 最新。
2. AI 每輪交付時會標註「基於 commit <hash>」;若你本機最新 commit 與其不符,先問 AI 再動作。
3. `dev` Push 前執行與 Actions 相同的本機 CI；Pull Request / `main` Push 後等 Actions 綠勾，AI 再核對遠端 commit。
4. 雙通道日常交付的目標 Branch 一律為 `dev`;只有 Bar 核准的正式發版可進入 `main`。
**自動防線**(tools/check-doc-titles.js,CI 每次執行):核心檔案存在性、測試模擬檔擋入、內嵌與獨立 schema/validator 一致性、標題/檔名一致性、上傳殘留雜檔。

## E. Release Flow(發版流程)
```
dev → Pull Request → Bar Review → Bar Merge → Netlify Production Deploy → Production Verification
```
**線上通道對應**(2026-07-26 核對,皆以實際端點回應為準):

| 通道 | 網址 | 追蹤 | 觸發 | 定位 |
|---|---|---|---|---|
| Netlify 正式站 | `https://trippilot-jp.netlify.app/` | `main` | Bar 核准 PR merge 後自動部署 | 正式發布 |
| GitHub Pages | `https://nick80912-dev.github.io/ai-native-projects/` | `dev` | 每次推送自動發布 | **日常 HTTPS／PWA／離線驗收的預設通道**(見 §F3) |
| Netlify 測試站 | `https://dev-trippilot-jp.netlify.app/` | `dev` | 每次推送自動部署 | 只驗證 Netlify 特有行為(見下) |

- 三個通道為獨立 origin:網域、Service Worker 快取、localStorage 與 PWA 安裝完全隔離,任一站的狀態不污染其他站。
- **Netlify 測試站仍然存在且仍會在每次 `dev` 推送時自動部署**,本文件未變更該設定。但它不再是每次修改的預設驗收站 —— 日常驗收改走 GitHub Pages,以降低 Netlify 額度消耗。
- 測試站保留的用途:驗證 `netlify.toml` 定義的 header 行為(例如 `sw.js` 的 `no-cache, no-store, must-revalidate`)、redirects,或其他 GitHub Pages 無法重現的 Netlify 特有整合。**這些是 Pages 驗收不能取代的**(Pages 不讀 `netlify.toml`,一律 `max-age=600`)。
- 要真正停止測試站的自動部署,必須修改 Netlify site settings —— 屬部署設定變更,需 Bar 明確裁定,不在文件批次範圍內。

**Release Checklist**:
- CI PASS
- Claude Code Review 完成
- CHANGELOG 更新完成
- Documentation 已同步
- ADR 已更新(若涉及架構)

Push 至 `dev` 會同時更新 GitHub Pages 與 Netlify 測試站,**兩者都不等於正式 Release**。只有 Bar 核准並 Merge `dev → main` 才會觸發正式站部署。GitHub Pages 驗收通過**不代表**已發布;正式發布責任仍依本節 Release Flow 與 Bar 核准執行。

## F. 非 Netlify 驗收流程(2026-07-26 新增)
> 目的:讓日常 UI 與資料邏輯的反覆驗收不必依賴 Netlify 部署。本節不改變 §E 的發布責任。

### F1. 電腦本機驗收
**用途**:日常 UI 驗收、console error 檢查、localStorage 與備份測試、320／375／390px responsive 驗收,以及在不建立任何線上部署的情況下快速反覆修改。

在專案根目錄啟動:
```
npx --yes http-server . -p 4188 -c-1
```
電腦瀏覽器開 `http://localhost:4188/`。驗收完成後以 `Ctrl+C` 關閉。

- `-c-1` 關閉 http-server 自身的快取,避免改了檔案卻load到舊版。
- `localhost` 屬 secure context,**Service Worker 會註冊**,可做基本離線測試。
- Chrome Device Mode 只能作近似驗收,**不取代真機**(觸控、輸入法、iOS Safari 行為都測不到)。
- 若要改用 `python -m http.server`,先確認是真的 Python 安裝 —— 本機 `WindowsApps\python.exe` 是 Microsoft Store 的 0 byte 佔位程式,執行不會啟動伺服器。

### F2. 方法 A:手機透過 LAN 真機驗收
**用途**:iPhone／Android 真機 UI、數字鍵盤、`type="number"` 實際輸入行為、點擊尺寸、safe area 基本排版、Scroll-only、Modal／Sheet、長文字與輸入法。不消耗任何部署額度。

1. 電腦與手機連接**同一個私人 Wi-Fi**。
2. 專案根目錄啟動與 §F1 相同的伺服器(`http-server` 預設綁定 `0.0.0.0`,同網段可連)。
3. 查電腦的 Wi-Fi IPv4:
```
ipconfig
```
4. 找到 Wi-Fi 介面卡的 IPv4 位址(例如 `192.168.10.126`)。
5. 手機瀏覽器開 `http://<該IP>:4188/`。
6. Windows 防火牆首次會詢問,**只允許私人網路**。
7. 驗收完成後以 `Ctrl+C` 關閉。

**限制與安全**:
- `http://` 加 IP **不是 secure context**,Service Worker 不會註冊。因此**不能**驗收 PWA 安裝、SW scope、離線防線,診斷面板的「App 版本」會顯示「無法讀取」(它讀 Cache Storage)。
- LAN HTTP **不得**作為 PWA 安裝、Service Worker scope 與完整離線功能的最終驗收依據 —— 那些請走 §F3。
- 不得在公共 Wi-Fi 開放;不得放入正式機密或敏感測試資料。
- 該網址是獨立 origin,`localStorage` 與正式站完全分開:需重選成員身分,也看不到既有個人帳。要帶資料過去請用設定頁的 JSON 備份／還原。

### F3. GitHub Pages HTTPS 驗收
GitHub Pages **已啟用**,不再是待評估或待核准狀態。

```
GitHub Pages URL：https://nick80912-dev.github.io/ai-native-projects/
發布來源：      Deploy from a branch(repo 內無 Pages workflow,由 GitHub 內建 pages-build-deployment 建置)
發布 branch：    dev
網站子路徑：     /ai-native-projects/
```

**用途**:提供不依賴 Netlify 的 HTTPS 驗收網址,並驗證真實子路徑環境下的 SW scope、manifest `start_url`／`scope`、PWA 安裝、離線啟動、重新整理與直接開啟子路徑。

**已完成實測的技術防線**(2026-07-26,以子路徑實跑,非推論):
- ✅ App Shell 資產可在 repository 子路徑載入 —— SHELL 9 筆全部快取於 `/ai-native-projects/…`。
- ✅ manifest `start_url`／`scope` 與實際 Pages 子路徑相容 —— 皆解析為 `…/ai-native-projects/`。
- ✅ Service Worker 註冊與 cache URL 不依賴網域根目錄 —— scope 為 `…/ai-native-projects/`。
- ✅ 直接開啟 Pages 網址可正常載入;重新整理可正常載入。
- ✅ 離線啟動:停掉伺服器後重新載入仍完整開機,console error 0。
- ✅ Pages 與 Netlify 屬不同 origin,localStorage、Service Worker cache 與 PWA 安裝互相隔離。
- ✅ 發布來源確認為 `dev`:推送後 Pages 服務中的 `sw.js` 由 `okayama-trip-v61` 變為 `v62`,與 `origin/dev` 一致(`origin/main` 當時為 v18)。

**尚待真機驗收(不得視為已通過)**:
- ⏳ iOS Safari 的 PWA 安裝(加到主畫面)與 standalone 模式。
- ⏳ iOS 真機的離線重開。
- ⏳ 在 `github.io` origin 上的 SW 更新實際節奏。

**與 Netlify 的行為差異(驗收時必須知道)**:
- Pages **不讀 `netlify.toml`**,不能自訂 header,一律 `Cache-Control: max-age=600`。Netlify 對 `sw.js` 設的 `no-cache, no-store, must-revalidate`(「改版必到」)在 Pages 不生效。
- `navigator.serviceWorker.register('sw.js')` 未指定 `updateViaCache`,瀏覽器預設 `'imports'`,最上層 SW script 本來就會繞過 HTTP 快取,因此 SW 版本更新仍會被偵測到;真正可能延遲的是 `index.html`(CDN 最多壓 10 分鐘)。**驗收 SW 更新時勿把 CDN 延遲誤判成「SW 沒更新」。**
- 整個 repo 會以靜態站公開(`tasks/`、`docs/`、`07_CHANGELOG.md` 皆可直接瀏覽)。repo 本來就是 public,不構成新增暴露。
- Pages 沒有獨立的部署快照可回滾;它永遠等於 `dev` 當下的內容。要退版就 `git revert` 後推 `dev`(見 §A4)。

### F4. 標準驗收層級
日常開發採以下順序,**能在前一層擋掉的問題就不要往後推**:
```
自動測試(node tests/*.test.js + tools/check-doc-titles.js)
→ 電腦 localhost(§F1)
→ 手機 LAN 真機 UI(§F2)
→ GitHub Pages HTTPS／PWA／離線(§F3)
→ 必要時才做 Netlify 驗收或正式發布(§E)
```
**原則**:
- 一般 UI 與資料邏輯修改**不得**為了每次驗收反覆依賴 Netlify 部署。
- LAN 負責快速真機操作驗收;GitHub Pages 負責 HTTPS、子路徑、PWA 與離線驗收。
- Netlify 留給正式站驗證、Netlify 特有 headers／redirects,或正式 Release。
- **GitHub Pages 驗收通過不等於正式 Release。** 正式發布責任仍依 §E 的 Release Flow 與 Bar 核准執行。
