# TripPilot B：本機進度寫入可靠性 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 打卡、完成、略過及撤銷，只有確認儲存後才顯示成功。

執行記錄（2026-10-05）：Bar 最新核准限定 v144 本機實作與提交，不含 push／merge／部署。Task 3 的遠端步驟保留未勾、待另行授權，不算本次本機交付義務；現況以 `tasks/current.md`、驗證以 `docs/trippilot-v144-b-verification.md` 為準。B 使用者驗收後才開始 C。

**Architecture:** 在新 generation UI 加局部 checked writer，保留原始 bytes，寫後核對、失敗盡力恢復；不改全域 lsSet。TripProgression 保留純決策，adapter 處理儲存結果。

**Tech Stack:** 現有 JavaScript、localStorage、Node assert／vm、Playwright。

**Spec:** [第一批設計 §6](../specs/2026-10-03-trippilot-reliability-and-clarity-batch1-design.md)。須讀[共用規則](2026-10-03-trippilot-batch1-index.md)。

## Global Constraints

- 「不是資料庫級原子性」；不新增持久化交易紀錄或跨分頁鎖。
- 「不改完成／略過判斷、時間門檻、下一站排序或群組阻擋規則。」
- 只處理 `trip_checks`／`trip_next_stop_progress` 相關打卡與行程進度；店家願望、帳務、個人備份／封存不改。
- G 依索引實查，不改凍結外殼；不清空使用者資料。

## Review Focus

1. 第一鍵成功／第二鍵拒絕：恢復精確 bytes，不能留下假成功（Task 1）。
2. removeItem／恢復 setItem 也失敗：顯示保守警告，不假稱原狀（Task 1）。
3. 讀取 denied 或 corrupt JSON：不以空物件覆蓋可恢復資料（Task 1）。
4. 自動略過重渲染：不無限提醒、錯跳下一站（Task 2）。
5. 撤銷前項目原為自動略過：恢復 autoSkip 與 checks，不能只恢復 done／skip（Task 2）。

## File Structure

- 新 generation UI 與登記依索引；不改 `trip-progression.js` 的算法。
- 新建 `tests/trip-progress-persistence.test.js`、`tests/browser/trip-progress-persistence.spec.js`。
- 現有回歸：`trip-progression.test.js`、`pick-next-stop.test.js`、`parent-first-stop-cluster.test.js`、`trip-checkin-a11y.test.js`、`trip-lifecycle-wiring.test.js`。
- UI 呼叫點：`toggleCheck`、`saveNextStopProgress`、`setItemCompletion`、`autoSkipStaleItem`、`onCheck`、`pickNextStop`、cluster controller 完成、`snapshotNextStopState`、`undoNextStopAction`、`onNextStopDone`／`onNextStopSkip`。實作前重新 rg 呼叫點，避免只修按鈕。

### Task 1: Checked local writer 與單筆完成

**Interfaces:** `writeTripProgressChecked(storage, entries)` → `{ok,restored,error}`；entries 為 `{key,value}` 陣列，value 是 JSON-compatible 值。`restored` 僅失敗且所有 old bytes／不存在狀態已核對恢復時 true。`readTripProgressChecked(storage)` → `{ok,checks,progress,error}`，拒絕無法解析或型別錯誤的內容，不默認可覆寫空值。`setItemCompletion(...)` 回傳 writer result，狀態資料 shape 不變。

核心測試使用 mock 的 `failOnceOn(key)`／`snapshot()`，原始值含空白以核對 bytes：

```js
const before=storage.snapshot();
storage.failOnceOn('trip_checks');
const result=writeTripProgressChecked(storage,[{key:'trip_next_stop_progress',value:nextProgress},{key:'trip_checks',value:nextChecks}]);
assert.strictEqual(result.ok,false);
assert.strictEqual(result.restored,true);
assert.strictEqual(storage.snapshot(),before);
```

