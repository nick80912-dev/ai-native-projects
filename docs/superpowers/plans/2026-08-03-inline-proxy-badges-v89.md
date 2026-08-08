# v89 Inline Proxy Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the personal-ledger proxy target beside the item name, reuse the shopping-card target markup, and render 「幫／買」 one pixel smaller without changing stored data or interactions.

**Architecture:** Keep the existing single-file runtime and extract the shopping target HTML into `renderProxyTargetMarkup(model, extraClass)`. Both shopping items and ledger records consume that renderer; ledger records add a wrapping title row while preserving the existing two-column amount layout and batch-parent summary.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Node `assert` tests, Playwright browser tests, service-worker version checks.

## Global Constraints

- Release version is v89; `app-version.js` and only the version string in `sw.js` advance to v89.
- The target presentation is `品名 幫 [姓名] 買`; target badge stays 10.5px and affixes become 9.5px.
- Dashboard recent records, full history, and expanded batch children share the same ledger renderer; batch parents retain `N 項代購`.
- No schema, ledger record, shopping allocation, synchronization, backup, deployment, `main`, or tag changes.
- Preserve the pre-existing untracked `docs/superpowers/plans/2026-08-02-ui-ux-hardening.md`.
- Push `dev` only after the full local verification suite passes.

---

### Task 1: Lock the Shared Markup Contract with Failing Node Tests

**Files:**
- Modify: `tests/ledger-list-actions.test.js`
- Modify: `tests/shopping-list.test.js`

**Interfaces:**
- Consumes: `shoppingCardTargetModel(item)` and `renderLedgerRecentRecord(record, options)` from `index.html`.
- Produces: a tested requirement for `renderProxyTargetMarkup(model, extraClass)` and inline ledger title markup.

- [ ] **Step 1: Add ledger behavior assertions**

Add a proxy record fixture and assert that its rendered HTML contains a `.ledger-item-title-row` with the item `<strong>` followed by a `.ledger-proxy-target-summary`, exposes `aria-label="幫Bar買"`, and no longer contains `>代購 Bar<` in `.ledger-recent-badges`. Also assert non-proxy/shared badges and batch-parent `N 項代購` output stay intact.

- [ ] **Step 2: Add shared shopping-renderer assertions**

Extend the shopping renderer fixture to expect calls through `renderProxyTargetMarkup`, escaped target text, the existing multi-target overflow text, and CSS contracts `font-size:10.5px` for `.shopping-target-badge` plus `font-size:9.5px` for `.shopping-target-affix`.

- [ ] **Step 3: Run focused tests and record the red state**

Run:

```powershell
node tests/ledger-list-actions.test.js
node tests/shopping-list.test.js
```

Expected: FAIL because the ledger still renders `代購 姓名` below the title and the affix/shared-renderer contracts are absent.

---

### Task 2: Implement the Shared Inline Proxy Presentation

**Files:**
- Modify: `index.html`
- Test: `tests/ledger-list-actions.test.js`
- Test: `tests/shopping-list.test.js`

**Interfaces:**
- Consumes: target models shaped as `{prefix:string,names:string[],overflow:string,suffix:string,ariaLabel:string}`.
- Produces: `renderProxyTargetMarkup(model, extraClass): string`.

- [ ] **Step 1: Add the shared renderer**

Implement `renderProxyTargetMarkup(model, extraClass)` so an empty name array returns `''`; otherwise it emits one outer `.shopping-target-summary`, escaped optional extra class, complete escaped `aria-label`, aria-hidden prefix/name/overflow/suffix fragments, and the existing target badge classes.

- [ ] **Step 2: Route shopping cards through the renderer**

Replace the duplicated string assembly in `renderShoppingItem()` with:

```js
var targetMarkup=renderProxyTargetMarkup(targetModel,'shopping-card-target-summary');
```

Retain multi-person and `+N` semantics from `shoppingCardTargetModel()`.

- [ ] **Step 3: Move ledger proxy metadata into the title row**

In `renderLedgerRecentRecord()`, construct a one-target model from `ledgerRecordMetadata(record)` using `未指定` for a missing target. Render the result immediately after the item `<strong>` inside `.ledger-item-title-row`, and stop pushing the old `代購 姓名` lower badge. Do not alter group/shared badges or batch-parent summaries.

- [ ] **Step 4: Add wrapping and typography CSS**

