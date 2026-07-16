# Fuel 類型與 Day 6 父子卡稽核設計

## 背景

公開 Places Sheet 已補齊先前缺少的 PID、Type、樓層與 Shopping 引用。目前唯一阻擋整批 Sheet candidate 通過 Gate 的項目，是 P045「岡山機場加油站」使用尚未註冊的 Type `加油站`。

本次同時確認：

- P045 是岡山機場加油站。
- P046 是 ORIX租車 岡山機場，維持 Type `租車點`。
- Day 6 已有可驗證的完整行程內容，可納入父子行程卡稽核。
- Day 2「回住宿休息」引用 P013 是正確資料，不再要求改成 P002。

## 目標

1. 新增獨立 normalized Type `fuel`，讓 Places Type `加油站` 通過 Schema 與資料 Gate。
2. 在行程頁及首頁 NEXT STOP 顯示明確的 `⛽ 加油站` 類型標籤。
3. 行程頁的加油站資訊按鈕顯示為 `⛽ 加油資訊`，沿用既有地點資訊欄位。
4. 將 Day 6 父子卡稽核結果加入高優先待辦的回歸範圍。
5. 移除 Day 2 P002 修正待辦，明確記錄 P013 為正確引用。

## 非目標

- 本批不修改 `getChildStopCluster()` 或父子卡 runtime 行為。
- 本批不新增油價、油品、品牌、付款方式等 Sheet 欄位。
- 本批不調整 P045、P046、P047 的 Sheet PID。
- 本批不更新 BUILTIN Sheet 快照內容。
- 本批不推送或部署，除非使用者另行要求。

## Fuel Schema 設計

Places Type mapping 新增：

```js
'加油站':'fuel',
'fuel':'fuel'
```

`加油站` 必須映射到獨立 `fuel`，不可映射成 `parking` 或 `attraction`。`fuel` 使用既有 Places 欄位：

- `地點`
- `MAPCODE`
- `交通/交通時間`
- `停車`
- `營業時間`
- `官網`
- `備註`

Schema 的 Type 說明同步加入 `加油站`。獨立 `schema.js`、`index.html` inline fallback Schema 與 `09_SCHEMA_MAPPING.md` 必須保持一致。

## Fuel UI 設計

### 類型標籤

`typeTag()` 對 `tnorm === 'fuel'` 回傳：

```js
{ cls:'move', label:'⛽ 加油站' }
```

沿用 `move` 視覺樣式，不新增 CSS 類別。這能讓加油站在行程頁、首頁 NEXT STOP 及父子卡子站摘要使用一致標籤。

### 資訊按鈕

行程卡資訊按鈕對 `fuel` 顯示：

```text
⛽ 加油資訊
```

資訊面板沿用一般 Place 的 `infoPanel()`，顯示既有營業時間、官網與備註。若日後 Sheet 提供 MAPCODE 或停車欄，既有停車面板仍照原規則出現；本批不建立 Fuel 專用面板或新資料欄。

### 導航與進度

導航、完成、跳過、自動略過及 localStorage 狀態行為完全沿用現況。`fuel` 只影響 Schema normalization、類型標籤及資訊按鈕文字。

## Day 6 父子卡稽核

依已核准規則：

- 父列本身具有地點或 ID 時，父列成為第一個子站。
- 後續連續「行程」欄空白且具有地點或 ID 的列，成為第二及後續子站。
- 父列第一站加上一個後續子站，合計兩站即可成立父子卡。
- 父卡只負責展開與收合；所有子站可精確導向同日行程卡。

Day 6 確認有兩組目前 runtime 會漏判的父子卡：

1. `岡山城巡禮`
   - 第一站：09:00 岡山城（P041）
   - 第二站：10:30 岡山後樂園（P042）
2. `神社巡禮`
   - 第一站：13:00 吉備津彥神社（P043）
   - 第二站：14:00 吉備津神社（P044）

高優先父子卡待辦應取消 Day 6 排除條款，保留既有 Day 2–5 十個稽核確認地點，並加入上述 Day 6 兩組、四個子站作為回歸案例。本批只記錄稽核結果，不實作父子卡修正。

## Day 2 引用決策

Day 2 最後一站目前為：

```text
21:00 回住宿休息 / Guest House Life Field / P013
```

P013 是本行程該段使用的正確 Places 引用。移除 backlog 中「P012 → P002」修正項，不修改 Sheet，也不新增 P002 替代規則。

## 測試策略

### Schema 測試

`tests/schema-types.test.js` 增加以下契約：

- `加油站` 映射為 `fuel`。
- normalized `fuel` 映射為 `fuel`。
- inline fallback Schema 包含相同 mapping。
- `09_SCHEMA_MAPPING.md` 仍由 `schemaDoc()` 產生且與 Schema 一致。

測試必須先在現行程式上失敗，再進行實作。

### 顯示測試

`tests/trip-presentation.test.js` 增加：

- `typeTag()` 對 `fuel` 顯示 `⛽ 加油站`。
- Fuel 沿用 `move` class。
- 行程資訊按鈕 mapping 包含 `fuel:'⛽ 加油資訊'`。

### Gate 與完整回歸

完成實作後重新下載七張公開 CSV，套用現行 `validateCandidateStructure()`、`createDB()` 與 `validateSnapshotData()`：

- structure blockers 必須為 0。
- validation blockers 必須為 0。
- P045 必須解析為 `tnorm === 'fuel'`。

最後執行所有 `tests/*.test.js`、文件標題檢查、inline JavaScript syntax check 與 `git diff --check`。

## 文件與待辦更新

- `09_SCHEMA_MAPPING.md`：加入 `加油站` Type。
- `tasks/backlog.md`：
  - Day 6 改為已稽核，加入兩組回歸案例。
  - 移除 Day 2 改成 P002 的待辦。
- `07_CHANGELOG.md`：記錄 Fuel 類型與 Day 6 稽核結果。

## 驗收條件

- 公開 Sheet candidate 不再因 P045 Type `加油站` 被 Gate 擋下。
- P045 在行程頁與首頁顯示 `⛽ 加油站`。
- P045 行程資訊按鈕顯示 `⛽ 加油資訊`。
- P046 仍解析為 `parking`，顯示既有租車類型。
- Day 6 兩組父子卡已加入高優先回歸範圍，但 runtime 尚未改動。
- Day 2 P002 修正待辦已移除，P013 明確列為正確引用。
- 所有既有測試及新增測試通過。
