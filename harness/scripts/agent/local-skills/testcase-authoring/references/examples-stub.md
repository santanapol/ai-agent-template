# Examples — stub (fictional)

Teaching example. Domain: fictional **shop settings** (not any real product).  
PREFIX `ZZ` · Scenario `SHOP` · Slots `S1` (name/capacity fields) · `S2` (save).

**Round:** `stub`  
**Goal:** Coverage map + runnable IDs — **not** full BV matrices.

Next step after stub: [examples-deep.md](examples-deep.md). Cross-layer distrust: [examples-bug-hunt.md](examples-bug-hunt.md). Empty repo: [bootstrap.md](bootstrap.md).

---

## Stub vs deep (what to skip now)

| Include in stub | Leave for deep |
|-----------------|----------------|
| Main negatives (empty / whitespace) | Full BV min/max±1 matrices |
| One clear UC save | ST/DT grids |
| Automated filled · Result blank | Precise error codes if Spec not read yet — use short Expected, refine in deep |
| Catalogue slots → `stub` | Catalogue → `deep` |

---

## Catalogue (after stub)

| Slot | Behavior | File | Status |
|------|----------|------|--------|
| S1 | Shop name + capacity field rules | `scenarios/settings/shop.md` | `stub` |
| S2 | Save / persist settings | `scenarios/settings/shop.md` | `stub` |

---

## Fixture (minimal)

| Item | Value |
|------|-------|
| Actor | Admin (assumed for save) |
| Starting name | _(empty or prior — note if needed)_ |

---

## Negative

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-01 | S1 | EP | Submit empty shop name | Reject; name required | Spec §Shop.name required | integration | |
| ZZ-SHOP-02 | S1 | EP | Whitespace-only name | Reject (same as empty per SoT) | Spec §Shop.name | integration | |

## Positive

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-10 | S2 | UC | Save valid name “Harbor Spa” | Persist; reload shows name | Spec §Shop.save | integration | |

---

## Done (stub)

- [x] Slots no longer `empty`  
- [x] Main happy path + critical negatives  
- [x] Automated set · Result blank · Round `stub`  
- [ ] Not required yet: Test data tables, ST/DT, error-code precision  

**Scale:** One slice can be 3–8 rows. Do not copy deep’s full matrix into stub.
