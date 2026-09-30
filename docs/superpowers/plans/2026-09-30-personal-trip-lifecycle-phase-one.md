# 個人旅程生命週期第一階段 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付可用的「重置紀錄」、「清除並打包旅程」、「過往旅程」，且不讓清除遺失未同步團體帳或讓舊旅程在同一已安裝 PWA 復活。

**Architecture:** 三個 ES5 UMD module 分別負責生命週期政策、封存格式及 Google Drive 邊界；第四個 effect coordinator 負責預檢、封存讀回與本機清理的順序。current shell 只做 DOM／既有 Ledger／CSV adapter，下一個 immutable generation 由 SW 原子安裝。過往旅程從個人 Drive 按需讀取，只有回顧筆記能追加。

**Tech Stack:** Vanilla ES5 JavaScript、localStorage、IndexedDB、Google Identity Services token model、Drive REST v3、Node 回歸測試、Playwright PWA 測試；零新增 npm runtime 套件與零後端。

**Spec:** `docs/superpowers/specs/2026-09-30-personal-trip-lifecycle-design.md`

## Global Constraints

- 基準為已發布 v136；不得就地改 `shell/v136/`，下一個 generation 是 v137，root `index.html`／`app-version.js` 的 v110 bridge bytes 保持不變。
- 不改 Google Sheet Schema、Apps Script API／白名單、Ledger append-only／結清權威或個人備份 v9 格式。
- UI 名稱固定「重置紀錄」、「清除並打包旅程」、「過往旅程」；第一階段不提供無法使用的「連接新旅程」按鈕。
- 封存包含八張 CSV、個人狀態及下一站進度；不含採買照片、`photoId`、queue、token 或診斷資料。封存唯讀，筆記每次追加新檔。
- `drive.file` 是唯一 Drive scope；access token 僅在記憶體。正式與測試來源使用同一 OAuth app。無可用 OAuth client ID、真機授權未通過時不得宣稱完整可用。
- 清除必須兩次完整線上八表預檢；任何本機 Queue／bridge、正式團體未結清、pending claim、來源 digest 變動或驗證失敗都 fail closed。TEST 餘額不阻擋，TEST 待送資料阻擋。
- 本機清除不刪共用 Sheet、其他手機、Drive 檔或 SW App Shell；`inactive` 標記優先於 boot／sync／retry／polling。
- 日常交付限 `dev`，不 push／merge `main`；正式發布由 Bar 審 PR 後執行。Tier 3 BUILTIN 僅透過 `tools/refresh-builtin-snapshot.js` 生成。

## Review Focus

1. 上傳期間另一分頁新增待同步帳：Task 4 測試第二次 preflight 的 digest／queue 變動必須中止，不清本機。
2. OAuth 對話取消、token 過期或授權帳號切換：Task 3／4 測試沒有自動退化成不封存清除。
3. Drive 已回應上傳成功但讀回失敗／內容被改：Task 2／4 測試 `inactive` 不寫入。
4. IndexedDB 被另一頁占用或清理中斷：Task 4／6 測試保持 `cleanup-pending`，重開不顯示舊旅程並可重試。
5. 過往旅程查詢失敗、格式不支援或 checksum 錯：Task 7 測試分別顯示錯誤，不誤稱沒有封存、不污染目前旅程。

## File Structure and Execution Gate

- Create `trip-lifecycle.js`: storage key／預檢／inactive 純政策；`tests/trip-lifecycle.test.js`。
- Create `trip-archive.js`: 固定格式、個人投影、SHA-256 讀回驗證；`tests/trip-archive.test.js`。
- Create `trip-drive.js`: GIS token、帳號、Drive prepared／complete archive 與 append-only note；`tests/trip-drive.test.js`。
- Create `trip-lifecycle-flow.js`: effect ordering、reset／end／resume；modify `shopping-photo-store.js` 增加原子 `clearAll`；`tests/trip-lifecycle-flow.test.js` 與既有照片測試。
- Create `shell/v137/index.html`、`shell/v137/app-version.js`，由工具生成 `shell/v137/builtin-snapshot.js`；modify `sw.js`、`runtime-assets.json`、`netlify.toml`、`README.md`、`.ai-manifest.json`，再接 DOM adapter；`tests/trip-lifecycle-wiring.test.js`、`tests/browser/trip-lifecycle.spec.js`、`tests/browser/past-trips.spec.js`。
- Update `08_AI_HANDOVER.md`、`adr/README.md`、新增 `adr/0020-personal-trip-lifecycle.md`、`07_CHANGELOG.md`、`tasks/current.md`、`tests/README.md`，只記錄實際完成與驗證結果。

