# ADR 0016 — Runtime JavaScript Asset Authority

> 狀態：Accepted（2026-08-09，由 Bar 核准 1→2→3→4 架構模組化順序）

## Decision

以 build-time-only `runtime-assets.json` 管理八個 JavaScript runtime assets，並由 `tools/check-runtime-assets.js` 驗證實體檔、`index.html`、SW `SHELL`、README 與 `.ai-manifest.json` 一致。

## Context

新增 runtime module 必須人工同步入口、offline shell與兩份導航文件；既有 PWA test只列舉部分 module，缺一處登錄不一定 fail。

## Alternatives Considered

- 導入 bundler/code generator：對單頁 ES5 PWA 過重且改變部署流程。
- 讓 Service Worker runtime 讀 JSON：增加生命週期與離線 failure surface。
- 繼續在 PWA test手寫清單：沒有單一 inventory authority。

## Why This Decision

靜態 JSON＋純 Node validator 能在不改 runtime 的前提下提供 fail-fast gate。`schema.js`／`validator.js` 依既有 exact-parity 契約仍內嵌於入口，validator 以明確 section marker 驗證。

## Expected Benefits

- 新增/移除 module時任何登錄缺漏都會 deterministic fail。
- PWA shell test可專注版本、icons、manifest與 lifecycle。
- CLI 與 Node tests共用同一 pure validation interface。

## Trade-offs

Inventory 仍需人工更新；它不排序 script、不產生 SW、不檢查 runtime API compatibility。

## Future Impact

新增外部 JS runtime asset 必須先加入 inventory並通過 validator。不得把 registry 轉成 browser loader、bundler、generated file或 `importScripts`；版本與 SW lifecycle 維持既有流程。
