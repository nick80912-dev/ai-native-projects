# Playwright worker experiment — v111

Date: 2026-08-14

Candidate commit: `e37b59f9ed355dae5fb2cd8f80209212c3feb2a9`

Policy under test: adopt two workers only if every page is observed and three consecutive full runs satisfy the fixed rule.

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

Not adopted. Release review found that the performance probe creates pages manually and those pages were not attached to the shared pageerror tracker until `d88f5e5`, after all three trials above. Their “zero page errors” therefore does not satisfy the fixed acceptance rule, even though every observed test passed. Per the approved fallback, `playwright.config.js` remains one worker in every environment with zero retries; no assertion was relaxed and the historical trial timings remain only exploratory evidence.

## Post-review confirmation

Release review added one GitHub Pages subpath/Service Worker generation case and complete manual-page tracking after the fixed matrix. A single later 182/182 two-worker run cannot replace the required three consecutive fully observed runs, so it does not change the one-worker decision.
