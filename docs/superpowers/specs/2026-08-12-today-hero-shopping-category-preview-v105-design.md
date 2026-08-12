# Today Hero Shopping Category Preview v105 Design

> Approved direction: replace the v104 item-name preview with the first prioritized item's category and publish the correction as App Shell v105 on `dev`.

## Goal

The active-trip Today Hero must identify what kind of Shopping remains at the suggested stop without exposing a product name. The compact visual copy is:

- One pending item: `地點 · 分類`
- Multiple pending items: `地點 · 第一優先分類 +N`
- `N` is the number of remaining pending items, not the number of remaining categories.

Example: three pending items at AEON whose first prioritized item is `必買` render as `AEON · 必買 +2`.

## Selection and Data Flow

`buildShoppingTodayReminder()` remains responsible for grouping and stable priority. After prioritizing the source item records, each group adds `firstCategory` from the first record while preserving its existing `items: string[]` name array for compatibility. `todayShoppingHeroModel()` projects:

- `firstCategory`: the trimmed category copied from the selected group's `firstCategory` field.
- `remainingCount`: `Math.max(group.items.length - 1, 0)`.

The category projection must not introduce a new ranking rule. Exact `必買` items remain stably first through `prioritizeShoppingGroupItems()`; items within the same priority tier retain store order. The model and renderer must not mutate Shopping store records or reminder inputs.

## Rendering Contract

The resolved Hero Shopping button renders separate location, separator, category, and optional count elements:

`地點` `·` `分類` `+N`

- Location remains the primary visual information.
- Category is secondary and independently ellipsizes.
- Separator and count do not shrink.
- Product names must not appear in visible Hero markup or the button's accessible name.
- The accessible name includes stop, category when available, and total pending-item count; for example: `開啟AEON採買：必買，共 3 項待買`.
- A missing or blank category degrades to location plus total-count accessibility without a dangling separator or `+N`.

The generic `採買清單／開啟查看 →` fallback remains unchanged.

## Preserved Behavior

- `順路採買` and neutral `今日採買` labels.
- First eligible future group selection.
- Exact current/next-stop exclusion and existing next-stop badge ownership.
- Focused Shopping overlay navigation and stop anchor.
- Keyboard Enter/Space behavior and visible focus ring.
- Minimum 44px target.
- Single-row layout and no horizontal overflow at 320, 375, and 390 CSS pixels.
- Pre-trip Today behavior.
- Shopping schema, localStorage data, backup format, Ledger, Apps Script, Google Sheet data, and `netlify.toml`.

## Testing

Node tests must cover:

- `firstCategory` and `remainingCount` projection.
- Existing exact-`必買` stable priority and input immutability.
- Single- and multiple-item markup.
- Blank-category fallback.
- Category HTML and attribute escaping.
- Absence of product names from Hero visible and accessible output.

Playwright must cover:

- `地點 · 分類 +N` for a deterministic future Shopping group.
- Accessible stop/category/total copy with no product name.
- Enter/Space and focused-stop navigation unchanged.
- Long location and category independently ellipsize on one row without document overflow at 320, 375, and 390px.

Final verification includes every top-level Node test, the complete Playwright suite, version/document/runtime/BUILTIN/manifest checks, production-data `healthCheck()`, pageerror inspection, and `git diff --check`.

## Release and Rollback

Because v104 has already been pushed, this change is a forward App Shell release:

- `app-version.js`: `v104` → `v105`
- `sw.js`: `v104` → `v105`
- Keep the five-entry user release-note window by adding v105 and dropping the oldest visible entry.

Update the changelog, current-state handover, UI contract, and test documentation. Push the verified result directly to `origin/dev`. Do not merge `main`, deploy production, or create a production tag.

Rollback must also be forward-only: restore the last accepted Hero category behavior in the next unused App Shell version rather than reusing or decrementing v105.