Add a wrapping `.ledger-item-title-row` that remains within `.ledger-recent-main`, keep the target group inline-flex, and set `.shopping-target-affix` to `font-size:9.5px;line-height:1.3`. Leave `.shopping-target-badge` at 10.5px and the item name at 14px.

- [ ] **Step 5: Run focused tests to green**

Run:

```powershell
node tests/ledger-list-actions.test.js
node tests/shopping-list.test.js
```

Expected: PASS.

---

### Task 3: Verify Responsive Runtime Behavior

**Files:**
- Create: `tests/browser/proxy-inline.spec.js`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: the real offline app fixture, personal-ledger repository, shopping-list store, and rendered dashboard/history/overlay DOM.
- Produces: repeatable browser evidence for inline layout at 320px, 375px, and 390px.

- [ ] **Step 1: Add Playwright fixtures**

Create deterministic proxy ledger records and shopping items covering short and long item/target names, plus an expanded proxy batch child. Open dashboard recent records, full ledger history, and the shopping overlay through their real UI/runtime entry points.

- [ ] **Step 2: Assert content, DOM order, and typography**

For each surface, assert item name and proxy summary share the title row, the summary reads `幫…買`, no lower `代購 姓名` badge exists, affixes compute to 9.5px, and target badges compute to 10.5px. Assert the batch parent still reports `N 項代購`.

- [ ] **Step 3: Assert geometry at three viewports**

At 320px, 375px, and 390px, measure title/summary/amount/menu rectangles and document scroll widths. Assert no horizontal overflow and no intersection between the left title region and right amount/menu columns; allow the target summary to wrap below the item name.

- [ ] **Step 4: Run the new browser spec**

Run:

```powershell
npx playwright test tests/browser/proxy-inline.spec.js
```

Expected: PASS on all configured browser projects.

---

### Task 4: Advance v89 Documentation and Version Contracts

**Files:**
- Modify: `app-version.js`
- Modify: `sw.js`
- Modify: `index.html` (`APP_RELEASE_NOTES` only in this task)
- Modify: `07_CHANGELOG.md`
- Modify: `tasks/current.md`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: the repository's five-entry release-note rotation and current roadmap format.
- Produces: consistent v89 metadata and a v90/v91 service-worker update-prompt roadmap.

- [ ] **Step 1: Advance executable version strings**

Set `app-version.js` to v89 and change only the cache/version declaration in `sw.js` to v89. Confirm no install, activate, fetch, `skipWaiting`, `clients.claim`, or cache-policy diff exists.

- [ ] **Step 2: Rotate release notes**

Insert a v89 note describing inline proxy targets and smaller affixes, retain the latest five releases, and remove only the oldest rolled entry.

- [ ] **Step 3: Update delivery records**

Add the v89 changelog entry; update `tasks/current.md` to v89, the actual Node/Playwright counts, cumulative v74-v89 range, v89 inline proxy badge scope, and move the two-version SW update prompt to v90/v91.

- [ ] **Step 4: Run version/document checks**

Run:

```powershell
node tools/check-doc-titles.js
node tools/check-app-version.js
```

Expected: both PASS.

---

### Task 5: Full Verification, Commit, and Push

**Files:**
- Verify all modified files from Tasks 1-4.

**Interfaces:**
- Consumes: complete working-tree diff and repository QA workflow.
- Produces: a verified v89 implementation commit pushed to `origin/dev`.

- [ ] **Step 1: Run every Node test**

Run the repository's established loop over all `tests/*.test.js`; record file/test totals and require zero failures.

- [ ] **Step 2: Run every Playwright test**

Run:

```powershell
npm run test:browser
```

Record total passed/skipped counts and require zero failures.

- [ ] **Step 3: Run static checks**

Run `git diff --check`, `node tools/check-doc-titles.js`, and `node tools/check-app-version.js`. Confirm `PERSONAL_STATE_VERSION` and `netlify.toml` are unchanged.

- [ ] **Step 4: Review exact scope**

Inspect `git diff --stat`, the complete diff, and `git status --short`. Confirm the only unrelated path is the preserved untracked `docs/superpowers/plans/2026-08-02-ui-ux-hardening.md`.

- [ ] **Step 5: Commit the implementation**

Stage only the v89 runtime, tests, version, and documentation files, then commit:

```powershell
git commit -m "feat(ledger): align proxy badges for v89"
```

- [ ] **Step 6: Push `dev`**

Fetch and confirm `origin/dev` has not diverged, then run:

```powershell
git push origin dev
```

Confirm the remote branch points to the new implementation commit. Do not deploy or create a tag.
