# Hotel Profile HID Linkage Design

> 日期：2026-08-11
> 決策者：Bar
> 目標版本：CMS Schema 3.0／App SW v102（只 push `dev`）

## Purpose

以明確 `HID` 取代 Places 與 Hotels 之間的住宿名稱模糊比對。保留 P002／P013／P022／P031／P040 五個具有不同抵達里程與時間的住宿停靠點，讓它們共同引用 H001 住宿主檔；住宿或停靠點名稱日後可獨立修改，不影響住宿資料關聯。

## Domain Model

- **住宿停靠點（lodging stop）**：Places 中 `Type=住宿` 的一列。PID 識別某次行程路徑下的導航與交通脈絡；同一實體住宿可因每日抵達路程不同而有多個 PID。
- **住宿主檔（hotel profile）**：Hotels 中以 HID 識別的一列，保存入住、退房、地址、停車、適用日期與住宿備註。同一 HID 可被多個住宿停靠點引用。
- 關係為 `Places.hotelId N → 1 Hotels.hotelId`。PID 與 HID 不互相取代，也不要求數字尾碼相同。
- Places 名稱服務導航與顯示，Hotels 名稱服務住宿主檔顯示；兩者都不是關聯鍵。

## Five-Part Proposal

### 1. 問題分析

現行 `hotelOf(place)` 將 Place 與 Hotel 名稱去除空白後做雙向 substring 比對，找不到時還會退回 `DB.hotels[0]`。`weatherHotelForItem()` 另有一份相似的名稱比對。住宿改名、名稱縮寫、增加第二間住宿或資料載入不完整時，都可能找不到或掛到錯誤住宿；兩條 resolver 也可能產生不同結果。

線上資料目前有 H001，以及名稱相同但交通時間分別為開車 30 分鐘、2 小時、3 分鐘、50 分鐘與步行 3 分鐘的 P002／P013／P022／P031／P040。這些 PID 是刻意保留的每日停靠點，不能合併為單一 PID。

### 2. 可行方案

1. **嚴格 HID 關聯（採用）**：Places 新增 `HID`，所有住宿停靠點必須填入有效 Hotels.HID；runtime 只做 exact-ID resolution。
2. **過渡雙讀**：Places 有 HID 時用 HID，缺少時沿用名稱比對。
3. **名稱別名**：不新增外鍵，改在 Hotels 維護一組可接受名稱。

### 3. 優缺點比較

嚴格 HID 能完全消除名稱耦合與第一筆 fallback，並讓缺漏資料在同步 gate 明確失敗；代價是 Google Sheet、Schema、BUILTIN 與 runtime 必須同批遷移。過渡雙讀可降低短期 rollout 要求，但會讓舊耦合永久存活，也無法證明所有住宿已完成遷移。名稱別名只把脆弱字串移到另一欄，增加維護面而沒有建立穩定關聯。

### 4. 相容性影響

- Places 新增可辨識欄位 `HID`，App property 為 `hotelId`，aliases 為 `hotelid`／`住宿id`。
- 欄位 header 對整張 Places 表是選填；資料層依列條件驗證：`Type=住宿` 必須填 HID，其他 Type 不得填 HID。
- HID 大小寫與首尾空白在比較時正規化；引用必須存在於 Hotels.HID。多個 Places PID 引用同一 HID 合法，未被引用的 Hotel 主檔也合法。
- Hotels `名稱` 維持 required，但說明改為顯示名稱，不再參與關聯。
- 全域 CMS Schema 由 2.9 升為 3.0；Ledger 的 append-only 21 欄與 record-type 2.9 契約不變。個人備份維持 v9。
- App／SW 升為 v102，確保更新後的 `index.html`、`schema.js`、BUILTIN 與 cache generation 一致；SW lifecycle、cache strategy、SHELL 與 offline fallback 除版本外不變。
- 舊版 App 遇到 Places 末欄新增的 `HID` 只會以既有 `HEADER_UNKNOWN` warning 忽略，因此 Sheet 可先遷移，不會中斷正式站 v73／main v96／dev v101 的名稱比對行為。

### 5. Migration Plan

