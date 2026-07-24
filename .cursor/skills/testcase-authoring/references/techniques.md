# Test design techniques (portable)

Use abbreviations in the **Technique** column. Combine when useful (e.g. `BV+EP`).

| Code | Name | Use when |
|------|------|----------|
| **EP** | Equivalence partitioning | Classes of input that should behave the same; pick one representative per class |
| **BV** | Boundary value | Limits (min/max, open/closed intervals, just inside/outside) |
| **ST** | State transition | Behavior depends on prior state (open/closed day, status machines, queues) |
| **DT** | Decision table | Combinations of conditions → outcomes |
| **UC** | Use case / happy path | Primary actor goal end-to-end at this slice’s level |
| **RK** | Risk / exploratory | High-cost failures, past bugs, distrust-code / cross-layer hunts |

## Stub vs deep vs bug-hunt

| Mode | Prefer | Detail |
|------|--------|--------|
| **Stub** | UC + few EP/BV negatives | Map coverage; runnable IDs — see [examples-stub.md](examples-stub.md) |
| **Deep** | EP/BV/ST/DT from **product SoT** | Test data + precise Expected — see [examples-deep.md](examples-deep.md) |
| **Bug-hunt** | RK + cross-layer EP/BV | Distrust code — see [bug-hunt.md](bug-hunt.md) · [examples-bug-hunt.md](examples-bug-hunt.md) |

## Sketches (same fictional shop settings as other examples)

| Technique | Case sketch |
|-----------|-------------|
| EP | Valid shop name vs empty vs whitespace-only |
| BV | Capacity at min, min−1, max, max+1 |
| ST | Closed day → open day with times required |
| DT | Valid/invalid name × valid/invalid capacity on one save |
| UC | Admin saves settings; reload shows persisted values |
| RK | Form allows close ≤ open but API must reject (or reverse) |

Full worked matrices: [examples-deep.md](examples-deep.md) (deep) · [examples-bug-hunt.md](examples-bug-hunt.md) (RK).