執行前重新 `git fetch origin --prune`，確認工作樹、`HEAD` 與 `origin/dev`；目前本機三筆已核准文件 commit 尚未推送，先將它們安全同步到 `origin/dev`，若遠端移動或工作樹有他人改動則停止請 Bar 裁定。Google Cloud OAuth／Drive API 設定在 Task 3 前取得實際 client ID 與兩站授權來源；若無法在 Bar 帳號完成，停止並回報，不提交 placeholder，也不把不完整功能稱作可用。

### Task 1: 生命週期政策與儲存鍵

**Files:** Create `trip-lifecycle.js`; Test `tests/trip-lifecycle.test.js`。

**Interfaces:** Produces `TripLifecycle.evaluateEndPreflight(input) -> {ok,reasons}`、`resetKeys() -> string[]`、`clearKeys(storageKeys) -> string[]`、`readState(storage) -> {mode,archiveId}`、`writeState(storage,state) -> void`。`input` 固定含 `online`、`sheetsComplete`、`queueCount`、`bridgeCounts`、`formalBalances`、`pendingClaims`；缺欄 fail closed。

- [ ] **Step 1: Write the failing test.** Assert `queueCount:1`、任一 bridge 非零、正式餘額非零、pending claim、offline／缺欄各回 `ok:false`；`formalBalances:{Bar:0}` 與空 queue／bridge 回 `ok:true`。Assert `resetKeys()` 不含 `trip_member`／`trip_ledger_queue`，`clearKeys(['trip_member','trip_ledger_queue','trip_lifecycle_state','v2_cache_itin'])` 只回 `trip_member`、`trip_ledger_queue`、`v2_cache_itin`；`readState` 缺 key 為 `active`。
- [ ] **Step 2: Run RED.** `node tests/trip-lifecycle.test.js` → 因 module／方法不存在而失敗。
- [ ] **Step 3: Implement** 上述 API；`clearKeys` 僅收 `trip_*`（排除 `trip_lifecycle_state`）與 `v2_cache_*`，`writeState` 做 localStorage read-back 驗證。
- [ ] **Step 4: Run GREEN.** `node tests/trip-lifecycle.test.js` → PASS；`node tests/ledger-settlement.test.js` → PASS。
- [ ] **Step 5: Commit.** 分別執行 `git add trip-lifecycle.js tests/trip-lifecycle.test.js` 與 `git commit -m "feat: define personal trip lifecycle policy"`。

### Task 2: 封存格式與讀回驗證

**Files:** Create `trip-archive.js`; Test `tests/trip-archive.test.js`。

**Interfaces:** Consumes八表原始 CSV 與個人狀態。Produces `TripArchive.serialize(input,sha256) -> Promise<string>`、`TripArchive.parseVerified(text,sha256) -> Promise<object>`；`sha256(utf8Text) -> Promise<hex>`，正式版用 WebCrypto，測試用 Node crypto。固定 `format='trippilot-archive'`、`version=1`，checksum 不含自身欄位。

- [ ] **Step 1: Write the failing test.** 八個 sheet keys (`itin,places,rest,shop,hotels,exp,cfg,ledger`)、每表來源時間、`sourceSheetId`、旅程名稱／日期、封存成員／主題、`nextStopProgress` round-trip；巢狀採買項目序列化結果不含 `photoId`、`ledgerQueue`、`access_token`；變更任一 CSV 字元後 `parseVerified` reject；缺一表 reject。
- [ ] **Step 2: Run RED.** `node tests/trip-archive.test.js` → module／驗證缺失而失敗。
- [ ] **Step 3: Implement** 固定欄位順序的 JSON、個人白名單投影與 UTF-8 SHA-256 checksum；不修改來源物件。
- [ ] **Step 4: Run GREEN.** `node tests/trip-archive.test.js` → PASS；`node tests/personal-state-restore-matrix.test.js` → PASS，證明舊備份契約未改。
- [ ] **Step 5: Commit.** 僅提交 module 與對應測試，訊息 `feat: add immutable personal trip archive format`。