1. 透過已連線 Google Sheets 讀取 Places 完整使用範圍、sheet metadata 與 P002／P013／P022／P031／P040 現值，保存寫入前證據。
2. 在 Places 現有末欄後新增 header `HID`；以 PID 定位而非假設固定列號，將五列寫入 `H001`。不得修改其他儲存格、欄寬、格式或其他工作表。
3. 回讀 header、五個 PID 與 HID，並讀取公開 CSV，確認發布資料為五列 `H001`。若公開 CSV 尚未更新，只等待發布收斂，不重複寫入。
4. 先加入會因缺少 HID schema／validation／resolver 而失敗的 Node tests，再做最小 runtime 實作。
5. 使用既有 `tools/refresh-builtin-snapshot.js --write` 從公開七表刷新 BUILTIN；工具仍不得讀取 live Ledger，Ledger 保持 schema 推導的空 21 欄 header。
6. 更新 Schema 3.0、App／SW v102、文件與任務狀態，執行完整 gate；只提交並推送 `dev`，不 merge `main`、不部署 production、不建立 production tag。

## Architecture and Data Flow

### Schema and parser

在 `schema.js` 及 `index.html` 的 exact-parity inline fallback schema，為 Places columns 加入：

```js
{ field:'hotelId', header:'HID', aliases:['hotelid','住宿id'], desc:'住宿停靠點引用 Hotels.HID；只供 Type=住宿 使用' }
```

既有 dynamic `buildHeaderMap()`／`parseTable()` 自動把 Sheet 欄位解析為 `place.hotelId`，不新增位置式 parser 或第二份欄位清單。`09_SCHEMA_MAPPING.md` 由 `schemaDoc()` 重新產生，不手改表格區。

### Snapshot validation

`validateSnapshotData()` 在取得 Hotels HID set 與正規化 Place type 後執行以下規則：

1. `Type=住宿` 且 `hotelId` 空白：blocker `HOTEL_REF_REQUIRED`。
2. `hotelId` 非空但 Hotels 中不存在：blocker `BROKEN_REF`，訊息包含 Places PID 與目標 HID。
3. 非住宿 Place 填入 `hotelId`：blocker `HOTEL_REF_SCOPE`。
4. 多個 Places 使用同一 HID：合法，不產生 duplicate warning。
5. Hotels 主檔沒有任何 Place 引用：合法，供未排行程或未來住宿使用。

這些規則同時存在於 `validator.js` 與 `index.html` 的 standalone fallback validation，並由 parity／behavior tests 鎖定。同步維持原子快照語意：任一 blocker 都不發布部分資料，沿用上一份有效 snapshot；沒有上一份時才使用已遷移的 BUILTIN。

### Runtime resolution

`hotelOf(place)` 成為唯一住宿主檔 resolver：

```js
function hotelOf(place){
  var hotelId=String(place&&place.hotelId||'').toUpperCase().trim();
  if(!hotelId) return null;
  return DB.hotels.find(function(h){
    return String(h&&h.hotelId||'').toUpperCase().trim()===hotelId;
  })||null;
}
```

不得保留名稱 substring fallback，也不得在找不到時退回第一筆 Hotel。住宿資訊面板沿用 `hotelOf(p)`；`weatherHotelForItem()` 若已解析到 Place，也必須呼叫同一 resolver，不再自行按 item／Place／Hotel 名稱搜尋。沒有已解析住宿停靠點時，天氣文字可使用既有 item／Place 文字，但不得猜 Hotel 主檔。

### Presentation

畫面結構與文案不變。五個住宿停靠點仍顯示各自 Places 交通與導航脈絡，展開資訊時共同顯示 H001 的入住、退房、地址、停車、日期與備註。Place 名稱或 Hotel 名稱任一方修改後，關聯仍由 HID 決定。

## Test Strategy

### Schema and parsing

- Schema 3.0 Places 欄位包含 `hotelId`／`HID`／aliases，Hotels 名稱說明不再宣告名稱比對。
- `schema.js` 與 inline fallback schema 保持 exact parity。
- 帶 `HID` 的 Places CSV 解析出 `place.hotelId`；舊 runtime 對未知 HID 欄位的 forward-compatible warning 契約維持既有測試。
- `09_SCHEMA_MAPPING.md` 版本與生成表格符合 Schema 3.0。

### Validation

- 五個不同 PID 可共同引用 H001，snapshot 通過。
- 住宿停靠點缺 HID 時產生 `HOTEL_REF_REQUIRED` blocker。
- HID 指向不存在 Hotel 時產生 `BROKEN_REF` blocker。
- 非住宿 Place 填 HID 時產生 `HOTEL_REF_SCOPE` blocker。
- 未被 Places 引用的 Hotel 合法。

