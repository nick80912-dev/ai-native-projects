# Ledger Entry, Cloud Settings, and Gesture Diagnostics Design

## Goal

Refine the ledger entry experience, make the exchange rate and default entry currency shared cloud settings, and restore evidence-only iOS gesture diagnostics without changing the approved scroll-only zoom policy.

## Approved Product Behavior

- The ledger page displays the current member but has no identity-switch button. Identity changes remain available only in Settings.
- The healthy sync label is `已同步`; the status dot remains, but the text has no leading check mark.
- Ledger category is a required single-choice button group with exactly six values: `餐飲`, `交通`, `票卷`, `購物`, `其他`, `代墊`.
- A ledger entry accepts one editable currency at a time. The user can choose JPY or TWD for that entry, and the other amount is a read-only live conversion.
- Both converted amounts are stored in the existing ledger record so cross-device totals remain consistent.
- Settings displays and edits the shared exchange rate and the shared default ledger input currency.
- Gesture diagnostics is restored as evidence collection only. This batch does not restore the retired JavaScript double-tap blocker and does not permanently restrict viewport scaling.

## Data Model and Schema

Schema advances to `2.5 (2026-07-17)`. The existing TripConfig key/value sheet remains the single source of truth and adds:

| Key | App field | Validation | Meaning |
|---|---|---|---|
| `Exchange Rate` | `exchangeRate` | finite number greater than 0 | TWD value of one JPY, for example `0.2` means `1 JPY = NT$0.2` |
| `Ledger Default Currency` | `ledgerDefaultCurrency` | `JPY` or `TWD` | Initially selected editable currency for a new ledger entry |

The existing `Currency` TripConfig key remains unchanged because it describes the trip currency and is not repurposed as ledger UI state. The other seven existing sheet definitions and the eight-column ledger schema remain unchanged.

The built-in TripConfig fallback includes `Exchange Rate,0.2` and `Ledger Default Currency,JPY`. `schemaDoc()` regenerates the TripConfig section in `09_SCHEMA_MAPPING.md`.

The production TripConfig rows are positionally exact key/value rows:

```csv
Key,Value
Exchange Rate,0.2
Ledger Default Currency,JPY
```

## Apps Script Source of Truth

The repository will contain:

- `apps-script/ledger-sync.gs`: the complete deployable Apps Script source.
- `apps-script/README.md`: deployment ownership, required Sheet names, request/response contracts, version deployment steps, and live verification commands.

The GitHub source is the maintenance source of truth. The Apps Script editor contains the deployed copy. A deployment change is not considered complete until the repository source and deployed version match.

## Apps Script Contract

One `/exec` deployment handles two operations under the existing script lock.

### Ledger append

The existing payload remains backward compatible:

```json
{"id":"...","time":"...","member":"...","category":"餐飲","detail":"...","amountJpy":1000,"amountTwd":200,"note":"..."}
```

Responses remain `{ "ok": true }`, `{ "ok": true, "dup": true }`, or `{ "ok": false, "error": "..." }`.

The current validation expression `!d.amountJpy === undefined` is corrected. A ledger write requires a non-empty ID and member plus finite numeric JPY and TWD amounts. Server-side ID deduplication and append-only behavior remain unchanged.

### Cloud settings update

The new payload is:

```json
{"action":"updateSettings","exchangeRate":0.2,"defaultCurrency":"JPY"}
```

The server validates a finite positive rate and a currency of `JPY` or `TWD`, locates the `Exchange Rate` and `Ledger Default Currency` rows in `TripConfig`, and updates their Value cells. Missing keys are appended as new key/value rows. A successful response is:

```json
{"ok":true,"settings":{"exchangeRate":0.2,"defaultCurrency":"JPY"}}
```

Concurrent updates are serialized by `LockService`; the last completed write wins. The endpoint remains unauthenticated as documented in ADR 0006. Settings writes require connectivity and are not queued. On failure, the app keeps the last confirmed settings and shows an error.

The Apps Script settings operation is a fixed two-key whitelist, not a generic key/value update API. It may write only `Exchange Rate` and `Ledger Default Currency`. All other TripConfig keys remain Bar-managed and are never accepted from an App payload.

## CMS Write Invariant

Google Sheets remains a Bar-managed CMS. The App has exactly two write capabilities through Apps Script: append-only rows in `分帳紀錄`, and updates to the TripConfig keys `Exchange Rate` and `Ledger Default Currency`. Every other TripConfig key and every other Sheet remains read-only to the App. ADR 0006, `08_AI_HANDOVER.md`, `.ai-manifest.json`, and the Apps Script README must carry this same whitelist.

