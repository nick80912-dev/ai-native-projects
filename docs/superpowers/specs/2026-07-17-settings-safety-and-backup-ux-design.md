# Settings Safety and Backup UX Design

## Goal

Make Settings easier to understand on a phone, make ledger test mode impossible to overlook, and simplify personal-state backup without changing any Sheet, Apps Script, ledger, or backup-data contract.

## Approved Scope

This batch contains five related ledger and Settings improvements:

1. Replace the two English cloud-setting labels with user-facing Chinese labels.
2. Show a persistent warning on the ledger page while ledger test mode is enabled.
3. Move identity switching into a compact button beside the current member.
4. Remove the always-visible personal-state JSON textarea. Export copies the JSON automatically; restore opens a dedicated overlay only when requested.
5. Default the first ledger category to `餐飲` and retain the last category for the next entry during the current App session.

The four-tab structure, diagnostic panel, theme placeholder, CMS pre-trip expense block, ledger calculations, schemas, Apps Script contract, and storage keys remain unchanged.

## Chinese Settings Labels

The Settings UI uses:

- `匯率`, with helper text `1 日幣可換算多少台幣`.
- `預設輸入幣別`, with helper text `新增記帳時預先選擇的幣別`.

The internal keys `Exchange Rate` and `Ledger Default Currency` remain unchanged in TripConfig, `schema.js`, Apps Script, tests that validate the data contract, and maintenance documentation. This is presentation-only localization.

## Test Mode Safety

The Settings test-mode heading displays a compact warning label `僅分帳用`.

When `trip_ledger_test_mode` is enabled, the ledger page displays a prominent warning above its entry form:

```text
⚠ 測試模式中
此頁新增的記帳不會列入彙算
[前往設定關閉]
```

The warning uses the existing warning/coral palette without introducing theme functionality. Selecting `前往設定關閉` opens Settings and moves focus or scroll position directly to the test-mode section. The section receives a stable DOM target for this navigation.

Changing the toggle rerenders the ledger page immediately, so the warning appears or disappears without reloading. Existing `[TEST]` detail prefixes and exclusion from totals remain unchanged.

## Compact Member Identity Control

The Settings member row becomes:

```text
目前身分：黃柏  [切換]
```

`切換` is a compact secondary button that opens the existing member selector. At 390px, the row may wrap but must not overflow or obscure the member name. The ledger page continues to display identity without offering a switch control. Changing identity does not modify existing ledger records.

## Ledger Category Continuity

The first ledger entry after each fresh App start defaults to `餐飲`. When the user selects another category, that category remains selected after a successful online write or successful placement into the offline queue and becomes the default for the next entry during the same App session.

The category is held only in the existing in-memory ledger draft state. It is not stored in localStorage, shared across devices, or added to the personal-state backup format. Reloading or reopening the App therefore returns the first entry to `餐飲`, avoiding a stale category from a previous day.

Successful submission clears the existing detail, amount, and note fields but does not clear the selected category. A rejected or failed submission also preserves the current selection so the user can correct the form without reselecting it. The category buttons retain their prominent single-selected state and can be changed with one tap before submission.

## Personal-State Backup and Restore

The section is renamed `本機資料備份／還原`. Its helper text states:

`換手機、重裝 App 或清除瀏覽器資料前使用。還原會覆蓋目前裝置上的打卡、想逛、身分及待同步記帳。`

The settings panel contains two buttons and no persistent JSON textarea:

- `複製備份 JSON`
- `從 JSON 還原`

The backup payload remains version 1 and continues to contain only `checks`, `wants`, `member`, and `ledgerQueue`, plus its existing format and export metadata. Cloud ledger rows, CMS data, exchange settings, test mode, and diagnostic time simulation are not added.

### Export Flow

Selecting `複製備份 JSON` generates the existing formatted JSON and writes the complete string to the clipboard. Success shows:

`備份 JSON 已複製，請保存到安全位置`

Clipboard failure must not discard the generated data. Instead, a fallback overlay opens with the generated JSON selected or readily selectable, explanatory text, a retry-copy action, and a close action. Closing the fallback does not change local data.

