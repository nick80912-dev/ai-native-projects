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
| 所有 `*.md` 文件、`adr/`、`tasks/`、`docs/` | 文件/治理(文件同步義務見憲章;`docs/personal-state-compatibility.md` 為備份相容性契約,改動須連帶更新對應測試) |
| `.ai-manifest.json` | AI 導航檔(改後需與文件一致) |
| `schema.js`、`validator.js` | 資料規格與防錯**原始碼**;但改 SCHEMA 欄位/型別值屬憲章「須先確認」事項 |
| `tests/` | 測試資產(交付必附,見 tests/README.md) |
| `tools/`、`.github/workflows/` | 檢查腳本與 Sanity CI(Gate 的自動化層;改壞只影響檢查不影響 App) |

## Tier 2 — 高風險保護範圍(修改前必過「原因/影響/風險/回滾」確認)
| 檔案 | 說明 |
|---|---|
| root `index.html`／`app-version.js` | byte-locked v110 bridge 正式入口；只供 predecessor 安裝前／失敗續命，禁止當 current App 編輯 |
| `shell/v120/index.html`／`app-version.js` | current App 原始碼與版本 identity；改壞直接影響成功升級的線上使用者 |
| `sw.js` | Service Worker;改壞會造成使用者快取災難 |
| `manifest.webmanifest`、`icon-*.png` | PWA 安裝行為 |
| `netlify.toml`(含 `sw.js`／`index.html`／版本檔的 `Cache-Control` header) | 上線與快取行為;header 改錯會讓「改版必到」失效 |

### PWA 風險群組(2026-07-30 由 Bar 定義)
`sw.js`、`shell/v120/index.html`／`app-version.js`／`builtin-snapshot.js`、root v110 bridge 與 `netlify.toml` 對應 cache header **視為同一風險群組**,理由:它們共同決定「使用者裝置上會不會原子取得新版」。因此:
- 四項確認以**群組為單位**提出,不得因「這次只改一個檔」而略過;動其中任一個,四段說明必須涵蓋對另外兩者的影響。
- 版本升級時,群組內任何不一致(例如 current generation version 升版但 `sw.js` 標記／immutable path／header 未同步，或 bridge bytes 漂移)一律視為交付缺陷。
- 群組相關的回滾一律依 `16_OPS_PLAYBOOK.md` §A2:往前 bump 版本號重新發布,**禁止以刪除 `sw.js` 作為回滾手段**。

## Tier 3 — 產生產物(禁止手改,只能重新產生)
| 產物 | 來源 | 更新方式 |
|---|---|---|
| `09_SCHEMA_MAPPING.md` 表格區 | `schema.js` 的 `schemaDoc()` | 改 schema.js → 重跑 schemaDoc() 貼回(檔頭註解為手寫,可直接維護) |
| `shell/v120/builtin-snapshot.js` | Google Sheets 七張非 Ledger 發布 CSV + `schema.js` Ledger header + App version | 先執行 preview，再以 `node tools/refresh-builtin-snapshot.js --write` 產生；禁止手改或在 v114 HTML 複製 payload |

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
