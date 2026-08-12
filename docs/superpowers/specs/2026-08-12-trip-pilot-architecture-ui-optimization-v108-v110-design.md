# Trip Pilot Architecture and UI Optimization v108–v110 Design

**Date:** 2026-08-12

**Status:** Approved for implementation by Bar

**Task class:** C — architecture / Tier 2

## 1. Objective

Improve Trip Pilot's navigation feedback, diagnostic clarity, UI consistency, AI-maintainability, runtime modularity, offline asset structure, and test turnaround without changing the Google Sheet schema, Ledger semantics, user data, four-tab information architecture, six-theme scope, or production release process.

The Service Worker “new version available” prompt is explicitly excluded.

## 2. Current Evidence

- `index.html` is approximately 826 KiB and 11,044 lines. It contains the App shell, CSS, generated BUILTIN data, DOM adapters, and most application behavior.
- The file contains about 980 named functions, including approximately 115 renderers, 109 Ledger-prefixed functions, and 52 Shopping-prefixed functions.
- Existing deep modules (`ledger-ui-state.js`, `shopping-ui-state.js`, `buy-to-ledger.js`, `shopping-photo-store.js`, and `trip-progression.js`) demonstrate that dependency-injected ES5 modules can be introduced without a framework or build step.
- CSS has 388 `font-size` declarations across 34 distinct values and 214 `border-radius` declarations across 26 distinct values. The six-theme color system is already governed by 13 first-level theme tokens and must remain intact.
- The repository has 83 top-level Node test files and 150 Playwright cases. The full browser gate currently uses one worker and takes roughly four to five minutes on the present workstation.
- `.ai-manifest.json` contains a v103 status snapshot while the actual `dev` candidate is v107. This is a governance-document drift, not an App runtime defect.

## 3. Governing Decisions

### 3.1 Preserve the current platform

- Keep vanilla JavaScript, ES5-compatible syntax, static hosting, zero runtime package dependencies, and the existing renderer architecture from ADR 0004.
- Do not introduce React, Vue, a bundler, a generic global store, or a new backend.
- Keep the three-layer boot contract: BUILTIN → local snapshot → background synchronization.
- Keep the four main tabs and six accepted themes.

### 3.2 Use incremental deep modules

Each extraction must hide meaningful behavior behind a small interface. A module is accepted only when callers and tests use the same interface and deleting the module would redistribute real complexity across multiple callers.

Do not create pass-through files whose public interface is as complex as their implementation. Do not split code solely to reduce line count.

### 3.3 Deliver independent batches

The work is delivered as three independently revertible dev candidates. Each batch receives its own TDD cycle, version records when App behavior or the App shell changes, full repository gate, offline Health Check, commit series, and `dev` push. No batch enters `main`, production deployment, or a production tag without separate approval.

## 4. Batch v108 — Navigation Feedback, Diagnostic Impact, and Status Authority

### 4.1 Navigation Intent module

Add an ES5-compatible runtime module, `navigation-intent.js`, loaded before the main App script and registered in `runtime-assets.json` and the Service Worker shell.

Its external interface is intentionally small:

```js
NavigationIntent.create(initialState)
NavigationIntent.request(state, intent)
NavigationIntent.consume(state, view)
NavigationIntent.complete(state, token)
```

An intent contains only serializable transient UI information:

```js
{
  view: 'shopping-list' | 'shop' | 'today' | 'trip' | 'split',
  targetId: string,
  sourceView: string,
  sourceId: string,
  align: 'start' | 'center',
  announce: string
}
```

The module does not read the DOM, storage, Sheet data, or navigation history. The `index.html` adapter owns view or overlay opening, element lookup, scrolling, focus restoration, and announcements. `shopping-list` identifies the existing overlay and must not change `curView`. Navigation intent state is session-only and must never enter localStorage, backup, Queue, CMS, or Ledger.

All explicit target flows must use the same seam:

- Today Hero → Shopping location group.
- Next-stop Shopping badge → Shopping location group.
- Shopping mall entry → corresponding mall.
- “Back to today/current stop” and day targeting where an exact target already exists.

Plain tab switching and re-tapping the active tab keep their current behavior and do not create a target intent.

### 4.2 Target confirmation UI

After a successful explicit navigation:

- Scroll the target below the effective sticky header using the existing viewport-safe behavior.
- Apply one temporary semantic class, `is-navigation-target`, to the target group.
- Provide a concise accessible status, such as `已定位：永旺夢樂城岡山`.
- Preserve the originating view, scroll position, and focus return contract.
- Remove the target treatment after 1.2 seconds. Under `prefers-reduced-motion: reduce`, use the same static treatment without animated transition.
- If the target cannot be resolved, open the destination view at its normal position, show a non-blocking “找不到對應地點” status, record a Render diagnostic, and do not throw.

