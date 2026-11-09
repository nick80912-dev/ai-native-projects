# Weather City Fallback Design

Date: 2026-07-07
Status: Design approved for planning
Scope: Weather city inference only

## Purpose

The home weather summary should keep showing useful weather when the next-stop item does not directly contain a recognizable city name.

This design adds a conservative fallback chain for inferring a weather city from nearby itinerary context. The inferred city is used only to choose weather data. It must not change navigation, map links, CMS data, Google Sheet fields, or visible place names.

## Product Decision

Use inferred city only for the weather chip.

The UI remains the same:

```text
岡山 ☁️ 18° 雨40%
```

The app should not show a new line such as `推定地區：岡山`. The inference is an internal helper for weather only.

## Inference Order

The app should infer weather city in this order:

1. Current next-stop text.
2. Resolved current stop data from existing Place / Restaurant / Hotel records.
3. Closest previous stop in the same itinerary day with a known city.
4. Closest next stop in the same itinerary day with a known city.
5. Dominant city for the same itinerary day, when one city clearly appears most often.

If none of these produce a known city, hide the weather chip.

## Current Stop Matching

Current stop matching may inspect existing fields only:

- Itinerary place.
- Itinerary act.
- Itinerary move.
- Itinerary note.
- Resolved Place name / travel / note / hours.
- Resolved Restaurant name / travel / note / hours.
- Resolved Hotel name / address / parking / note / applicable date.

The implementation should reuse the existing internal city table from the home weather feature and extend the text collector rather than adding new schema fields.

## Nearby Stop Fallback

When the current stop has no direct city match, the app may look at same-day itinerary neighbors.

Example:

- At `15:05`, next stop is `ORIX租車 岡山機場`, which directly maps to 岡山.
- At `16:00後`, next stop is `Guest House Life Field`, which may not directly contain a city.
- The app may inherit 岡山 from the previous known stop for weather display only.

This fallback is acceptable because weather is auxiliary and failure-tolerant. It is not acceptable for navigation or map lookup.

## Dominant Day City Fallback

If neither current nor neighboring stops match, the app may compute a dominant city for the itinerary day.

Rules:

- Count only known cities from existing itinerary / resolved records.
- Use the dominant city only when it appears more than any other city.
- If there is a tie or no city appears, return no city.
- Do not guess across different itinerary days.

This keeps the fallback conservative for mixed-location days.

## Data And State Rules

- Do not change `schema.js`.
- Do not add Google Sheet columns.
- Do not write inferred city back to CMS.
- Do not store inferred city permanently unless it is part of the existing short-lived weather cache.
- Do not request GPS or browser location permission.
- Do not alter `navUrl()` or map search behavior.

## Failure Behavior

Weather remains optional.

- If city inference fails, hide the weather chip.
- If weather fetch fails, use existing cached weather when available.
- If no cached weather is available, hide the weather chip.
- The next-stop ticket must still render normally.

## Acceptance Criteria

- `ORIX租車 岡山機場` still shows 岡山 weather.
- `Guest House Life Field` on Day 1 can show 岡山 weather by nearby-stop fallback.
- The weather chip text remains compact and unchanged.
- No inferred city appears as a new visible field.
- Navigation links and map behavior do not use inferred city.
- No schema, Google Sheet, parser, or CMS writeback changes are made.
- If inference is ambiguous, the weather chip is hidden instead of guessed.
