# Home Weather Summary Design

Date: 2026-07-07
Status: Design approved for planning
Scope: UI/UX design spec only

## Purpose

The home screen should give the traveler a small weather cue for the next destination without distracting from the next-stop ticket card.

This feature adds a compact weather summary to the right side of the home date card. It does not use GPS, does not add CMS fields, and does not change the Google Sheet schema.

## Product Decisions

- Placement: right side of the home date card.
- Weather basis: next-stop destination or today's primary itinerary area.
- Display style: compact text chip with city name.
- Display format: `岡山 ☁️ 18° 雨40%`.
- Rain text: use `雨40%`.
- GPS: not used.
- Weather data: fetched at runtime and cached locally.

## Home Screen Behavior

The date card remains the top context block for the home screen. The left side continues to show:

- Today / itinerary day.
- Date.
- Progress text such as `0/7 已處理`.

The right side may show one compact weather summary:

```text
岡山 ☁️ 18° 雨40%
```

The weather summary should be visually secondary. It should not become a separate card, push the next-stop card below the fold, or compete with the navigation action.

## Destination Detection

The app should infer weather location from the next stop, not from the user's device location.

The first implementation should use an internal city lookup table and simple text matching against existing itinerary / place data. Suggested initial city keys:

- 岡山
- 廣島
- 宮島
- 東京
- 鎌倉 / 江之島
- 成田

The matching text may include:

- Next-stop place name.
- Resolved Place or Restaurant name.
- Itinerary action text.
- Movement or note text when needed.

If no known city can be inferred, do not show the weather summary.

## Weather Data Strategy

The preferred weather source is a free, no-key weather API such as Open-Meteo or an equivalent source verified during implementation.

The implementation should fetch only the small amount of data needed for the summary:

- Current or forecast temperature.
- Weather condition code or summary.
- Rain / precipitation probability.

Weather results should be cached in `localStorage` for a short period, such as 1 to 3 hours. Cached weather may be shown when a fresh request fails.

## Loading And Failure States

Weather is optional. The home screen must work normally without it.

- While loading: keep the weather area empty or show a very small loading state.
- City not detected: hide the weather summary.
- Weather fetch fails and cache exists: show cached weather.
- Weather fetch fails and no cache exists: hide the weather summary.
- API shape changes or response is invalid: hide weather and keep the home screen usable.

No weather failure should block the next-stop card.

## Non-Goals

This design explicitly does not include:

- GPS or browser location permission.
- User-selectable weather location.
- New Google Sheet columns.
- `schema.js` changes.
- CMS writeback.
- Full weather forecast page.
- Hourly forecast table.
- Severe-weather alert system.
- New app tab.

## Implementation Guardrails

- Preserve the existing home next-stop mode.
- Keep the date card compact on a 390px mobile viewport.
- Keep weather rendering optional and failure-tolerant.
- Keep personal / runtime state in `localStorage`.
- Do not change parser or schema behavior.
- Verify the current weather API shape during implementation before coding against it.
- Update `07_CHANGELOG.md` when implementation is delivered.

## Acceptance Criteria For Future Implementation

- Home date card can show `岡山 ☁️ 18° 雨40%` style summary on the right.
- Weather location is derived from the next stop or today's itinerary area.
- No browser location permission is requested.
- If location or weather cannot be resolved, the home screen still renders normally.
- Weather data is cached locally and does not write to CMS.
- No schema or Google Sheet changes are made.
- Next-stop ticket remains the primary home screen element.