The confirmation is not a toast that obscures bottom actions. It uses the existing live-status infrastructure or a small visually quiet status row attached to the destination heading.

### 4.3 Diagnostic impact projection

Keep raw AppLog entries and Health Check findings unchanged. Add a display-only pure projection that assigns one of:

- `info`: no current user impact.
- `degraded`: fallback is active; operation may be slower or stale.
- `action-required`: data or an operation needs user attention.

The projection returns user-facing summary, impact, and fallback text while retaining the raw technical message in copied diagnostics. Known Ledger incremental timeout messages display as degraded with CSV fallback and explicitly state that current use remains available. Unknown entries retain their existing category/message and default conservatively to degraded; they are never silently hidden.

No message-text projection may change Health Check pass/fail decisions, retry timing, Queue behavior, storage, or synchronization semantics.

### 4.4 Manifest status authority

Remove volatile product status from `.ai-manifest.json` as an embedded snapshot. Replace the ambiguous version field with a manifest-format identifier that does not include the App version, and keep `tasks/current.md` as the current-status authority.

Add a Tier 1 check that verifies:

- `.ai-manifest.json` parses.
- Its current-status pointer resolves to `tasks/current.md`.
- It does not contain a stale `dev_candidate`, `next_action`, or automated-test-result snapshot.
- App version remains authoritative only in `app-version.js` and `sw.js`, guarded by `tools/check-app-version.js`.

Historical product status remains available through changelog and task archives; no history is silently discarded.

### 4.5 v108 acceptance

- Every explicit targeting entry reaches and visibly identifies the exact target at 320, 375, and 390px.
- Touch, Enter, and Space activation preserve target behavior.
- Close/back restores the originating view and position.
- Reduced-motion behavior is non-animated.
- Raw AppLog content is unchanged; Ledger timeout receives clear degraded/fallback copy.
- No target intent or diagnostic display projection enters persistent data.
- Runtime asset, SW cache, version, offline boot, Health Check, pageerror, Node, Chromium, and focused WebKit gates pass.

## 5. Batch v109 — UI Semantics and Today Module Extraction

### 5.1 Semantic presentation scales

Extend the existing CSS system without changing the six theme palettes. Introduce a small second set of non-theme presentation tokens:

- Typography: caption, meta, body, title, display.
- Spacing: 4, 8, 12, 16, 24.
- Radius: small, control, card, pill.
- Action roles: primary, secondary, quiet, destructive.
- Diagnostic roles: success, warning, degraded, error.

Adopt these tokens only in touched Today, navigation confirmation, diagnostics, and shared action styles. Do not mechanically rewrite every existing declaration in one release. Exact visual equivalence is the default; any intentional visible change must be listed and covered by screenshots or computed-style assertions across all six themes.

No seventh theme, dark mode, tab reorganization, or new design language is included.

### 5.2 Today view module

Extract a `today-view.js` deep module only after v108 navigation behavior is stable. Its interface accepts prepared data and helper functions, then returns view models or HTML; it never reads storage, performs synchronization, or owns global DOM events.

The intended interface is:

```js
TodayView.buildModel(input)
TodayView.render(model, helpers)
TodayView.actionFor(target)
```

The module owns Today-specific presentation decisions, including Hero summary, next-stop projection, generic fallbacks, and action description. The adapter owns DB lookup, current time, weather acquisition, navigation effects, DOM mounting, and persistence.

Extraction proceeds by replacement, not layering: after tests use the new interface, the corresponding production implementation moves out of `index.html`; duplicate legacy functions are removed in the same commit. Existing renderer escaping, next-stop authority, product-name privacy, blank-category `未分類`, and exact target behavior remain unchanged.

### 5.3 Ledger extraction decision gate

Do not split all Ledger DOM code during v109. After Today extraction, record the interface and test leverage achieved. A Ledger adapter is extracted only if one independently testable seam can replace duplicated caller knowledge without changing settlement, correction, Queue, or record semantics.

The first allowed candidate is Ledger history presentation because `ledger-ui-state.js` already owns its state transitions. Entry, settlement, calculator, and correction are explicitly excluded from opportunistic extraction. If the deletion test shows no meaningful complexity reduction, record the finding and leave the production code in place.

### 5.4 v109 acceptance

