# Ledger Correction Workflow／State Seam Design

> 日期：2026-08-09
> 狀態：Bar 已確認，可直接進入實作計畫
> Runtime 版本：不占用新版本；維持 v98

## Purpose

深化既有 `ledger-ui-state.js`，把 compatibility correction branch 納入與 Ledger entry 相同的 session workflow。Module 只接管 Sheet lifecycle、calendar、reason、preview install/invalidate 與 save pending/completion ordering；更正 eligibility、receipt projection、preview/domain records、commit-last batch、Ledger repository、settlement 與 DOM renderer 留在既有邊界。

## Session Model

Correction 開啟時使用既有 `entrySessionId`，每次最終送出使用既有 `entrySaveRequestId`。`correction` 與 `draft` 為 opaque objects，但 workflow 對 correction metadata 做不可變 container 更新：reason、preview、previewSignature、previewKind。

`matchesEntry` 分為一般 entry 與 correction session guard；任何 async save completion 都必須匹配目前 `sessionId`、`requestId` 且 pending。

## Public Actions

- `open-correction`：要求 correction、draft、sessionId；關閉 actions、mount/render Sheet 並 focus/scroll top。
- `update-correction-reason`：同 session 更新 reason、清 reason error effect，並使既有 preview 無效。
- correction calendar：沿用 `toggle-entry-calendar`、`shift-entry-calendar`、`select-entry-calendar-date`、`close-entry-calendar`，以 session guard 同時支援一般 entry 與 correction。
- `correction-validation-failed`：保留 Sheet，換入 caller 提供的 draft／error，render 並 focus。
- `correction-preview-installed`：同 session 安裝 caller 已建立的 preview/signature/kind，再 render。
- `correction-preview-invalidated`：同 session 清 preview/signature/kind，可附 notification；用於 stale receipt 或 domain preview error。
- `correction-save-requested`：同 session 建立 request ID、pending=true、同步按鈕。
- `correction-save-failed`：只接受匹配 completion，清 pending、保留 Sheet與 preview、通知失敗。
- `correction-save-succeeded`：只接受匹配 completion，清 session、unmount、render split、restore context 並通知 queued/sync 結果。
- `close-correction`：pending 時 fail closed；清 session並還原背景。

## Effect Boundary

沿用 `createWorkflow(adapter)` 的 commit-before-effects 契約。可新增 correction 所需 effects，但 adapter 才能存取 DOM、repository 或 Toast：`clear-correction-reason-error`、`render-entry`、`focus-entry`、`sync-entry-pending`、`notify-entry-result`、`unmount-entry`、`render-split`、`restore-entry-context`。不新增第二個 correction module。

## Characterization and Migration

先鎖定 open→preview→confirm success、reason validation、entry validation、receipt stale、preview build failure、enqueue failure、close/calendar 與 duplicate submit。Node module tests只經 public transition/workflow；browser test 走真實 Sheet lifecycle。Production 完成 wiring 後，移除 `syncLegacyCorrectionSavePending` 與僅鎖 substring/direct assignment 的 legacy assertions，保留 domain correction tests與 repository/browser boundary tests。

## Invariants

- correction 永遠是 shared track，付款人、receipt eligibility 與 domain records 不由 UI module判斷。
- 第一次有效送出只安裝 preview；只有相同 signature/kind 的第二次操作可進入 repository。
- 任何事件集變動造成 stale 時必須 invalidate preview，不能 enqueue。
- pending 時不能 close 或重複送出。
- stale completion 不得關閉較新的 entry/correction session。
- commit-last、canonical selection、append-only finality、資料格式與 settlement 數學完全不變。

## Explicit Non-goals

不改 Ledger domain、repository、Apps Script、schema、record building、preview計算、settlement、權限、DOM markup、文案、版本或部署。

## Deletion Test

若刪除此深化，open/close/calendar/reason/preview/save 又會各自直接改寫 correction、draft、pending 與 Sheet DOM，且 caller 必須重新實作 session/request stale guard 與 effect ordering，符合 deepening 而非 pass-through。