### Resolution and UI behavior

- Place 與 Hotel 名稱完全不同，只要 HID 相同仍取得正確主檔。
- 名稱相同但 HID 不同時只依 HID 選取。
- HID 缺少／懸空時 resolver 回傳 `null`，不得選第一間 Hotel。
- `weatherHotelForItem()` 與住宿資訊面板共用 exact resolver。
- Browser 以至少兩個不同 PID 共用 H001，確認兩張住宿卡保留不同交通文字且展開相同住宿明細；320／375／390px 不新增 overflow。

### Complete gate

- 全部 `tests/*.test.js`。
- 全部 Playwright tests。
- `node tools/check-runtime-assets.js`。
- `node tools/check-doc-titles.js`。
- `node tools/check-app-version.js`。
- BUILTIN preview、manifest JSON、`git diff --check` 與 Git ancestry gate。

## Documentation and Task State

- `CONTEXT.md` 新增住宿停靠點與住宿主檔詞條。
- 新增 ADR 0017，記錄以 Places.HID 建立 N→1 關聯、不合併 PID、不保留名稱 fallback。
- `03_DATABASE.md`、`09_SCHEMA_MAPPING.md`、`02_ARCHITECTURE.md` 與 `.ai-manifest.json` 同步 Schema 3.0／HID 關聯。
- `tasks/backlog.md` #22 完成後移至 `tasks/done.md`；`tasks/current.md` 同時記錄 v101 Bar 實機驗收完成與 v102 dev candidate。
- `07_CHANGELOG.md`、`08_AI_HANDOVER.md`、`tests/README.md` 與必要操作文件記錄資料遷移、驗證與回滾。

## Tier 2 Gate

- **原因**：消除住宿名稱耦合、兩份 resolver 漂移與錯誤第一筆 fallback。
- **影響範圍**：Google Sheet Places、Schema／parser／snapshot validation、住宿資訊與天氣 resolver、BUILTIN、App／SW v102、資料與發布文件。
- **風險**：HID 漏填或填錯會讓新 snapshot fail closed；Sheet 與 App schema 在發布收斂前會出現舊版 unknown-header warning；PWA 若混用 v101／v102 資源可能讀到不一致 schema。
- **回滾方式**：程式以 revert 回到 v101，並恢復 v101 `app-version.js`／`sw.js` generation；Sheet HID 新欄對舊版無破壞性，可保留待修，也可依寫入前讀值只清除本次 header 與五個 H001。不得改動五個 PID、交通時間或 Hotel H001 主檔。

## Explicit Non-goals

- 不合併 P002／P013／P022／P031／P040。
- 不搬移各停靠點交通時間到行程表。
- 不以名稱、地址、日期或陣列順序猜住宿。
- 不新增 Hotels 多值 PID／PIDs 欄位。
- 不修改 Hotels.HID、行程引用、Ledger、Shopping、Apps Script、localStorage 或個人備份格式。
- 不重新設計住宿卡 UI。
- 不 merge `main`、不部署 Netlify production、不建立 production tag。

## Acceptance Criteria

1. 線上 Places 的 P002／P013／P022／P031／P040 均以 `HID=H001` 通過回讀與公開 CSV 驗證，其他儲存格未被本批修改。
2. 五個住宿停靠點保留各自 PID、交通時間與導航脈絡，並顯示同一 H001 住宿主檔。
3. Place 或 Hotel 顯示名稱改變不影響關聯；runtime 不再包含住宿名稱 substring 或第一筆 Hotel fallback。
4. 缺少、懸空或使用範圍錯誤的 HID 使 atomic snapshot fail closed，診斷包含明確 PID／HID。
5. CMS Schema 顯示 3.0；Ledger 21 欄 2.9 契約與個人備份 v9 不變。
6. v102 完整自動 gate 通過後只 push `dev`，由 Bar 進行手機實機驗收；未經核准不推進 main／production／tag。

## Rollback

若 runtime 或資料驗證出現不可接受回歸，revert v102 實作與文件 commit，恢復 v101 App／SW；由於 v101 會忽略未知 `HID` header，Sheet 可暫時保留安全等待修正。若需完全回復資料，依寫入前證據只清除 Places 的 HID header 與五個 H001 值，回讀公開 CSV；不得刪除或合併任何 PID，也不得修改 H001。
