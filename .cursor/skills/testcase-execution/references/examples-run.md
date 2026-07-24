# Examples — execution round (fictional)

Teaching example. Fictional zone `settings/` with `shop.md` (`ZZ-SHOP-*`) and optional sibling files.  
Runner/prep come from **that** repo’s docs (commands omitted — discover, don’t copy).

Authoring fiction: `testcase-authoring` → `examples-deep.md` / `examples-bug-hunt.md`.  
Rules: [repo-discovery.md](repo-discovery.md) · [run-order.md](run-order.md) · [result-rules.md](result-rules.md) · [report-template.md](report-template.md).

**Scale:** Maximal teaching sample. Real runs update only in-scope rows; do not invent Pass counts.

---

## 1. Discovery table (filled)

| Item | Found at |
|------|----------|
| Scenarios root | `docs/test-cases/scenarios/` |
| Scope | zone `settings/` → `shop.md` (+ `hours.md` if zone-wide) |
| Runner | *(from testing-guide — not hardcoded here)* |
| Prep | *(from RUNBOOK — not hardcoded here)* |
| Report path | `docs/test-cases/reports/` (only if asked) |

---

## 2. Scope resolution

| User said | Scope |
|-----------|--------|
| “run settings” | All files under `scenarios/settings/` |
| “run shop.md” | `shop.md` only |
| “run ZZ-SHOP-30..37” | Those IDs only |

Refuse if root / Automated missing → `testcase-authoring`.

---

## 3. Sequence (zone-wide, continue-on-fail)

1. Discover + prep  
2. All `unit` → all `integration` → `e2e` → `manual` / `partial`  
3. Write Results · Last run · Run summary  
4. Restore fixtures  
5. Report only if asked  

---

## 4. Before → after (writing Result back)

### Before (excerpt — Result blank)

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-03 | S1 | BV | capacity = 0 | 400 `CAPACITY_RANGE` | §Capacity | integration | |
| ZZ-SHOP-10 | S2 | UC | Save Harbor Spa | 200; reload OK | §Shop.save | integration | |
| ZZ-SHOP-30 | S1 | RK | UI allows close≤open; API must reject | 400 `HOURS_INVALID`; no `00:00` | §Hours | integration | |
| ZZ-SHOP-34 | S2 | RK | PUT without session | 401 | §Shop.save | integration | |
| ZZ-SHOP-40 | S2 | UC | Flash confirm toast | Toast visible 2s | Design §Save | manual | |
| ZZ-SHOP-41 | S1 | EP | Capacity field + UI hint | API 400 + hint text | §Capacity | partial | |
| ZZ-SHOP-99 | S1 | — | Nightly visual | — | — | deferred | |

### After (same rows — execution wrote Result only)

| ID | … | Automated | Result |
|----|---|-----------|--------|
| ZZ-SHOP-03 | … | integration | Pass |
| ZZ-SHOP-10 | … | integration | Pass |
| ZZ-SHOP-30 | … | integration | Fail |
| ZZ-SHOP-34 | … | integration | Pass |
| ZZ-SHOP-40 | … | manual | Pass |
| ZZ-SHOP-41 | … | partial | Fail |
| ZZ-SHOP-99 | … | deferred | Skip |

**Header updates**

- **Last run:** `2026-07-23` (Env TZ from RUNBOOK)  
- **Run summary:** Pass 4 · Fail 2 · Skip 1 · Total 7  

*(Only these 7 rows were in scope — do not claim Pass 24.)*

### Evidence (Fail)

```text
ID: ZZ-SHOP-30
Expected: 400 HOURS_INVALID; no silent 00:00
Observed: 200; open/close stored as 00:00–00:00
How: integration suite matching ZZ-SHOP-30
Tag: product
```

```text
ID: ZZ-SHOP-41
Expected: API 400 + UI hint on invalid capacity
Observed: API 400 OK; UI hint missing
How: integration Pass for API; manual check for hint
Tag: product
```

**Do not** change Expected on ZZ-SHOP-30/41 to match Observed.

---

## 5. Manual row (ZZ-SHOP-40)

1. Prep app URL from RUNBOOK; admin session.  
2. Perform Case (save with valid data).  
3. Observe toast vs Expected.  
4. Result Pass/Fail; optional note “toast seen at T+0”.  
5. Restore fixture if save mutated shared shop data.

---

## 6. Multi-file zone note

If scope is whole `settings/`:

1. Layer-first: every file’s unit, then every file’s integration, …  
2. Update **each** file’s Last run / Run summary separately.  
3. Optional aggregate report when user asks (sum Pass/Fail/Skip across files; list Failures with file path).

---

## 7. Sample report (user asked)

```markdown
# Test run report: settings/shop

**Date:** 2026-07-23
**Env:** local (per RUNBOOK)
**Scope:** shop.md (7 rows)
**Executor:** agent
**Discovery:** testing-guide + RUNBOOK (paths only)
**Stop policy:** continue-on-fail

## Summary

| Result | Count |
|--------|------:|
| Pass | 4 |
| Fail | 2 |
| Skip | 1 |
| **Total** | 7 |

### Fail breakdown

| Tag | Count |
|-----|------:|
| product | 2 |
| missing_automation | 0 |
| env | 0 |

## Failures

| ID | Tag | Expected | Observed | Evidence |
|----|-----|----------|----------|----------|
| ZZ-SHOP-30 | product | 400 HOURS_INVALID | 200 + 00:00 coerce | integration body |
| ZZ-SHOP-41 | product | API 400 + UI hint | API 400; no hint | partial: manual half |

## Skips

| ID | Reason |
|----|--------|
| ZZ-SHOP-99 | deferred: e2e harness |

## Notes

- Fixture restore: yes
- Follow-ups: fix hours coerce (product); UI hint on capacity

## Files updated

- `scenarios/settings/shop.md`
```

---

## 8. GO criteria

| Criterion | Met? |
|-----------|------|
| Discovery table filled | |
| Every in-scope row has Result | |
| No Skip without reason | |
| Failures tagged + evidenced | |
| Expected never edited | |
| Summary counts = in-scope rows | |
| Fixtures restored | |

Pass = agreement with **documented Expected**, not comfort with current code.
