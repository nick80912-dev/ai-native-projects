# Shopping Photo Integrity and Storage Management Design

**Date:** 2026-08-01
**Status:** Approved for implementation planning
**Scope:** Device-local shopping photo attachments only

## Goal

Make locally stored shopping photo attachments diagnosable and recoverable when the physical IndexedDB blob is missing, while giving users a clear view of attachment storage usage and safely reclaiming unreferenced photos.

The feature must preserve the existing privacy boundary: photos remain only on the device where they were selected or captured. They are not synced, exported in backups, or shown as thumbnails on shopping cards.

## Decisions

- Central management lives under **Settings → Attachments and storage**.
- Affected shopping items also provide an in-context repair entry.
- A missing blob does not silently clear the item's `photoId`.
- A valid attachment continues to appear as a paperclip icon only, without text or a thumbnail.
- An invalid attachment appears as a warning-colored paperclip with an exclamation mark, without visible text. Its accessible name is `附件已遺失`.
- Users resolve an invalid reference by selecting a replacement photo or explicitly removing the attachment reference.
- Background cleanup may automatically delete only orphan blobs that have had no shopping-item reference for at least 24 hours.
- Referenced blobs and invalid references are never removed by background cleanup.
- Capacity monitoring uses a balanced strategy: one lightweight audit per app session and a fresh audit whenever the management screen opens.

## Attachment States

The audit derives three mutually exclusive states by comparing all shopping-item `photoId` values with the photo records stored in IndexedDB:

1. **Valid attachment:** a shopping item references an existing blob.
2. **Invalid reference:** a shopping item has a `photoId`, but no corresponding blob exists.
3. **Orphan photo:** a blob exists, but no shopping item references its ID.

The derived audit result is the sole source for health and capacity presentation. UI components must not duplicate attachment-state rules or delete records directly.

## Component Boundaries

### Photo repository

Extend the existing device-local photo repository with focused operations for:

- listing photo record metadata;
- calculating attachment count and blob byte totals;
- retrieving and replacing individual blobs;
- deleting specific orphan records; and
- surfacing storage failures without mutating shopping data.

The repository owns IndexedDB access only. It does not determine whether a record is referenced.

### Attachment audit service

The audit service accepts the current shopping items and photo metadata, then returns:

- valid attachment IDs;
- invalid references mapped to their shopping items;
- orphan records and their age;
- total attachment count and bytes; and
- orphan records eligible for automatic cleanup.

It performs no UI work. Automatic cleanup calls the repository only for orphans older than or equal to 24 hours.

### Capacity estimator

When supported, `navigator.storage.estimate()` supplies browser-provided origin usage and quota estimates. These values describe the App/site storage allowance, not total free space on the phone. The UI therefore labels them **App storage (estimated)** rather than device storage.

Failure or lack of support is non-fatal. The App still shows its own photo count and exact blob-byte total.

### Presentation layer

Settings and shopping cards consume the audit result. They may request repair, removal, manual audit, or cleanup actions through the services, but they do not infer state from `photoId` alone.

## Audit and Cleanup Lifecycle

1. After shopping data and the photo repository are available, run one audit per App session.
2. Render attachment indicators from that result.
3. Delete eligible orphan photos in the background on a best-effort, record-by-record basis.
4. If one deletion fails, retain that record and retry in a later session; other records may continue.
5. Re-run a fresh audit when the user opens the attachment management screen.
6. Re-run the relevant audit after replacement, reference removal, or manual cleanup so both settings and shopping cards update immediately.

An orphan's 24-hour age is based on its stored `createdAt`. Records with an invalid or missing timestamp are not eligible for automatic cleanup; users may remove them through confirmed manual cleanup.

## Settings Experience

Add a grouped settings row named `附件與儲存空間`.

The summary row shows:

- photo attachment count;
- exact App attachment size; and
- a warning state when invalid references or low estimated capacity are present.

The detail screen shows:

- App attachment count and total bytes;
- App/site storage usage and quota estimates when available;
- the most recent audit time;
- `立即檢查`;
- `清理未使用照片`; and
- the number of invalid references with `查看並修復`.

