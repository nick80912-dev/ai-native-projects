# Ledger Recent Card Metadata Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move shared payer/allocation context beside the item name and move personal/shared category beside the store name on recent-expense cards.

**Architecture:** Keep the change inside the existing `renderLedgerRecentRecord()` presentation seam and its adjacent CSS. Reuse the existing participant-label calculation and compact badge tokens; do not move or duplicate Ledger data logic.

**Tech Stack:** Vanilla JavaScript and CSS in `index.html`, Node `assert`/`vm` renderer tests, Playwright Chromium regression tests.

## Global Constraints

- Preserve the exact output of `ledgerSharedRecordParticipantLabel()`.
- Preserve personal proxy markup and all pending, TEST, correction, locked-account and tax-free badges.
- A missing store must not hide category; a missing payment method must not create an empty metadata row.
- Do not change Ledger domain calculations, repository, Queue, Apps Script, settlement, correction, schema, CSV, localStorage or backup formats.
- Keep `app-version.js` and `sw.js` at v98.
- Deliver to `dev` only; do not merge `main`, deploy Netlify or create a production tag.

---

### Task 1: Recent-card metadata hierarchy

**Files:**
- Modify: `tests/ledger-225.test.js`
- Modify: `tests/browser/data-observability.spec.js`
- Modify: `index.html`
- Modify: `tests/README.md`

**Interfaces:**
- Consumes: `renderLedgerRecentRecord(record, shared, currency)`, `ledgerSharedRecordParticipantLabel(record, currentMember, registeredMembers)` and existing `.ledger-item-title-row`/`.shopping-target-badge` CSS.
- Produces: `.ledger-shared-participant-summary` inline markup, combined `.ledger-recent-store` content and payment-only `.ledger-recent-meta` content.

- [ ] **Step 1: Add failing Node renderer assertions**

Extend the real renderer execution in `tests/ledger-225.test.js` with records containing `storeName`, `category`, `payMethod` and shared participants. Assert:

```js
assert(renderedSharedRecord.includes('class="ledger-shared-participant-summary"'));
assert(!renderedSharedRecord.includes('class="ledger-recent-badges"'));
assert(renderedPersonalRecord.includes('<span class="ledger-recent-store">丸五市場 · 🍜 餐飲</span>'));
assert(renderedPersonalRecord.includes('<span class="ledger-recent-meta">現金</span>'));
assert(renderedCategoryOnly.includes('<span class="ledger-recent-store">🍜 餐飲</span>'));
assert(!renderedWithoutPayment.includes('class="ledger-recent-meta"'));
```

- [ ] **Step 2: Run the Node test and verify RED**

Run: `node tests/ledger-225.test.js`

Expected: FAIL because shared context is still a lower badge and category is still in `.ledger-recent-meta`.

- [ ] **Step 3: Add failing Browser hierarchy and geometry assertions**

Update `tests/browser/data-observability.spec.js` fixtures with store names. Assert personal and shared recent cards expose:

```js
await expect(personal.locator('.ledger-recent-store')).toHaveText('早餐店 · 🍜 餐飲');
await expect(personal.locator('.ledger-recent-meta')).toHaveText('現金');
await expect(shared.locator('.ledger-shared-participant-summary')).toContainText('付款');
await expect(shared.locator('.ledger-shared-participant-summary')).toContainText('分攤');
await expect(shared.locator('.ledger-recent-badges')).toHaveCount(0);
await expect(shared.locator('.ledger-recent-store')).toHaveText('團體早餐店 · 🍜 餐飲');
```

At 320, 375 and 390px, measure that document, row and body do not overflow; title content stays inside the main column and the main column does not overlap amounts.

- [ ] **Step 4: Run the Browser test and verify RED**

Run: `npx playwright test tests/browser/data-observability.spec.js`

Expected: FAIL because the approved inline shared summary and store/category ordering do not exist.

- [ ] **Step 5: Implement the minimal renderer and CSS change**

In `renderLedgerRecentRecord()`:

```js
var sharedParticipantMarkup=shared?'<span class="ledger-shared-participant-summary"><span class="shopping-target-badge">'+escapeHtml(ledgerSharedRecordParticipantLabel(record,getCurrentMember(),registeredMembersForCurrentMode()))+'</span></span>':'';
var storeCategory=[record.storeName,record.category?ledgerCategoryEmoji(record.category)+' '+record.category:''].filter(Boolean).join(' · ');
var store=storeCategory?'<span class="ledger-recent-store">'+escapeHtml(storeCategory)+'</span>':'';
var metaText=[record.payMethod].filter(Boolean).join(' · ');
var metaMarkup=metaText?'<span class="ledger-recent-meta">'+escapeHtml(metaText)+'</span>':'';
```

Append `sharedParticipantMarkup` inside `.ledger-item-title-row`, remove only the shared participant `badges.push(...)`, and use `store + metaMarkup`. Add `.ledger-shared-participant-summary` to the existing compact inline-summary CSS selector.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```powershell
node tests/ledger-225.test.js
node tests/ledger-dashboard.test.js
node tests/ledger-list-actions.test.js
npx playwright test tests/browser/data-observability.spec.js tests/browser/proxy-inline.spec.js
```

Expected: all pass with no page errors or mobile overflow.

- [ ] **Step 7: Document and commit the implementation**

Add the changed coverage to `tests/README.md`, then run `git diff --check` and commit:

```powershell
git add index.html tests/ledger-225.test.js tests/browser/data-observability.spec.js tests/README.md
git commit -m "fix(ledger): align recent card metadata"
```

### Task 2: Governance and delivery

**Files:**
- Modify: `07_CHANGELOG.md`
- Modify: `08_AI_HANDOVER.md`
- Modify: `.ai-manifest.json`
- Modify: `tasks/current.md`
- Modify: `tasks/done.md`

**Interfaces:**
- Consumes: verified final runtime behavior and actual test counts.
- Produces: authoritative dev status and next-task handoff without allocating a runtime version.

- [ ] **Step 1: Update governance documents**

Record the presentation-only boundary, TDD evidence, unchanged v98 runtime and unchanged data/domain layers. Keep the next backlog item as TEST localStorage prefix isolation.

- [ ] **Step 2: Run complete gates**

Run all top-level `tests/*.test.js`, full `npx playwright test`, document-title, app-version, runtime-asset and JSON checks, then `git diff --check`.

- [ ] **Step 3: Commit documentation**

```powershell
git add 07_CHANGELOG.md 08_AI_HANDOVER.md .ai-manifest.json tasks/current.md tasks/done.md
git commit -m "docs(ledger): record recent card metadata refinement"
```

- [ ] **Step 4: Verify final HEAD and push**

Re-run full Node and Playwright gates on the committed HEAD. Fetch `origin`, confirm `origin/dev` remains an ancestor with no remote-only commits, then push `dev` without force. Confirm local HEAD equals `origin/dev`.
