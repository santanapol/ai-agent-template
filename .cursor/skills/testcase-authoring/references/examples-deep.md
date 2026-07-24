# Examples — deep from SoT (fictional)

Teaching example only. Domain: fictional **shop settings** (not any real product).  
PREFIX `ZZ` · Scenario `SHOP` · Slots `S1` (identity/capacity fields) · `S2` (save/persist).

**Round:** `deep`  
**Oracle:** product Spec §§ cited below — **not** the current validator/handler source.

**Scale:** This file is intentionally **maximal** for teaching. For a real slice, cover **every SoT rule in scope** with representatives — do **not** paste this entire matrix when the Spec is smaller. Prefer stub first ([examples-stub.md](examples-stub.md)); cross-layer distrust is mode C ([examples-bug-hunt.md](examples-bug-hunt.md)).

---

## Deep vs stub vs bug-hunt

| | Stub | Deep (this file) | Bug-hunt |
|--|------|------------------|----------|
| Goal | Coverage map + runnable IDs | Expand **from SoT**: Test data, EP/BV/ST/DT, precise Expected | Find layer gaps; distrust code |
| Techniques | Few EP + UC | Full matrices tied to Spec | RK + cross-layer |
| Read code? | Rarely | Optional for *locating* fields — never for Expected | Yes, to spot gaps only |
| Stop when | Slots no longer empty | Every SoT rule for the slice has representatives | ≥1 cross-layer row (+ silent behaviors) |

Deep **does not** replace bug-hunt. After deep, if layers may disagree, run mode C ([examples-bug-hunt.md](examples-bug-hunt.md)).

---

## What deep adds over stub (delta)

Assume stub already had:

| ID | Case (stub) |
|----|-------------|
| ZZ-SHOP-01 | Empty name → reject |
| ZZ-SHOP-02 | Whitespace-only name → reject |
| ZZ-SHOP-10 | Save “Harbor Spa” → persist |

Deep adds:

1. **Fixture** — world state for the slice  
2. **Test data** — valid/invalid classes + named TD codes  
3. **BV / EP / ST / DT** rows tied to Spec limits and combinations  
4. **Precise Expected** — HTTP + error code/field (as Spec defines)  
5. **Catalogue** — slots marked `deep`  
6. **`## Deep` section** in the same scenario file (no separate `deep/` folder)

---

## Fictional Spec excerpts (oracle)

Use these as if they were `docs/specs/…`:

| Clause | Rule |
|--------|------|
| §Shop.name | Required; trim before validate; length 1..80 after trim; empty and whitespace-only → `SHOP_NAME_REQUIRED` |
| §Capacity | Integer 1..20 inclusive; non-integer → `CAPACITY_TYPE`; out of range → `CAPACITY_RANGE` |
| §Hours.open_day | If day `is_open=true`, both `open` and `close` required (`HH:mm`); `close` must be strictly after `open` → else `HOURS_INVALID` |
| §Hours.closed_day | If `is_open=false`, times must be null → else `HOURS_CLOSED_MUST_NULL` |
| §Shop.save | Authenticated admin; persist atomic; reload shows saved values |
| §Errors | Validation failures → HTTP **400** + `{ code, field? }` |

---

## Fixture

| Item | Value |
|------|-------|
| Existing shop name | `Harbor Spa` |
| Capacity | `8` |
| Mon–Fri | open 09:00–18:00 |
| Sat–Sun | closed (`is_open=false`, times null) |
| Actor | Admin session (unless row says otherwise) |

Deep may keep fixture minimal; only include what changes Expected or setup.

---

## Test data

Local TD codes are **per file**; cross-file refs use full IDs.

### Capacity (`capacity`)

| TD | Value | Class | Notes |
|----|-------|-------|-------|
| C-V1 | `1` | valid BV min | |
| C-V2 | `10` | valid EP mid | |
| C-V3 | `20` | valid BV max | |
| C-I1 | `0` | invalid BV min−1 | |
| C-I2 | `21` | invalid BV max+1 | |
| C-I3 | `1.5` | invalid type | |
| C-I4 | `""` | invalid empty | |
| C-I5 | `"8"` | valid if Spec allows numeric string coerce **or** invalid — **document Spec**; here: Spec says integer JSON number only → invalid `CAPACITY_TYPE` |
| C-I6 | `null` | invalid missing | |

