# Home Cluster Stops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show parent/child itinerary stops as one expandable Today-screen cluster ticket with child-level progress.

**Architecture:** Preserve the existing single-file Vanilla JS app. Annotate already-parsed child rows with their parent ID, derive cluster state in small helper functions, and route the Today renderer to a cluster ticket only when the selected parent has at least two child stops.

**Tech Stack:** Vanilla HTML/CSS/JS, localStorage, Node built-in assert regression tests.

## Global Constraints

- Do not modify `schema.js`, `validator.js`, Google Sheet columns, or the full itinerary renderer.
- Parent/child structure is the only cluster trigger.
- A child expires when the next child's scheduled time starts.
- Commit only production files, tests, changelog, and these design records.

---

### Task 1: Define And Test Cluster Progress

**Files:**
- Modify: `tests/pick-next-stop.test.js`
- Modify: `日本行程V2預覽.html`

**Interfaces:**
- Produces `getChildStopCluster(items,parent)`, `pickClusterChild(cluster,progress,checks,nowMinutes,dayRef)`, and `completeClusterParent(day,dayIndex,cluster,progress,checks)`.

- [ ] Write failing assertions for a parent with three timed children.
- [ ] Run `node tests/pick-next-stop.test.js` and confirm the missing helper failure.
- [ ] Add the helpers using existing `pickNextStop`, `autoSkipStaleItem`, and local progress storage.
- [ ] Re-run the test and confirm child A is skipped at child B's time, child B becomes active, and all-cleared children complete the parent.

### Task 2: Render The Cluster Ticket

**Files:**
- Modify: `日本行程V2預覽.html`
- Test: `tests/pick-next-stop.test.js`

**Interfaces:**
- Consumes the Task 1 helpers plus `resolveRef`, `nextStopMeta`, `navUrl`, `parkingPanel`, and `infoPanel`.
- Produces `renderClusterNextStopCard(day,dayIndex,pick,cluster,checks,progress)` and `toggleHomeCluster(id)`.

- [ ] Write failing source assertions for `展開該區串點` and child-specific Complete/Skip labels.
- [ ] Run `node tests/pick-next-stop.test.js` and confirm it fails before rendering code exists.
- [ ] Add minimal CSS and rendering functions for collapsed summary, expanded child actions, and auto-skipped labels.
- [ ] Route `renderToday()` through the cluster renderer only when the selected next stop has a cluster.
- [ ] Re-run the test and confirm it passes.

### Task 3: Record And Verify

**Files:**
- Modify: `07_CHANGELOG.md`
- Verify: `日本行程V2預覽.html`, `tests/*.test.js`

- [ ] Add a changelog entry that documents the home-only cluster ticket and child auto-skip rule.
- [ ] Run every `tests/*.test.js` file with the existing Node test harness.
- [ ] Run `git diff --check` and inspect the staged file list.
- [ ] Refresh the 390px mobile preview on 2026-10-19, verify the collapsed control and expanded child actions, then commit and push the confirmed scope.

## Self-Review

- Spec coverage: parent-only grouping, concise homepage display, child operations, timed auto-skip, full-itinerary preservation, local-only state, and regression coverage are assigned to a task.
- Placeholder scan: no deferred implementation markers are present.
- Type consistency: all helper names used by rendering are produced in Task 1.
