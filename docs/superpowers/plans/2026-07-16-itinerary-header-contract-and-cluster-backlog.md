# Itinerary Header Contract and Cluster Backlog Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `行程` the only accepted itinerary activity header across Dev while recording the approved parent/child-card corrections as high-priority follow-up work.

**Architecture:** Preserve the existing `act` field and seven-column positional parser. Update the two Schema definitions and BUILTIN CSV contract atomically, enforce the new name through focused structure-gate tests, then update authoritative task and mapping documentation without touching cluster runtime behavior.

**Tech Stack:** Vanilla JavaScript, Node.js `assert`/`vm` tests, static JSON-encoded BUILTIN CSV, Markdown project governance.

## Global Constraints

- `行程` is the only supported header for itinerary field `act`.
- The resulting Schema version is `2.2 (2026-07-16)` in both runtime copies and the mapping document.
- Do not keep `詳細行程` as an alias.
- Keep the internal field name `act` and the seven-column parser positions unchanged.
- Do not modify `getChildStopCluster()`, cluster renderers, navigation, progress state, or Day 6 data.
- Add the parent/child-card correction as one high-priority backlog item covering Day 1, Day 2–5, and the Day 6 exclusion.

---

### Task 1: Lock the new Header and Gate contract in tests

**Files:**
- Modify: `tests/atomic-sheet-sync.test.js`

**Interfaces:**
- Consumes: `buildHeaderMap()`, `schema.js`, and the production `index.html` source.
- Produces: failing assertions that define `行程` as accepted and `詳細行程` as obsolete.

- [ ] **Step 1: Add focused contract assertions**

Load `schema.js` in a VM sandbox and find the `act` column. Assert its header is exactly `行程`, its aliases do not contain `詳細行程`, and the inline Schema plus BUILTIN header in `index.html` use the same name.

Add validator assertions using:

```js
const itineraryHeaderDef = {
  label:'行程總表',
  columns:[{field:'act',header:'行程',required:true}]
};
const acceptedItineraryHeader = sb.buildHeaderMap([['行程']], itineraryHeaderDef);
assert.strictEqual(acceptedItineraryHeader.map.act, 0, '行程 maps to act');
assert.strictEqual(acceptedItineraryHeader.blockers.length, 0, '行程 satisfies the required Header');

const obsoleteItineraryHeader = sb.buildHeaderMap([['詳細行程']], itineraryHeaderDef);
assert.strictEqual(Object.prototype.hasOwnProperty.call(obsoleteItineraryHeader.map, 'act'), false, '詳細行程 no longer maps to act');
assert(obsoleteItineraryHeader.blockers.some(function(f){
  return f.code === 'HEADER_MISSING' || f.code === 'HEADER_REQUIRED';
}), '詳細行程 is blocked by the new contract');
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node tests/atomic-sheet-sync.test.js`

Expected: FAIL because production Schema and BUILTIN still use `詳細行程`.

### Task 2: Replace the production itinerary Header contract

**Files:**
- Modify: `schema.js`
- Modify: `index.html`

**Interfaces:**
- Consumes: the connected Sheet whose third header is already `行程`.
- Produces: `SCHEMA.sheets.itin.columns[].header === '行程'` for field `act`, an identical inline fallback Schema, and BUILTIN CSV header `日期,時間,行程,地點,ID,交通,備註`.

- [ ] **Step 1: Update both Schema definitions**

Change only the `act` column header in `schema.js` and the inline fallback Schema in `index.html`:

```js
{ field:'act', header:'行程', desc:'活動名稱' }
```

Do not add an `aliases` property.

- [ ] **Step 2: Update the BUILTIN CSV header**

Inside `var BUILTIN`, replace exactly:

```text
日期,時間,詳細行程,地點,ID,交通,備註
```

with:

```text
日期,時間,行程,地點,ID,交通,備註
```

No itinerary rows change.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run: `node tests/atomic-sheet-sync.test.js`

Expected: `atomic sheet sync tests passed`.

### Task 3: Update authoritative documentation and backlog

**Files:**
- Modify: `00_CONTEXT_HANDOVER.md`
- Modify: `09_SCHEMA_MAPPING.md`
- Modify: `tasks/backlog.md`
- Modify: `07_CHANGELOG.md`

**Interfaces:**
- Consumes: the approved written design.
- Produces: current documentation that names `行程` and one high-priority parent/child-card backlog item.

- [ ] **Step 1: Replace current contract documentation**

Update the seven-column handover description and Schema mapping table from `詳細行程` to `行程`. Do not rewrite historical design plans or Changelog titles whose phrase “詳細行程” means the full itinerary screen rather than the Sheet header.

- [ ] **Step 2: Add the high-priority parent/child-card backlog item**

Under `高優先(驗收後立即)`, record:

- Parent row place/ID becomes first child stop.
- Contiguous blank-`行程` rows become later child stops.
- Parent-derived first stop plus one later stop is enough to form a cluster.
- Parent card remains non-navigable; every child stop is navigable to its exact Trip card.
- Day 1 has no matching omission.
- Day 2–5 regression coverage includes the ten audit-confirmed locations.
- Day 6 is excluded until its incomplete itinerary is drafted and re-audited.

Renumber the existing backlog items so the list remains ordered.

- [ ] **Step 3: Add a Changelog entry**

Record the strict Header contract migration and the new high-priority backlog scope. State that parent/child runtime behavior was not changed in this batch.

### Task 4: Verify and publish the Dev change

**Files:**
- Test: all `tests/*.test.js`
- Verify: `schema.js`, `index.html`, `00_CONTEXT_HANDOVER.md`, `09_SCHEMA_MAPPING.md`, `tasks/backlog.md`, `07_CHANGELOG.md`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: a clean tested Dev commit without runtime cluster changes.

- [ ] **Step 1: Run full repository verification**

Run every `tests/*.test.js` with Node.js, then `node tools/check-doc-titles.js`.

Expected: every command exits 0.

- [ ] **Step 2: Verify the exact contract and scope**

Run searches proving `schema.js`, the inline Schema, BUILTIN, current handover, and mapping docs use `行程`; confirm no `getChildStopCluster()` or cluster renderer diff exists; run `git diff --check`.

- [ ] **Step 3: Commit**

```powershell
git add schema.js index.html tests/atomic-sheet-sync.test.js 00_CONTEXT_HANDOVER.md 09_SCHEMA_MAPPING.md tasks/backlog.md 07_CHANGELOG.md docs/superpowers/plans/2026-07-16-itinerary-header-contract-and-cluster-backlog.md
git commit -m "fix: adopt itinerary header contract"
```
