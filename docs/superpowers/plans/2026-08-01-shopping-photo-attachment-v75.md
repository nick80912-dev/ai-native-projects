# Shopping Photo Attachment v75 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one device-local photo attachment to each shopping item without thumbnails, sync, or backup payloads.

**Architecture:** A focused external script owns IndexedDB and image compression. Shopping items store only `photoId`; the existing localStorage store remains authoritative for item structure, while reference cleanup is an asynchronous best-effort side effect after successful item mutations.

**Tech Stack:** Plain ES5-compatible browser JavaScript, IndexedDB, Canvas, Node `assert`/`vm`, Playwright.

## Global Constraints

- One photo maximum per shopping item; cards show only a paperclip SVG and no attachment text.
- Photos remain on the selecting device and are excluded from personal-state JSON backup and restore.
- No new package, schema field, cloud service, global theme token, or Netlify configuration change.
- Preserve partial-purchase, allocation, Ledger-link, localStorage, and personal backup v8 semantics.

---

### Task 1: IndexedDB photo module

**Files:**
- Create: `shopping-photo-store.js`
- Create: `tests/shopping-photo-store.test.js`

**Interfaces:**
- Produces: `TripShoppingPhotos.createStore(options)`, `TripShoppingPhotos.fitImageSize(width,height,maxEdge)`, and `TripShoppingPhotos.compressImage(file,options)`.
- `createStore()` returns `{put(blob),get(id),remove(id)}`; `put` resolves to a generated string ID.

- [ ] **Step 1: Write the failing Node test**

Use literal expectations for image fitting and a transaction-capable in-memory IndexedDB-shaped driver to exercise the exported repository behavior: a stored Blob can be read by ID, replacing no other ID, and remove makes `get` resolve `null`. The test must fail because `shopping-photo-store.js` does not exist.

- [ ] **Step 2: Verify red**

Run `node tests/shopping-photo-store.test.js` and expect module-not-found.

- [ ] **Step 3: Implement the module**

Implement UMD-style export for browser global and CommonJS. Use database `trip-local-media`, version 1, store `shopping-photos`, keyPath `id`. Generate `shopping-photo-<time>-<random>`, store `{id,blob,createdAt}`, and convert IndexedDB request/transaction failures into rejected `Error` objects. Implement 1600px JPEG compression at quality 0.82 and reject non-image or files above 25 MiB before decode.

- [ ] **Step 4: Verify green**

Run `node tests/shopping-photo-store.test.js` and expect `shopping photo store tests passed`.

- [ ] **Step 5: Commit**

```bash
git add shopping-photo-store.js tests/shopping-photo-store.test.js
git commit -m "feat(shopping): add device-local photo storage"
```

---

### Task 2: Item references and lifecycle

**Files:**
- Modify: `index.html`
- Modify: `tests/shopping-list.test.js`
- Modify: `tests/shopping-remerge.test.js`
- Modify: `tests/settings-backup-ux.test.js`
- Modify: `tests/personal-state-restore-matrix.test.js`

**Interfaces:**
- Consumes: `TripShoppingPhotos.createStore()` and current `shoppingListStore`.
- Produces: Shopping Item `photoId`, `shoppingPhotoIdsReleased(before,after)`, `shoppingItemsWithoutPhotoRefs(items)`, and `cleanupShoppingPhotoIds(ids)`.

- [ ] **Step 1: Write failing lifecycle tests**

Assert literal behavior: `normalizeShoppingItem()` trims a valid photo ID and rejects non-string/object values; split parts share one ID; safe remerge rejects mismatched IDs; released-ID planning returns an ID only after the last reference disappears; exported and restored shopping items contain no `photoId` property.

- [ ] **Step 2: Verify red**

Run the four modified Node tests and expect failures for missing `photoId` and backup stripping.

- [ ] **Step 3: Implement the minimal lifecycle**

Load `shopping-photo-store.js` before the main inline application script. Add `photoId` to the normalized item, form seed, form payload and split remainder. Add `photoId` to remerge comparable fields. Strip the property through one `shoppingItemsWithoutPhotoRefs()` helper on export and restore validation. Compute before/after references and perform best-effort asynchronous cleanup after single/bulk delete, replacement and cancel of unsaved photo selections.

- [ ] **Step 4: Verify green**

Run:

```bash
node tests/shopping-list.test.js
node tests/shopping-remerge.test.js
node tests/settings-backup-ux.test.js
node tests/personal-state-restore-matrix.test.js
```

- [ ] **Step 5: Commit**

```bash
git add index.html tests/shopping-list.test.js tests/shopping-remerge.test.js tests/settings-backup-ux.test.js tests/personal-state-restore-matrix.test.js
git commit -m "feat(shopping): preserve photo references safely"
```

---

### Task 3: Attachment UI and real-browser persistence

**Files:**
- Modify: `index.html`
- Create: `tests/browser/shopping-photo.spec.js`
- Modify: `tests/README.md`

**Interfaces:**
- Produces: `selectShoppingPhoto(input)`, `removeShoppingFormPhoto()`, `openShoppingPhotoViewer(itemId)`, `closeShoppingPhotoViewer()`, `.shopping-photo-indicator`, and `.shopping-photo-viewer`.

- [ ] **Step 1: Write the failing Playwright test**

Use `page.setInputFiles()` with an in-memory one-pixel PNG. Add a shopping item, edit/select the image, save and reload. Assert the card contains one SVG indicator with `aria-label="有照片附件"` and no `照片附件` text; detail opens a full-screen viewer whose image has non-zero natural dimensions. Replace and remove the attachment, verify persistence, and inspect real IndexedDB to prove the Blob disappears after the last reference is deleted.

- [ ] **Step 2: Verify red**

Run `npx playwright test tests/browser/shopping-photo.spec.js`; expect failure because the file input and indicator do not exist.

- [ ] **Step 3: Implement the UI**

Add form controls labelled `照片附件`, `選擇照片`／`更換照片`, and `移除照片`; do not render thumbnails. During compression/storage reuse the form session busy state. Add the paperclip SVG only to cards with `photoId`. Add the detail action and full-screen viewer; revoke every object URL on close or replacement. Error paths retain the form and old reference.

- [ ] **Step 4: Verify green and mobile layout**

Run the new spec at 320×700, 375×812 and 390×844; assert `scrollWidth-clientWidth===0`, image viewer bounds fit, and console/page errors are zero.

- [ ] **Step 5: Commit**

```bash
git add index.html tests/browser/shopping-photo.spec.js tests/README.md
git commit -m "feat(shopping): add one-photo attachment flow"
```