- Today behavior, visible copy, accessibility names, and navigation are unchanged except for the approved v108 target feedback.
- Six themes retain their accepted colors and AA contrast checks.
- 320, 375, and 390px have zero horizontal overflow.
- Module tests exercise the same interface used by production.
- No duplicated Today implementation remains in `index.html`.
- Full Node, Chromium, focused WebKit, offline boot, Health Check, pageerror, document, runtime-asset, and diff gates pass.

## 6. Batch v110 — BUILTIN Asset Spike and Test Throughput

### 6.1 Generated BUILTIN asset

Treat externalization as a gated implementation spike because BUILTIN is a Tier 3 generated artifact and the no-blank-page contract is more important than reducing HTML size.

Change the snapshot generator—not generated data by hand—to produce `builtin-snapshot.js`. The generated file defines the same timestamp and snapshot data currently embedded in `index.html`. It must be loaded before application boot and included in `runtime-assets.json`, the Service Worker shell, offline tests, and version-integrity tests.

The App must safely handle:

- New HTML with new snapshot asset.
- Cached HTML and cached matching asset.
- Asset request failure with an existing valid local snapshot.
- Mixed-cache attempts without activating mismatched App/SW/snapshot versions.
- Offline PWA reopening after successful installation.

If a fresh online load cannot retrieve either the generated snapshot asset or a valid local snapshot, the App must render an actionable non-blank recovery state. It must not continue with an empty DB.

The external asset ships only if all of the following are proven:

- The three-layer boot contract remains intact.
- Mixed-version shell tests pass.
- Offline and Pages subpath tests pass.
- Initial render does not regress materially on the present device/browser test setup.
- `tools/refresh-builtin-snapshot.js` retains preview-first, atomic write, no-live-Ledger, and no-manual-edit guarantees.

If any condition fails, the spike is reverted and inline BUILTIN remains authoritative. The validated generator/test improvements may remain only if they independently improve safety.

### 6.2 Playwright throughput experiment

Run the full browser suite with two workers at least three consecutive times on a clean committed tree. Compare pass/fail stability and wall time with the one-worker baseline.

- If all runs pass without order dependence, shared-state leakage, port conflict, or intermittent failure, use two workers in CI while retaining an explicit one-worker troubleshooting command.
- If any unexplained flake appears, keep one worker and record the evidence; speed is not allowed to weaken determinism.
- Focused development tests remain scoped and fast regardless of the full-gate worker decision.

### 6.3 v110 acceptance

- No hand editing of generated BUILTIN content.
- Snapshot refresh preview/write/no-drift contracts pass.
- App/SW/snapshot versions cannot mix silently.
- Offline boot and Health Check remain clean.
- Playwright worker change is adopted only with three clean full-suite runs.
- All delivered changes are independently revertible; no production release occurs.

## 7. Testing Strategy

Every behavioral change follows RED → GREEN. Required coverage includes:

- Pure module unit tests for Navigation Intent, diagnostic impact, Today view, and generator decisions.
- Characterization tests before moving existing Today behavior.
- Browser tests for exact targets, return context, focus, live announcement, reduced motion, six themes, and 320/375/390px overflow.
- Focused WebKit touch tests for Hero/Shopping targeting.
- Full top-level Node and Playwright suites.
- App/SW/runtime asset/version checks, manifest parsing, document-title check, BUILTIN no-drift, `git diff --check`, offline `healthCheck(): []`, and `pageErrors: []`.

## 8. Rollback

- Each batch is separately committed and versioned.
- Runtime regressions use `git revert` on `dev`.
- Service Worker rollback uses a forward version bump with the previous known-good content; never delete `sw.js` and never rewrite remote history.
- BUILTIN externalization has an explicit kill switch: revert the generated-asset batch and restore the prior inline generator path.
- Schema, Google Sheet data, Apps Script, Ledger record semantics, `main`, production deployment, and production tags remain untouched.

## 9. Explicit Non-Goals

- Service Worker “new version available” UI.
- React, Vue, bundlers, TypeScript migration, or external runtime dependencies.
- Multi-trip platform work or AI Native Framework extraction.
- Schema, Sheet columns, IDs, Ledger payloads, backup format, or stored Shopping data changes.
- Dark mode, a seventh theme, bottom-tab redesign, or broad visual rebranding.
- Full Ledger rewrite or speculative file splitting.

## 10. Delivery Order

1. Bar reviews and approves this written specification.
2. Produce a detailed implementation plan with exact files, interfaces, RED/GREEN tests, commits, and per-batch gates.
3. Execute v108 and push `dev`; Bar performs device/PWA verification.
4. After v108 verification, execute v109 and push `dev`.
5. After v109 verification, execute the v110 spike and ship only the portions that meet its kill criteria.
