# BUILTIN Snapshot Refresh and SOP Design

> 日期：2026-08-09
> 核准者：Bar
> Runtime 版本：本階段維持 v98；刷新結果由後續 v99 帶入

## Purpose

移除 `index.html` 內 `BUILTIN` Day 3–6 的東京舊行程，以目前公開 Google Sheet 為資料權威重建離線種子，並建立可重複、可驗證且預設不寫檔的刷新工具與操作 SOP。首次離線啟動仍使用完整的現行岡山行程，不改變 runtime 線上同步或本機快照責任。

## Current Evidence

- 現行公開 `itin` CSV 有 Day 1–6，且不含「東京」或「新宿」。
- `index.html` 的 `BUILTIN.itin` Day 3–6 仍含江之島、鎌倉、新宿等舊東京資料。
- `BUILTIN` 是 Tier 3 產物；Google Sheet 與 `schema.js` 才是欄位與來源權威。
- `ledger` 是共享帳本資料，不得把公開 CSV 的正式消費紀錄寫進 repository 種子。

## Chosen Approach

新增 build-time CLI `tools/refresh-builtin-snapshot.js`。CLI 從 `schema.js` 載入 `SCHEMA.pubBase`、sheet gid、kind 與欄位定義，抓取七張非 Ledger CSV，驗證整組資料後組成新的 `BUILTIN`。只有 `--write` 會原子更新 `index.html`；無參數執行只輸出差異摘要。刷新時同時移除既有 `BUILTIN.cfg += ...` 與舊 8 欄 `BUILTIN.ledger = ...` 後置 patch，使完整 `BUILTIN` 成為唯一離線種子權威。

不採手工複製 CSV，避免欄位遺漏、JSON 轉義錯誤與 Ledger 洩漏；不在 runtime 自動刷新 BUILTIN，避免混淆編譯時離線種子與線上 snapshot orchestration。

## CLI Contract

```text
node tools/refresh-builtin-snapshot.js
```

- 讀取現行公開 Sheet。
- 驗證來源與組裝結果。
- 不修改任何檔案。
- BUILTIN 已相同時 exit 0 並回報無差異。
- BUILTIN 不同時 exit 2，列出變動 sheet、舊／新字元數及東京舊資料是否仍存在。
- 下載、Schema 或資料驗證失敗時 exit 1，輸出可定位的 sheet key 與原因。

```text
node tools/refresh-builtin-snapshot.js --write
```

- 使用同一套抓取與驗證流程。
- 全部成功後才更新 `index.html` 的 `BUILTIN_TS` 與 `BUILTIN`。
- `BUILTIN_TS` 使用本次成功刷新時的 Unix epoch milliseconds。
- 寫入後重新解析並執行完整 BUILTIN injection block，確認產物與記憶體中的候選快照完全一致，且不存在後置 cfg／Ledger mutation。
- 成功時 exit 0；任一步驟失敗時不得留下半寫入內容。

未知參數必須 exit 1 並顯示合法用法。

## Snapshot Composition

輸出 key 固定為現行 runtime 契約：

```js
['itin', 'places', 'rest', 'shop', 'hotels', 'exp', 'ledger', 'cfg']
```

- `itin`、`places`、`rest`、`shop`、`hotels`、`exp`、`cfg`：取自本次成功抓取的公開 CSV，保留來源文字的列與欄位內容。
- `ledger`：不得呼叫公開 Ledger gid；只由 `SCHEMA.sheets.ledger.columns[].header` 依順序產生 CSV 表頭與結尾換行。
- `cfg`：直接保存公開 TripConfig 的八個核准 key；不得再由後置程式追加 Exchange Rate 或 Ledger Default Currency。
- JSON 序列化使用穩定 key 順序，避免無意義 diff。
- 工具不得改寫 `schema.js`、Sheet、runtime snapshot、localStorage 或任何 repository。

## Validation and Atomicity

候選資料必須同時通過以下條件才可寫入：