### Restore Flow

Selecting `從 JSON 還原` opens a focused overlay containing:

- a concise overwrite warning;
- a multiline JSON paste field;
- `取消`;
- `驗證並還原`.

The restore action reuses the existing format, version, allowed-member, object-shape, queue, ID/time, and ledger-record validation. Invalid input stays in the field and receives the existing specific error feedback so it can be corrected. Cancel closes only the restore overlay and changes nothing.

After successful validation, the app overwrites the same four local-state areas, closes the restore overlay and Settings, rerenders the App, refreshes pending-ledger status, and calls the existing queue flush. Server-side ledger ID deduplication continues to make restored queue delivery safe.

## Accessibility and Interaction

Both backup overlays use the existing full-screen overlay and dialog conventions, with labelled headings, close/cancel controls, and sensible initial focus. Buttons remain large enough for touch even when visually compact. No new `preventDefault`, viewport, gesture, or touch-action behavior is introduced.

## Error Handling

- Clipboard permission or API failure opens the manual-copy fallback with the generated JSON intact.
- Empty, malformed, wrong-version, or structurally invalid restore data is rejected before any localStorage write.
- Restore validation is all-or-nothing; partial local-state replacement is not allowed.
- Existing localStorage and queue-write failure behavior remains unchanged unless a test exposes an atomicity defect within this flow.

## Cache, Files, and Documentation

Because `index.html` behavior changes, `sw.js` changes only `CACHE_NAME` to `okayama-trip-v17`.

Expected implementation scope:

- `index.html`
- `sw.js`
- the directly relevant Settings/ledger UI test file or files
- `07_CHANGELOG.md`
- `tasks/current.md`
- `.ai-manifest.json`

No changes are planned for `schema.js`, `validator.js`, `apps-script/`, ADRs, the other seven Sheet definitions, the four-tab structure, protected project documents, icons, `manifest.webmanifest`, `netlify.toml`, or `tools/`.

## Test Strategy

Automated tests cover:

- Chinese labels are visible while internal TripConfig keys remain unchanged.
- The test-mode marker appears in Settings.
- The ledger warning appears only when test mode is enabled.
- The warning action opens Settings at the test-mode section.
- Turning test mode off rerenders and removes the warning immediately.
- The identity switch button is inline and remains available only in Settings.
- The first ledger category after App startup is `餐飲`.
- A selected category remains selected after online delivery or offline queueing during the same App session.
- Reloading resets the category to `餐飲`, and no category preference is written to localStorage or the personal-state backup.
- Failed validation or delivery preserves the selected category.
- No personal-state textarea is present in the normal Settings view.
- Export copies the entire version-1 JSON payload and shows success feedback.
- Clipboard rejection opens the fallback with exactly the same JSON.
- Restore overlay cancel leaves storage unchanged.
- Valid restore retains the existing success behavior.
- Malformed or invalid restore input performs no writes and remains available for correction.
- SW cache is v17 and all existing tests remain green.

Browser QA covers 390px Settings and ledger layouts, keyboard/focus behavior for both overlays, clipboard success and simulated failure, valid and invalid restore, test-mode navigation and immediate banner removal, ledger/settings regression, and zero page errors.

## Tier 2 Change Gate

- **Level:** C, because this changes Tier 2 `index.html` and `sw.js`, but not schema or data flow.
- **Reason:** Prevent real trip expenses from being silently excluded by a forgotten test-mode toggle, while reducing Settings clutter and improving backup usability.
- **Impact:** Settings presentation and backup/restore interaction, ledger-page warning state, ledger-category draft behavior, related tests and decision-delivery documents, and SW cache v17.
- **Risk:** Clipboard access may be denied; nested overlays or 390px layout may regress; warning state could become stale; a retained category could be accepted without review. The fallback overlay, immediate rerender, prominent selected-category styling, session-only retention, focused tests, and mobile browser QA mitigate these risks.
- **Rollback:** Revert the implementation commit and bump the SW cache again. No Sheet, schema, cloud setting, ledger record, or personal-state format migration is involved.