### Task 3: Google 帳號與 Drive repository

**Files:** Create `trip-drive.js`; Test `tests/trip-drive.test.js`。

**Interfaces:** Produces `TripDrive.createClient({fetch,requestAccessToken,clientId})`，其方法為 `connect()`、`account()`、`upsertPrepared(archiveId,json)`、`readArchive(fileId)`、`markComplete(fileId)`、`listComplete()`、`appendNote(archiveId,note)`、`listNotes(archiveId)`、`disconnect()`。`connect` 回 `{accountId,email}`；其餘方法只用記憶體 token。GIS script loader 與實際 client ID 由 Task 6 DOM adapter 注入。

- [ ] **Step 1: Write the failing test.** fake token／fetch 斷言 `connect` 只請求 `drive.file` 且 `about.get` 顯示 email；`upsertPrepared` 重試同 `archiveId` 不造第二檔；`listComplete` 排除 prepared；note 重試同 ID 不重複；401、取消及 account switch 均拒絕操作，沒有 storage token write。讀回另一個有效但不同 `archiveId` 的檔案不可被接受為本次上傳。
- [ ] **Step 2: Run RED.** `node tests/trip-drive.test.js` → repository 缺失而失敗。
- [ ] **Step 3: Implement** Drive REST v3 的 appProperties 搜尋、resumable upload、讀回、完成 metadata 與獨立 note 檔；只讓 scope、帳號及 token 經 `connect` 邊界進入。Google Cloud client ID 必須已在 Bar 專案建立；不提交秘密或假的 ID。
- [ ] **Step 4: Run GREEN.** `node tests/trip-drive.test.js` → PASS，檢查測試同時涵蓋 401／網路錯與重試。
- [ ] **Step 5: Commit.** module／測試單獨提交，訊息 `feat: add personal Drive archive repository`。

### Task 4: Reset、結束旅程與可恢復清理

**Files:** Create `trip-lifecycle-flow.js`; Modify `shopping-photo-store.js`; Test `tests/trip-lifecycle-flow.test.js`、`tests/shopping-photo-store.test.js`。

**Interfaces:** Consumes Tasks 1–3。Produces `TripLifecycleFlow.create({storage,photoStore,preflight,archive,drive})`，methods `reset() -> Promise`、`end({saveArchive}) -> Promise`、`resumeCleanup() -> Promise`。`preflight() -> Promise<{policyInput,archiveInput,digest}>` 必須是完整線上資料；`photoStore.clearAll() -> Promise<void>` 是單一 IndexedDB readwrite transaction。

- [ ] **Step 1: Write the failing test.** `reset` 清個人 keys／照片但不動 Queue、locked ledger、身分、主題；照片清理失敗不能回報重置成功。`end` 在預檢失敗、OAuth 取消、上傳成功但讀回失敗、讀回為另一份有效封存、帳號切換、第二次 digest／queue 變動時均不寫 inactive；成功時順序為兩次預檢→讀回且比對本次 `archiveId`／checksum→markComplete→inactive pending→清理→inactive complete；IDB 失敗留 pending，`resumeCleanup` 成功可完成。另測 `saveArchive:false` 完全不碰 Drive，以及兩分頁／重複點擊被互斥守門並在標記 inactive 前最後重查 queue／bridge。
- [ ] **Step 2: Run RED.** `node tests/trip-lifecycle-flow.test.js` 與 `node tests/shopping-photo-store.test.js` → 新行為缺失而失敗。
- [ ] **Step 3: Implement** effect ordering；在 `shopping-photo-store.js` driver 與 store 增加 `clearAll`，不要逐照片非原子刪除；清理只按 Task 1 的 key policy，`inactive` 標記在任何刪除前可讀回。
- [ ] **Step 4: Run GREEN.** 上述兩個 Node 測試 → PASS；再跑 `node tests/ledger-sync.test.js` → PASS。
- [ ] **Step 5: Commit.** coordinator／照片邊界／測試單獨提交，訊息 `feat: coordinate safe trip reset and clear`。