## Settings Synchronization

TripConfig CSV remains the cross-device read channel, so another device may observe a change after the accepted 1–5 minute publication delay. On a successful settings POST, the writing device immediately updates its in-memory `DB.cfg` values and stores a confirmed local bridge copy. The bridge prevents an immediate reload from reverting to an older published CSV value. It is discarded once a later TripConfig CSV contains the same settings.

The bridge is cloud-derived application state, not personal state, and is not added to the personal JSON export/restore contract.

Before publishing the Schema 2.5 frontend, deploy the Apps Script settings contract and POST the initial settings through the real endpoint. The endpoint must upsert both rows, and the published TripConfig CSV must show the exact keys and values before frontend publication. Manual Sheet row creation is a recovery fallback only, not the normal initialization path.

## Ledger Entry UI

The form renders the current member as text only. Category buttons have one selected state and no initial selection, preventing accidental categorization. Submission is blocked until a category is chosen.

The amount area contains a JPY/TWD choice. TripConfig `ledgerDefaultCurrency` controls the initial choice for each new entry. Only the selected currency has an editable numeric input. The other currency is displayed as a read-only converted preview beside the current rate label `1 JPY = NT$X`.

Conversion rules:

- JPY input to TWD: `Math.round(jpy * exchangeRate)`.
- TWD input to JPY: `Math.round(twd / exchangeRate)`.
- Switching the editable currency promotes the current converted preview to the new editable value so the economic amount is preserved.
- Both `amountJpy` and `amountTwd` are written to the existing ledger contract.
- A missing, non-finite, zero, or negative exchange rate disables ledger submission and displays `匯率未設定`.

The existing TEST prefix, offline ledger queue, duplicate handling, reversal model, per-member totals, group totals, and pre-trip CMS expense block remain unchanged.

## Sync Status

The healthy state changes only from `✓ 已同步` to `已同步`. The colored status dot and all other sync states remain unchanged.

## Gesture Diagnostics

The earlier evidence collector is restored with a 24-record ring buffer. It records `touchstart`, `touchend`, `gesturestart`, `gestureend`, `dblclick`, and `visualViewport.resize`. Each record includes target summary, computed touch-action, viewport dimensions and scale, scroll position, touch count, and timestamp.

The existing hidden peach double-tap opens the diagnostic panel. The current Health Check, time simulation, and trip-progress reset sections remain. A new `iOS 手勢診斷` section shows the report and provides `複製手勢診斷報告` and `清除手勢事件` actions.

The report includes user agent, standalone state, viewport meta, Schema version, SW cache version, current viewport snapshot, and newest-first event history. Event collection is passive and must not call `preventDefault()` or alter zoom behavior.

## Cache and Documentation

Because `index.html` behavior changes, `sw.js` advances only `CACHE_NAME` to `okayama-trip-v15`. Documentation updates cover Schema 2.5, the Apps Script source location and settings contract, restored diagnostics, changelog, current task status, AI handover, manifest, database, architecture, test index, and regenerated schema mapping.

## Test Strategy

TDD covers:

- the split page has no identity-switch control;
- healthy sync text has no check mark;
- the six fixed categories are required and single-select;
- JPY and TWD conversion in both directions and integer rounding;
- changing the editable currency preserves the converted value;
- both amounts are sent to the ledger repository;
- invalid rates block ledger writes;
- TripConfig parses and validates both new keys;
- settings POST success updates confirmed local state while failure retains prior settings;
- Apps Script source contains operation dispatch, strict validation, key upsert, lock release, and legacy ledger deduplication;
- gesture diagnostics records the approved event set, caps history at 24, formats reports, and exposes copy/clear controls without preventing gestures;
- SW v15 and the complete existing test suite remain green.

Browser QA covers 390px layout, category selection, both currency directions, settings save success/failure, member switch availability only in Settings, sync label, diagnostic report capture, zero page errors, offline ledger queue behavior, online flush, and travel-date simulation. Final verification includes every `tests/*.test.js`, document-title check, `git diff --check`, production-data `healthCheck()`, and live Apps Script settings plus ledger duplicate acceptance after deployment.

## Rollback

Revert the frontend commit and bump the SW cache again. Revert the Apps Script deployment to the preceding version. TripConfig setting rows can remain because older clients ignore unknown keys; ledger records remain append-only and unaffected.