### Shop name (`shop_name`)

| TD | Value | Class | Notes |
|----|-------|-------|-------|
| N-V1 | `"A"` | valid BV len 1 | |
| N-V2 | 80×`"x"` | valid BV len 80 | |
| N-V3 | `"Harbor Spa"` | valid EP typical | |
| N-I1 | `""` | invalid empty | |
| N-I2 | `"   "` | invalid whitespace-only (after trim empty) | |
| N-I3 | 81×`"x"` | invalid BV len 81 | |
| N-I4 | `"  Harbor Spa  "` | valid after trim → stores `Harbor Spa` per §Shop.name | |

### Hours (open Monday)

| TD | open | close | is_open | Class |
|----|------|-------|---------|-------|
| H-V1 | 09:00 | 18:00 | true | valid |
| H-V2 | 09:00 | 09:01 | true | valid BV minimal span |
| H-I1 | 18:00 | 09:00 | true | invalid close ≤ open |
| H-I2 | 09:00 | 09:00 | true | invalid equal |
| H-I3 | null | null | true | invalid open day needs times |
| H-I4 | 09:00 | 18:00 | false | invalid closed day must null times |

---

## Recommended run order (deep)

1. Negatives that need no prior mutation (C-I*, N-I*, H-I*)  
2. Boundary positives (C-V1/V3, N-V1/V2, H-V2)  
3. Typical positive save (N-V3 + C-V2)  
4. State / decision-table rows (closed↔open)  
5. Persist/reload UC last  

---

## Negative

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-01 | S1 | EP | Submit `N-I1` empty name | 400 `SHOP_NAME_REQUIRED` field `shop_name` | §Shop.name | integration | |
| ZZ-SHOP-02 | S1 | EP | Submit `N-I2` whitespace-only | 400 `SHOP_NAME_REQUIRED` | §Shop.name | integration | |
| ZZ-SHOP-03 | S1 | BV | capacity `C-I1` = 0 | 400 `CAPACITY_RANGE` field `capacity` | §Capacity | integration | |
| ZZ-SHOP-04 | S1 | BV | capacity `C-I2` = 21 | 400 `CAPACITY_RANGE` | §Capacity | integration | |
| ZZ-SHOP-05 | S1 | BV | name `N-I3` len 81 after trim | 400 `SHOP_NAME_LENGTH` (or Spec’s code) | §Shop.name max 80 | integration | |
| ZZ-SHOP-06 | S1 | EP | capacity `C-I3` = 1.5 | 400 `CAPACITY_TYPE` | §Capacity | integration | |
| ZZ-SHOP-07 | S1 | EP | capacity `C-I4` = `""` | 400 `CAPACITY_TYPE` | §Capacity | integration | |
| ZZ-SHOP-08 | S1 | EP | capacity `C-I5` = `"8"` string | 400 `CAPACITY_TYPE` | §Capacity integer JSON | integration | |
| ZZ-SHOP-09 | S1 | EP | capacity `C-I6` = null | 400 `CAPACITY_TYPE` or required code | §Capacity | integration | |
| ZZ-SHOP-13 | S1 | BV | hours `H-I1` close before open | 400 `HOURS_INVALID` | §Hours.open_day | integration | |
| ZZ-SHOP-14 | S1 | BV | hours `H-I2` close == open | 400 `HOURS_INVALID` | §Hours.open_day | integration | |
| ZZ-SHOP-15 | S1 | EP | hours `H-I3` open day null times | 400 `HOURS_INVALID` | §Hours.open_day | integration | |
| ZZ-SHOP-16 | S1 | EP | hours `H-I4` closed day with times | 400 `HOURS_CLOSED_MUST_NULL` | §Hours.closed_day | integration | |

---

## Positive

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-10 | S2 | UC | Save `N-V3` + `C-V2` | 200; reload name `Harbor Spa`, capacity `10` | §Shop.save | integration | |
| ZZ-SHOP-11 | S1 | BV | capacity `C-V1` = 1 | Accept; stored 1 | §Capacity.min | integration | |
| ZZ-SHOP-12 | S1 | BV | capacity `C-V3` = 20 | Accept; stored 20 | §Capacity.max | integration | |
| ZZ-SHOP-17 | S1 | BV | name `N-V1` len 1 | Accept | §Shop.name min | integration | |
| ZZ-SHOP-18 | S1 | BV | name `N-V2` len 80 | Accept | §Shop.name max | integration | |
| ZZ-SHOP-19 | S1 | EP | name `N-I4` padded spaces | Accept; stored trimmed `Harbor Spa` | §Shop.name trim | integration | |
| ZZ-SHOP-20 | S1 | BV | hours `H-V2` 09:00–09:01 | Accept | §Hours.open_day | integration | |
| ZZ-SHOP-21 | S1 | UC | hours `H-V1` weekdays open | Accept; public read shows same window | §Hours + §Shop.save | integration | |

