# Network Retry and Toast Guard Design

**日期：** 2026-08-09  
**狀態：** 已核准  
**範圍：** backlog #2 的 `fetchSheet` 800ms 退避與 `toast()` null guard

## 1. 目的

目前 `fetchSheet()` 第一次失敗後會立即執行既有第二次請求。短暫斷線、網路介面切換或服務端瞬時忙碌時，兩次請求容易落在同一個失敗窗口。

`toast()` 則假設 `#toast` 一定存在；若啟動未完成、renderer 降級、測試 sandbox 或 DOM 意外缺件時呼叫，通知層會因解參考 `null` 而拋錯，遮蔽原本的主要操作結果。

本切片只強化這兩條失敗路徑，不新增功能或改變資料語意。

## 2. 選定方案

採用最小就地修正：

1. `fetchSheet()` 第一次失敗並寫入既有 `AppLog.sync` 後，等待 800ms，再呼叫既有 `tryOnce()`。
2. `toast()` 取得 `#toast` 後立即檢查；不存在時直接返回，不修改既有 Toast action、timer 或任何業務狀態。

不抽通用 retry module。此處只有一個固定的兩次嘗試契約，通用化會增加介面而沒有第二個 consumer。

## 3. 替代方案

- **通用 retry/backoff helper**：可擴充多次重試與策略，但目前沒有第二個使用者，會把一行固定退避變成淺 abstraction，不採用。
- **增加重試次數或指數退避**：會延長同步完成／失敗時間並改變網路流量，不在核准範圍。
- **toast 缺件時動態建立 DOM**：會讓通知函式兼任 renderer，破壞既有 DOM ownership，不採用。

## 4. 精確行為

### fetchSheet

- 第一次成功：不等待、不寫失敗 log、只呼叫一次 `fetchWithTimeout()`。
- 第一次失敗：先保留既有 `AppLog.sync('<sheet> 第1次抓取失敗…— 自動重試')`，再等待精確 800ms，最後做一次既有重試。
- 第二次成功：回傳 CSV 文字，與現況相同。
- 第二次失敗：保留第二次錯誤 rejection，由既有 snapshot orchestration 處理，不再等待或做第三次請求。
- HTTP 非成功、空 CSV、timeout 與相容 fetch 路徑的判定全部不變。
- 不改 `FETCH_TIMEOUT`、同步狀態、cache、三層防線或資料啟用條件。

### toast

- `#toast` 存在：文字、action、duration、timer、HTML escaping 與 class 行為完全不變。
- `#toast` 不存在：同步安全返回，不拋錯、不建立節點、不執行 action、不啟動 timer。
- guard 不等於吞掉業務錯誤；它只讓通知能力 fail-soft。

## 5. 測試策略

新增 Node 行為測試，執行真實 `fetchSheet()` 與 `toast()`：

- 第一次 fetch 失敗、第二次成功時，事件順序必須是 `fetch → log → 800ms delay → fetch`。
- 第一次成功不得建立 delay 或失敗 log。
- 兩次皆失敗時只等待一次、只嘗試兩次，並回傳第二次 rejection。
- toast 節點缺失時不得 throw，也不得設定 action 或 timer。
- toast 節點存在時沿用既有正常路徑測試，避免 guard 誤傷。

最後執行所有 Node tests、完整 Playwright、文件／版本／runtime assets／JSON／diff gate。

## 6. 不在範圍內

- 不修改 schema、資料格式、fetch timeout、CSV parser、snapshot 原子切換或 renderer。
- 不新增視覺提示、設定選項、retry counter 或 telemetry。
- 不修改 Service Worker lifecycle／cache strategy、`app-version.js` 或 `SW_VERSION`，維持 v98。
- 不 merge `main`、deploy Netlify 或建立 production tag；完成後只推送 `dev`。
