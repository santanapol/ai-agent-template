# Scenario file template (portable)

Copy into the repo’s scenarios tree (path from discovery). Replace `<…>`. Prefer the repo’s own `_template` when it exists.

**Round:** `stub` \| `deep`. Bug-hunt is **not** a separate Round value — add `## Bug-hunt notes` and RK rows while Round stays `deep` (or keep stub Round only if still mapping).

```markdown
# Test cases: <Slice title>

**Created:** YYYY-MM-DD
**Last run:** —
**Env:** <from runbook / local>
**ID prefix:** <from repo README/catalogue>
**Scenario ID:** <SCENARIO>
**Catalogue slots:** <e.g. S1, S2>
**Round:** stub | deep

### Run summary

| | Count |
|--|------:|
| Pass | 0 |
| Fail | 0 |
| Skip | 0 |
| **Total** | 0 |

---

## Fixture

| Item | Value |
|------|-------|
| <relevant setting> | |

## Test data

<!-- Required for Round deep; optional for stub -->

| TD | Field | Value | Class |
|----|-------|-------|-------|
| | | | valid \| invalid |

## Recommended run order

1. Negatives that need no prior data
2. Positives / baseline creates
3. Negatives that depend on state
4. Cross-role / journey / bug-hunt rows last

## Negative

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| <PREFIX>-<SCENARIO>-01 | | BV | | | | integration | |

## Positive

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| <PREFIX>-<SCENARIO>-10 | | UC | | | | integration | |

## Deep

<!-- Round deep: expand Test data, EP/BV/ST/DT rows, precise Expected from Spec -->

## Bug-hunt notes

<!-- Mode C: layers compared; SoT citations; ≥1 cross-layer row or N/A -->
```

Leave **Result** blank while authoring. Execution fills Result, Last run, and Run summary.

Examples: [examples-stub.md](examples-stub.md) · [examples-deep.md](examples-deep.md) · [examples-bug-hunt.md](examples-bug-hunt.md) · empty-repo setup: [bootstrap.md](bootstrap.md)
