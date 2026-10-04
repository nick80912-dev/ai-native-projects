# TripPilot v142 A Verification

日期：2026-10-03；已經 PR #39 發布至正式站 v142。下方「最終驗證」及裁定保留本機交付當下的範圍，發布證據另列如下。

## 正式發布核對

- dev `11cd2e6` → main `07d4581`，dev／PR／main CI `37130214421`／`37130217277`／`37130726114` 全數 success，各 browser 237/237。本輪 Node 106/106 與四項 gate 重新通過。
- Netlify deploy `6ac114efbcf7f4000841eb69`，commit_ref 等於 merge commit，published_at `2026-10-03T14:45:13.177Z`。31 資產與 merge commit bytes 相等，root v110／v141 保留、cache header 正確。隔離 Chromium 的 28 Shell 資產完整、runtime／HTML／asset v142、離線重開與 pageerror 0。
- `production-v142` 指向 `07d4581`。本次在 G1 明示提醒後依 Bar 再次指示 merge 發布，G1 跳過但真機待驗不代勾。此證據不認證手機、OAuth 對外開放或 live CMS 新鮮度。
- Release-only 腳本的 CRLF 工作檔比較與非同步等待缺陷已定位，改比對 Git merge blob 並 await evaluate 條件輪詢後通過。沒有 production runtime 改動；既有類似 helper 稽核留 backlog #53。

## 最終驗證

Runtime commit：`38da9a3`；審查範圍：`d6004cc..ec737b5`，同一位 Astra reviewer 接續中斷前審查，沒有二次 reviewer。三項 Important 經一輪 RED→GREEN 修正；Minor 保留為 backlog #52。

- Node **106/106** test files 通過；完整 Chromium Playwright **237/237**，6.4 分鐘。
- `check-doc-titles`、`check-app-version`、`check-doc-generation`、`check-runtime-assets`、`git diff --check` 全部通過。
- 完整 browser 包含三情境 healthCheck／pageerror、SW 換代／混世代拒絕／離線、真實帳務詳情、正式／TEST、下載失敗保留待送、部分購買、鍵盤與三寬度／六主題檢查。
- frozen v141 三件組與 root v110 無 diff；v142 BUILTIN snapshot 與原 v141 八表內容及 timestamp 深度相等；沒有 live CSV／Ledger fetch。
- 首輪 233/235 的兩項舊文案期望已更新並複驗；另一次中斷於 154 的 run 沒有 terminal result，**不計為通過**。

重跑：依 `docs/superpowers/plans/2026-10-03-trippilot-batch1-index.md` 完整 QA 命令。最後 Task 4 使用所有 gates → 全部 `tests/*.test.js`（任一失敗立即退出）→ `npm run test:browser` → whitespace gate。

## 重要修正的證據

1. 持續行程狀態：helper 缺失及完成列沒有「已完成」的 RED；用既有 checks／skip／autoSkip 投影完成／手動略過／自動略過。原生跳過、Space 完成、離開返回均 GREEN；不改 progression。
2. 部分購買：helper 缺失及真實拆分後找不到摘要的 RED；同 split-group、同名稱／單位、安全數量才顯示「部分購買 · 已買 2/5 盒」。未知或混合單位不推算；原生拆成兩筆、卡片及詳情均 GREEN，數量及記帳覆蓋仍分開。
3. Delivery 整合：原直接插入 DOM 的測試找不到真實可見 dialog，RED 證明測試缺口而非 production defect。改為已註冊身分、實際點擊帳務卡、可見對話框精確狀態；覆蓋同 ID 多來源、正式／TEST、相反模式 queue 及下載失敗保留 pending。

## 裁定與代價（依順序）

- Ruling: Generate new BUILTIN with existing runRefresh API using approved v141 CSV inputs, not live fetch — user explicitly approved re-generation after plan defect — cost if wrong: mixed generation startup; version/byte parity gates required.
- Ruling: Shopping ledger coverage remains allocation record counts (筆), never product units; keep existing detailed coverage/action resolver, add plain state summary — existing domain and handover require counts not invented item ratios — cost if wrong: user mistakes purchase quantity for ledger coverage.
- Ruling: Tasks 1–3 share the new immutable generation document and their tests were interleaved before commit; preserve a single verified combined runtime commit, but run each task's named verification separately — avoid rewriting already generated assets or pretending isolated task commits — cost if wrong: coarser bisect granularity.
- Ruling: Adjust only four measured selectors to 11px; leave unmeasured candidates unchanged and preserve two-line ledger geometry — conservative size requirement and actual 8.5–9.5px evidence — cost if wrong: other small labels remain harder to read until later audit.
- Final: Ruling: B persistence and C weather remain deferred until preceding user acceptance — independent batches and no changes here — cost if wrong: those existing reliability/weather gaps remain until their batch.
- Final: Ruling: physical iOS/Android/readers/system-font results remain unverified — no available device evidence, desktop QA cannot certify them — cost if wrong: platform-specific issues remain undetected.
- Final: Ruling: unmeasured font candidates and broader redesign remain unchanged — conservative font requirement, see original four-selector ruling — cost if wrong: small supporting labels remain until later audit.
- Final: Ruling: legacy items without allocations use normal repository normalization, no raw-object bypass feature added — current loading normalizes legacy items and summaries never invent units — cost if wrong: unsupported raw-object injection can lack a summary.
- Final: Ruling: remote deployment/CI, live CSV freshness and OAuth readiness are not claimed — no runtime push/release authority or live-data audit — cost if wrong: local QA says nothing about deployment/authorization/content readiness.

## 保留事項

- Minor：本機資料健康 backlog 包含其他模式、未標記；可能造成摘要混淆，但不影響帳務金額或權限。backlog #52 後續統一決定全裝置或目前模式語意，不在本輪改既有 queue 保護。
- 依前端設計原則維持原有密度／層級，只調四個已盤點的小字 selector。Netlify 設定核對只更新 v142 路徑，cache strategy 不變；沒有部署。
- iPhone／Android PWA、VoiceOver／TalkBack、大字及實體鍵盤未驗。B／C 待 A 使用者驗收；分類管理／檔案備份／旅程列表／新旅程串接不在 A。