1. 七個非 Ledger endpoint 全部回傳 HTTP 2xx 且非空文字。
2. table sheet 的首列必須符合 `schema.js` 現行 header 順序；itinerary 允許既有旅程標題與飯店摘要前置列，但必須找到唯一且精確符合 Schema 的 7 欄 header row；key-value 與 freeform sheet 必須具備其 Schema 定義的識別列。
3. `itin` 必須包含目前 `cfg` 宣告日期範圍內的 Day 1–6 換日標記，且不得再含已知舊資料「東京」或「新宿」。
4. `cfg` 必須包含 `Trip Name`、`Start Date`、`End Date`、`Travel Mode`、`Currency`、`Home Page`、`Exchange Rate` 與 `Ledger Default Currency`。
5. 產生的 `ledger` 必須只有表頭，不能包含第二列。
6. 候選 `BUILTIN` 必須能由現有 runtime parser 建立資料庫，且離線啟動不得產生 page error。

CLI 先在記憶體完成抓取、驗證與序列化，再以同目錄暫存檔寫入並原子取代 `index.html`。Windows rename 失敗時保留原檔並清理已知暫存檔；不得對 workspace 做廣泛刪除。

## Tests

新增 Node 測試，以受控本機 HTTP server 提供完整 CSV fixture，直接執行真實刷新模組：

- 預覽模式偵測 drift 且不寫檔。
- `--write` 更新 timestamp 與八個固定 key。
- 寫入後移除舊 cfg append 與 8 欄 Ledger overwrite；最終 runtime cfg 八個 key 各一次，Ledger 精確 21 欄且零資料列。
- live Ledger fixture 即使含消費紀錄也不被請求或注入。
- 任一 endpoint 失敗、表頭錯誤、必需設定缺漏或 itinerary 含東京舊資料時，目標檔案位元內容保持不變。
- 未知參數與無差異情境回傳約定 exit code。

更新既有離線／資料測試，確認刷新後：

- BUILTIN Day 3–6 不含東京／新宿舊資料。
- Day 1–6 與現行行程可被 parser 正常建立。
- 斷網首次載入仍顯示 App，且沒有 page error。
- Ledger BUILTIN 只有空表頭。

## SOP

在 `16_OPS_PLAYBOOK.md` 新增「BUILTIN 快照刷新」章節：

1. 觸發時機：行程／Places／Restaurants／Shopping／Hotels／Expenses／TripConfig 有已核准的 Sheet 內容變更，或出發前離線資料稽核。
2. 責任人：Bar 明確核准刷新；AI 或維護者執行工具、檢查 diff 與測試，不自行修改 Sheet。
3. 先執行無參數預覽並確認變動 sheet 合理。
4. 執行 `--write`，檢查 `git diff -- index.html` 只涉及 `BUILTIN_TS` 與 `BUILTIN`。
5. 執行 focused Node、首次離線 Playwright、完整 Node／Playwright 與治理 gate。
6. 更新 changelog、handover、tasks；刷新本身不占 runtime 版本，必須隨下一個正常 SW 版本發布。
7. 若任一 gate 失敗，不 commit、不 push runtime 變更，保留原 BUILTIN 並回報失敗來源。

## Documentation and Task Closure

- backlog #4「BUILTIN 快照更新 SOP 文件化」與 #11「BUILTIN 種子資料過時」只有在工具、SOP、實際刷新及離線回歸都完成後才一起移至 `tasks/done.md`。
- `CONTEXT.md` 與 `08_AI_HANDOVER.md` 記錄 Sheet 為權威、Ledger 排除規則、預覽／寫入命令與失敗原子性。
- `07_CHANGELOG.md` 記錄本次資料刷新，但不宣稱變更 Google Sheet 或 Schema。

## Explicit Non-goals

- 不修改 Google Sheet、`schema.js`、validator 規則或 runtime parser。
- 不把 Ledger 正式／TEST 資料、localStorage 或 IndexedDB 內容寫入 BUILTIN。
- 不新增 runtime 自動刷新、排程工作、CI 對外抓 Sheet或新的資料格式。
- 不在本階段修改 `sw.js`、`app-version.js`、SW lifecycle、cache strategy、`main`、Netlify production 或 production tag。

## Rollback

回退本階段 runtime commit 即可同時還原刷新工具、SOP 與 `index.html` 的 BUILTIN。工具不修改外部 Sheet、localStorage 或 repository，因此不需要資料 migration 或遠端補償。