### Task 5: 建立 v137 原子 PWA 外殼

**Files:** Create `shell/v137/index.html`、`shell/v137/app-version.js`、generated `shell/v137/builtin-snapshot.js`; Modify `sw.js`、`runtime-assets.json`、`netlify.toml`、`README.md`、`.ai-manifest.json`; Test `tests/trip-lifecycle-wiring.test.js`、`tests/pwa-shell.test.js`。

**Interfaces:** Consumes Tasks 1–4 modules。Produces v137 shell script order and offline cache inventory；root v110 bridge bytes unchanged。

- [ ] **Step 1: Write the failing test.** `tests/trip-lifecycle-wiring.test.js` 斷言 SW／App marker 為 v137、四個新 module 皆在 HTML→`runtime-assets.json`→SW SHELL、root bridge 與 v136 shell 的 git bytes 未變。
- [ ] **Step 2: Run RED.** `node tests/trip-lifecycle-wiring.test.js` → 目前仍是 v136，明確失敗。
- [ ] **Step 3: Implement** 以機械複製建立 v137 HTML／version 源檔，再以 `apply_patch` 改 marker、script order、SW version／路徑、Netlify headers、README／manifest 的現行世代；**不手改 generated asset**。先跑 `node tools/refresh-builtin-snapshot.js` 只讀 preview；升版生成時呼叫 `runRefresh({write:true,fetchCsv})`，`fetchCsv` 從已核准的 v136 asset 讀七表，確保內容未被 live CMS 漂移偷偷替換。若 preview 顯示 CMS 內容變動，另行回報 Bar，不在本任務混入刷新。
- [ ] **Step 4: Run GREEN.** `node tests/trip-lifecycle-wiring.test.js`、`node tests/pwa-shell.test.js`、`node tools/check-app-version.js`、`node tools/check-runtime-assets.js`、`node tests/builtin-snapshot-asset.test.js` → 全 PASS；`npx playwright test tests/browser/sw-update-cache.spec.js` → PASS。
- [ ] **Step 5: Commit.** v137 外殼與測試同批提交，訊息 `feat: register v137 trip lifecycle shell`；保持 dev 不推送直到後續 UI 與全量 gate 完成。

### Task 6: 現行旅程設定、預檢與空白啟動

**Files:** Modify `shell/v137/index.html`; Test `tests/browser/trip-lifecycle.spec.js`、`tests/trip-lifecycle-wiring.test.js`。

**Interfaces:** Consumes Task 4 flow；produces `freshEndPreflight()` adapter（用既有 `fetchSheet` 對八表全部成功、`prepareSheetCandidate` 驗證、正式 Ledger 結算投影與本機 digest）及 `renderInactiveHome()`。`init`、online／visibility／pageshow handlers 在 boot／同步／補送前先讀 `TripLifecycle.readState()`。

- [ ] **Step 1: Write the failing browser test.** 設定有「重置紀錄」「清除並打包旅程」；離線重置後個人記錄空、shared queue／locked ledger 保留；清除確認畫面告知他人離線 queue 與 CSV 發布延遲不可見；Ledger fetch 失敗即使 cached 可用仍禁止清除；未結清／pending／bridge 禁止；直接清除後在線／離線重載皆只見「目前沒有進行中的旅程」且無舊成員／帳務；IDB 清理失敗重載顯示重試、不呼叫 `syncAll`。
- [ ] **Step 2: Run RED.** `npx playwright test tests/browser/trip-lifecycle.spec.js` → 入口／守門缺失而失敗。
- [ ] **Step 3: Implement** 設定入口、兩次確認、GIS 按需載入與實際 client ID 注入、完整八表 preflight adapter、inactive 啟動及事件守門；登入或清除失敗保持明確可操作狀態，不新增「連接新旅程」。
- [ ] **Step 4: Run GREEN.** 該 browser spec、`node tests/trip-lifecycle-wiring.test.js`、`npx playwright test tests/browser/trip-three-scenarios.spec.js` → PASS；確認 pageerror=0。
- [ ] **Step 5: Commit.** v137 UI 與測試同批提交，訊息 `feat: add safe reset and end-trip UI`。

