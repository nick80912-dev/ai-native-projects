# Playwright worker experiment — v111

Date: 2026-08-13  
Candidate commit: `2a7611a3c2eb5788bd288dba63ff2d1debf33b7c`  
Policy under test: keep local default at one worker; use two workers only in CI.

## Fixed acceptance rule

Two CI workers are accepted only when three consecutive full runs on the same clean committed tree all pass with an identical test count, zero retries, zero page errors, and no server port conflict. The assertions, retry policy, and product code were unchanged between runs.

## Results

| Run | Workers | Result | Retries | Page errors / port conflicts | Wall time |
|---|---:|---:|---:|---:|---:|
| Baseline | 1 | 180/180 passed | 0 | 0 | 410.9 s |
| Trial 1 | 2 | 180/180 passed | 0 | 0 | 239.7 s |
| Trial 2 | 2 | 180/180 passed | 0 | 0 | 234.4 s |
| Trial 3 | 2 | 180/180 passed | 0 | 0 | 181.8 s |

The three two-worker runs averaged 218.6 seconds, 46.8% below the one-worker baseline. This is supporting throughput evidence; the adoption decision is based on the three-run stability rule, not speed alone.

## Decision

Accepted. `playwright.config.js` uses `process.env.CI ? 2 : 1`. The workflow command remains `npm run test:browser`, retries remain zero, and local runs remain single-worker for deterministic debugging. If CI later shows a parallel-only failure, reproduce with `npx playwright test --workers=1` before changing assertions or retry policy.
