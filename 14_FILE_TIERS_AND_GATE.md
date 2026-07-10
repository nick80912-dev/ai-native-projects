# 14 檔案風險分級與 Gate 保護範圍

> 由 Bar 於 2026-07-09 核准。本檔定義 repo 內「原始碼/可編輯資產」與「部署產物/高風險檔案」的分級,以及 Pre-Work Git Sync Gate 之上的分級保護規則。

## 分級原則(Bar 核定)
1. 原始碼、文件、憲章、harness、設定檔 → 一般 AI 開發與審查範圍。
2. 直接影響正式上線行為的檔案 → 高風險保護範圍。
3. AI 可對高風險檔案**提出修改建議**;要**直接修改**必須先說明:原因、影響範圍、風險、回滾方式,並取得 Bar 確認。
4. build/產生產物不得手改,一律改來源檔或產生流程後重新產生。
5. 分級以「改壞後是否立即影響線上使用者」為判準。

## Tier 1 — 一般開發範圍(AI 可依 15 的任務分級自行修改)
| 檔案 | 性質 |
|---|---|
| 所有 `*.md` 文件、`adr/`、`tasks/`、`docs/superpowers/` | 文件/治理(文件同步義務見憲章) |
| `.ai-manifest.json` | AI 導航檔(改後需與文件一致) |
| `日本行程V2預覽.html` | **預覽版 App 原始碼**(可編輯工作檔;交付仍走「預覽→核可」) |
| `schema.js`、`validator.js` | 資料規格與防錯**原始碼**;但改 SCHEMA 欄位/型別值屬憲章「須先確認」事項 |
| `tests/` | 測試資產(交付必附,見 tests/README.md) |
| `tools/`、`.github/workflows/` | 檢查腳本與 Sanity CI(Gate 的自動化層;改壞只影響檢查不影響 App) |

## Tier 2 — 高風險保護範圍(修改前必過「原因/影響/風險/回滾」確認)
| 檔案 | 說明 |
|---|---|
| `index.html` 正式部署版 | 線上 App 本體 |
| `sw.js` | Service Worker;改壞會造成使用者快取災難 |
| `manifest.json`、`icon-*.png`、`apple-touch-icon.png` | PWA 安裝行為 |
| Netlify 部署設定 | 上線行為 |
> 建議收納於 `deploy/` 目錄(backlog #2),與 Tier 1 實體隔離,一眼可辨。

## Tier 3 — 產生產物(禁止手改,只能重新產生)
| 產物 | 來源 | 更新方式 |
|---|---|---|
| `09_SCHEMA_MAPPING.md` 表格區 | `schema.js` 的 `schemaDoc()` | 改 schema.js → 重跑 schemaDoc() 貼回(檔頭註解為手寫,可直接維護) |
| 預覽/部署 HTML 內的 `BUILTIN` 快照 | Google Sheets 發布 CSV | 依 BUILTIN 更新 SOP 重抓注入(SOP 文件化見 backlog #6) |
| 部署 ZIP | 打包流程 | 重新打包,不改 ZIP 內容 |

## Gate 分級規則(疊加於憲章 4.1 的 Pre-Work Git Sync Gate)
- Tier 1:過 Gate 後即可依 `15_AI_EXECUTION_RULES.md` 的任務分級動工。
- Tier 2:過 Gate 後,動工前必須額外提出「原因/影響範圍/風險/回滾方式」四項並取得 Bar 確認;交付必附回滾指引(見 16)。
- Tier 3:任何直接編輯一律視為違規;發現產物與來源不一致 → 回報並重新產生。

## 禁入 repo 的產物(2026-07-10 新增)
- **測試模擬檔**(檔名含 TEST/測試,如時間 mock 的驗收版 HTML):僅供本機與手機驗收,含時間偽造與測試 banner,**永遠不得 commit**。CI 規則 5 會自動攔截。
- 測試模擬檔內含的時間 mock 會實際寫入 localStorage(打卡/跳過/自動略過),與正式版同源開啟時共用狀態;驗收後如有操作過,正式使用前應清除當日進度(隱藏重置功能,見 backlog)。

## 內容資料來源(不在 repo,另計)
- Google Sheet「261018-261023岡山四國六天五夜」(Drive)為**內容資料的唯一來源**;程式與文件的權威在 GitHub,兩者層級不同、互不取代。
- Sheet 欄位/結構異動屬憲章「須先確認」事項;資料列增修由 Bar 直接在 Sheet 操作,免經 AI。