- [x] **Step 1 — RED tests:** 新建 Node test，vm 載入 UI helper；storage mock 可指定 get／set／remove／第 N 次呼叫失敗。覆蓋成功、首鍵失敗、次鍵失敗、讀回 mismatch、恢復失敗、原鍵不存在、JSON stringify 失敗、read denied、corrupt JSON。斷言 restored true 時 snapshot 完全相等；恢復失敗 `{ok:false,restored:false}`；讀失敗沒有 setItem。
- [x] **Step 2 — Verify RED:** `node tests/trip-progress-persistence.test.js`；新 helper 缺失或錯誤成功斷言失敗。
- [x] **Step 3 — Minimal implementation:** 在新 generation 定義上述 helper。先驗證／序列化全部 payload、保存所有舊值，再寫入及逐鍵核對；失敗恢復已嘗試鍵並核對。不把「沒拋例外」當成功；讀取失敗或 corrupt JSON 停止 mutation。保留診斷而不輸出完整個人內容。單筆完成先計算 next checks／progress，再一次交給 writer。
- [x] **Step 4 — Verify GREEN:** Node 新 test 與 `node tests/trip-progression.test.js`、`node tests/pick-next-stop.test.js` 通過；不修改純算法測試預期來配合新行為。
- [x] **Step 5 — Commit:** UI、generation 登記、Node test；訊息 `fix: verify local trip progress writes`。

### Task 2: 所有相關 effect、撤銷與錯誤 UI

**Interfaces:** 消費 Task 1 result。新增 `reportTripProgressFailure(result, operationKey)`，一般失敗「這次操作未能儲存，請稍後重試」；恢復未確認「紀錄可能未完整儲存，請查看資料健康狀態」。operationKey 僅 session 去重，不寫 storage。`snapshotNextStopState` 增加記憶體欄位 `prevAutoSkip`，只有成功操作才替換 `lastNextStopAction`。

- [x] **Step 1 — RED tests:** 擴充 Node test 驗證 onCheck／完成／略過失敗沒有成功 toast 或新 undo action；撤銷失敗保留重試快照；prevAutoSkip 恢復；auto reconcile failed 不吐成功 notification，回傳由讀回持久化進度以 `isToday:false` 得到的 pick，避免重試循環。重複 render 同 operationKey 不重複提醒；新的手動重試仍可顯示結果。
- [x] **Step 2 — Verify RED:** 執行新 Node test，預期舊無條件 toast／快照行為失敗。
- [x] **Step 3 — Minimal implementation:** 完成所有列出的 callers；自動略過將最終 autoSkip 與進度一次計算，不分開存中間狀態。成功才動 DOM 成功狀態及清除／替換 undo；失敗重新讀實際資料，無法讀取則顯示錯誤，不能以假空狀態前進。重繪不再次自動觸發相同失敗寫入。沿用既有 toast／可及錯誤區與診斷入口，不新增全域彈窗或新頁面。
- [x] **Step 4 — Browser tests:** 用 qa-fixture、隔離 localStorage fault injection 測第一／第二鍵拒絕、撤銷失敗、恢復失敗、重整後實際紀錄、鍵盤焦點、group controller、autoSkip notification 去重。實際點擊後斷言 DOM／storage／undo 一致；fixture 不影響遠端或使用者資料。對恢復失敗只驗 UI 如實提示及反映可讀實際值，不強求兩鍵一致。
- [x] **Step 5 — Verify GREEN:** `node tests/trip-progress-persistence.test.js`、上述所有現有回歸，以及 `npx playwright test tests/browser/trip-progress-persistence.spec.js tests/browser/today-live-info.spec.js tests/browser/trip-three-scenarios.spec.js` 全數通過。
- [x] **Step 6 — Commit:** UI 及測試，訊息 `fix: gate trip progress success UI on persistence`。

### Task 3: B 交付 gate

**Interfaces:** 成功／失敗契約僅供當前進度 callers，不要求 C 依賴。

- [x] 更新現況／changelog／裝置待驗與 writer 非原子性限制；查 diff 確認沒有全域 lsSet、購物願望或 ledger 改動。
- [x] 索引全套 QA 與核准方法的獨立審查；加入 reload 後持久化核對、離線／旅行日及清除旅程後不重新生成進度紀錄的回歸。
- [ ] 按使用者 push 指示推 dev、核對 exact-head CI 與測試站；驗收通過才進 C。正式 main 不自動發布。