### Task 7: 過往旅程與回顧筆記

**Files:** Modify `shell/v137/index.html`; Test `tests/browser/past-trips.spec.js`。

**Interfaces:** Consumes Task 3 Drive list/read/note methods與 Task 2 `parseVerified`；produces Settings／inactive home 的「過往旅程」入口、唯讀檢視與 append-only note form。

- [ ] **Step 1: Write the failing browser test.** 同帳號跨清除仍列 archive；另一帳號只列其檔；封存行程／團體／個人／採買內容無編輯鈕且不觸發 Sheet POST；新增筆記一次一筆；離線／401／壞 checksum／未知格式各顯示明確狀態，不顯示「沒有封存」；長筆記 escape HTML、320px 無水平溢出。
- [ ] **Step 2: Run RED.** `npx playwright test tests/browser/past-trips.spec.js` → 頁面／筆記缺失而失敗。
- [ ] **Step 3: Implement** on-demand Drive list/read、封存 view model、append-only notes、帳號切換時清除記憶體內容；不寫 localStorage／IndexedDB archive cache。
- [ ] **Step 4: Run GREEN.** 該 browser spec 與 `npx playwright test tests/browser/trip-lifecycle.spec.js` → PASS，pageerror=0。
- [ ] **Step 5: Commit.** 唯讀過往旅程 UI 與測試同批提交，訊息 `feat: browse personal past trips and add notes`。

### Task 8: 文件、完整 gate 與真機交付

**Files:** Modify `README.md`、`08_AI_HANDOVER.md`、`.ai-manifest.json`、`adr/README.md`、`07_CHANGELOG.md`、`tasks/current.md`、`tests/README.md`; Create `adr/0020-personal-trip-lifecycle.md`；如有新公開設定檔，登錄 `runtime-assets.json` 並納入 SW 同世代。

**Interfaces:** No new runtime API。交付清單明示 Google OAuth 實際 client ID 配置、正式／測試 origins、存放與刪除範圍、未驗真機項目、forward-bump 回滾。

- [ ] **Step 1: Write docs and ADR.** ADR 固定七段記錄 Drive 個人封存、帳務 preflight、inactive guard、取捨與第二階段界線；文件只寫已驗事實，manifest／README 指向 v137，保留 v136 歷史。
- [ ] **Step 2: Run full local gate.** `node tools/check-doc-titles.js`、`node tools/check-app-version.js`、`node tools/check-doc-generation.js`、`node tools/check-runtime-assets.js`、PowerShell 逐檔跑 `tests/*.test.js`、`npm run test:browser`；任何紅測試記名修復，不以局部綠燈交付。
- [ ] **Step 3: Commit and publish dev candidate.** `git diff --check`、檢查 root bridge／v136 bytes 未變與 Tier 3 asset 確由工具生成；提交文件及本機 QA 紀錄。完整本機 gate 通過後依 `dev` 流程 push，讓 GitHub Pages 提供真機候選版；不建立 main PR／merge／production tag，除非 Bar 另行指示。
- [ ] **Step 4: Run data／device acceptance.** Dev 候選版確認斷網 BUILTIN、連網同步、旅行日 mock Date 的 `healthCheck()=[]`／pageerror=0；iPhone 與 Android 實體 PWA 分別完成 Google 帳號授權、Drive 上傳讀回、清除後重啟與過往旅程筆記。若 Bar 裝置或 Cloud 同意流程未能提供，標未驗並停止「完整可用」宣稱；必要修正仍只在 dev 進行並重跑 gate。

## Self-Review Checklist

- [x] Spec §1–9 各條需求均能指向 Task 1–8 的介面或測試。
- [x] 任務間的名稱／型別與 v137／OAuth 前置條件一致；無 placeholder client ID 或未定義資料來源。
- [x] Review Focus 五個失敗模式皆有對應 RED test；沒有只測 mock 呼叫次數而不測實際狀態。
- [x] 完整 gate、真機未驗與回滾明確分開報告；未獲 Bar 正式發布指令不擴大範圍。