---

## State / decision table (Deep)

### ST — closed day → open day

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-22 | S1 | ST | Sunday was closed; set `is_open=true` without times | 400 `HOURS_INVALID` | §Hours.open_day | integration | |
| ZZ-SHOP-23 | S1 | ST | Sunday closed → open with `H-V1` times | 200; Sunday open 09:00–18:00 | §Hours | integration | |
| ZZ-SHOP-24 | S1 | ST | Monday open → set `is_open=false` but leave times | 400 `HOURS_CLOSED_MUST_NULL` | §Hours.closed_day | integration | |
| ZZ-SHOP-25 | S1 | ST | Monday open → closed with times null | 200; Monday closed | §Hours.closed_day | integration | |

### DT — name × capacity (save button / API body)

| name class | capacity class | Expected (Spec) | Example ID |
|------------|----------------|-----------------|------------|
| valid | valid | 200 persist | ZZ-SHOP-10 |
| invalid | valid | 400 name code; no partial persist | ZZ-SHOP-01 |
| valid | invalid | 400 capacity code; name unchanged on reload | ZZ-SHOP-03 |
| invalid | invalid | 400; prefer documenting whether one or multi-error — here Spec returns **first** field error only | ZZ-SHOP-26 |

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-26 | S1 | DT | `N-I1` + `C-I1` together | 400; at least one validation code; DB unchanged | §Errors + §Shop.save atomic | integration | |

---

## ## Deep section (paste shape)

In the real scenario file, keep stub tables and append:

```markdown
## Deep

**Round:** deep  
**Oracle:** Spec §§ … (paths from discovery)

### Test data
(tables as above)

### Added negatives / positives / ST / DT
(rows ZZ-SHOP-03…)

### Notes
- Expected codes taken from Spec §Errors — not from current handler messages.
- Trim behavior per §Shop.name; if UI trims and API does not, escalate to bug-hunt.
```

---

## Catalogue update (example)

| Slot | After stub | After deep |
|------|------------|------------|
| S1 identity/capacity/hours field rules | `stub` | `deep` |
| S2 save/persist | `stub` | `deep` |

---

## Automated column guidance (still portable)

| Kind of row | Typical Automated | Why |
|-------------|-------------------|-----|
| Pure field validation / hours rules | `integration` (or `unit` if repo isolates pure parsers) | Per testing guide of **that** repo |
| Persist + reload | `integration` | Needs real store |
| Visible-only UI (disabled button flash) | `manual` or `e2e` | If API cannot see it |
| Not ready | `deferred` + reason | |

Discover runner paths from the repo; do not hardcode a framework here.

---

## Done checklist for this example’s depth

- [x] Fixture present  
- [x] Test data covers valid/invalid classes used by rows  
- [x] Every TD invalid/valid used in at least one row (or explicitly deferred)  
- [x] Techniques: EP, BV, ST, DT, UC  
- [x] Expected cites Spec clause + concrete code/HTTP  
- [x] Result left blank  
- [x] Boundary vs bug-hunt documented  
- [x] Catalogue status transition shown  

---

## Anti-patterns (deep)

| Bad | Why |
|-----|-----|
| Copy current schema messages into Expected | Validator-mirror (belongs in “fail bug-hunt quality”) |
| Only happy paths + one empty-field row | Still stub thickness |
| Invent error codes not in Spec | Creates requirements — forbidden |
| Mark Round `deep` without Test data | Fails Done checklist |
| Put cross-layer “UI vs API disagree” rows here without SoT on which layer wins | That is **bug-hunt**, not deep |

---

## Hand-off

1. Leave Result empty → `/testcase-run` later.  
2. For automate IDs → `/test` (TDD) so titles include each ID per repo guide.  
3. For distrust-code / parity → mode C + [examples-bug-hunt.md](examples-bug-hunt.md).
