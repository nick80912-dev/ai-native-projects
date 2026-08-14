# Playwright worker experiment — v111

Date: 2026-08-14

Candidate commit: `e37b59f9ed355dae5fb2cd8f80209212c3feb2a9`

Policy under test: keep local default at one worker; use two workers only in CI.

## Fixed acceptance rule

Two CI workers are accepted only when three consecutive full runs on the same clean committed tree all pass with an identical test count, zero retries, zero page errors, and no server port conflict. Every browser spec imports `tests/browser/support/test.js`, so an uncaught `pageerror` fails its owning test automatically. Assertions, retry policy, and product code were unchanged between runs.

## Results

| Run | Workers | Result | Retries | Page errors / port conflicts | Wall time |
|---|---:|---:|---:|---:|---:|
| Baseline | 1 | 181/181 passed | 0 | 0 | 336.2 s |
| Trial 1 | 2 | 181/181 passed | 0 | 0 | 170.3 s |
| Trial 2 | 2 | 181/181 passed | 0 | 0 | 185.9 s |
| Trial 3 | 2 | 181/181 passed | 0 | 0 | 177.2 s |

The three two-worker runs averaged 177.8 seconds, 47.1% below the one-worker baseline. This is supporting throughput evidence; the adoption decision is based on the three-run stability rule, not speed alone.

## Decision

Accepted. `playwright.config.js` uses `process.env.CI ? 2 : 1`. The workflow command remains `npm run test:browser`, retries remain zero, and local runs remain single-worker for deterministic debugging. If CI later shows a parallel-only failure, reproduce with `npx playwright test --workers=1` before changing assertions or retry policy.