Estimated capacity is considered low when either remaining estimated quota is below 10 percent or below 50 MiB. The UI calls this `儲存空間偏低`. Since quota estimates do not guarantee that a later write will succeed, an actual write error always takes precedence over the estimate.

Manual cleanup may include orphan photos younger than 24 hours, but it must show the number and combined size to be deleted and require confirmation. It never includes valid attachments or invalid references.

`查看並修復` opens or focuses the affected shopping item. If several items are affected, the screen lists those items and allows the user to open each one.

## Shopping Card and Repair Experience

### Valid attachment

Show the existing paperclip icon only. Do not add visible text or a thumbnail.

### Invalid reference

Replace the normal indicator with a warning-colored paperclip plus exclamation mark. Do not show visible status text on the card. The control has the accessible name `附件已遺失`.

Activating it opens a repair sheet with:

- a short explanation that the local photo may have been removed by the browser or unavailable storage;
- `重新選擇照片`; and
- `移除附件引用`.

Selecting a replacement follows the normal compression and storage pipeline. The invalid `photoId` is replaced only after the new blob has been stored successfully. Removing the reference requires explicit confirmation and changes only the affected shopping item.

## Write Ordering and Failure Safety

For a new or replacement photo:

1. validate and compress the input;
2. successfully write the new blob;
3. update the shopping item to the new `photoId`; and
4. allow the prior blob, if any, to become an orphan for the normal cleanup process.

If compression, IndexedDB, quota, or shopping-data persistence fails, the existing attachment and shopping data remain unchanged. A newly written blob that never receives a reference is safe because it becomes an orphan and is covered by the 24-hour cleanup rule.

Quota-like failures show `儲存空間不足，照片尚未加入` and provide a direct `管理儲存空間` action. Unknown repository failures use a generic attachment-save error and must not be misreported as quota exhaustion.

If IndexedDB is unavailable, photo controls show `此裝置目前無法使用照片附件`; all non-photo shopping functions remain usable. If quota estimation alone is unavailable, estimated values are omitted without showing an error.

## Accessibility and Theme Requirements

- All actionable rows and controls meet the existing minimum 52 px touch target requirement.
- The invalid attachment indicator has an accessible name despite having no visible text.
- Warning foregrounds, secondary text, and backgrounds meet at least 4.5:1 contrast in all six themes.
- Focus is moved into the repair sheet when opened and restored to its triggering control when closed.
- The repair sheet remains dismissible by its close control, backdrop, and supported swipe gesture without conflicting with mobile safe areas.

## Verification

### Unit and repository tests

- classify valid attachments, invalid references, and orphan photos;
- verify the 24-hour boundary, including records exactly 24 hours old;
- exclude invalid timestamps from automatic cleanup;
- calculate count and byte totals;
- apply the low-capacity thresholds;
- ensure automatic cleanup targets only eligible orphan IDs;
- continue safely when one orphan deletion fails;
- preserve the old reference on compression, quota, repository, or data-persistence failure; and
- keep quota estimation optional.

### Browser tests

- delete a blob behind an existing `photoId` and verify the warning paperclip-plus-exclamation indicator with no visible status text;
- verify the indicator's accessible name;
- replace the missing photo successfully;
- remove an invalid reference explicitly;
- verify failed repair leaves the invalid reference unchanged;
- open the settings summary and management screen;
- navigate from invalid-reference management to the affected shopping item;
- manually clean orphan photos only after confirmation;
- simulate low quota and a quota write failure;
- verify all six themes, including 4.5:1 warning and secondary-text contrast;
- verify 320×700, 375×812, and 390×844 layouts with zero horizontal overflow;
- verify minimum 52 px targets;
- verify offline restart; and
- verify zero console errors and zero page errors.

## Out of Scope

- syncing photos between members or devices;
- including photos in backup or restore files;
- cloud recovery of a physically missing blob;
- shopping-card thumbnails;
- modifying global theme tokens; and
- automatic removal of invalid `photoId` references.
