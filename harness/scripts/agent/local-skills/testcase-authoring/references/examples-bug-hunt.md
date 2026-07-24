# Examples — bug-hunt (fictional)

Teaching example. Same fictional **shop settings** as stub/deep (`ZZ` / `SHOP`).  
Oracle: Spec + OpenAPI + UI design. **Implementation is suspect.**

**Prereq:** Prefer after [examples-deep.md](examples-deep.md) SoT expansion. Rules: [bug-hunt.md](bug-hunt.md).

**Scale:** Add RK/cross-layer rows for **suspect seams only** — do not duplicate the entire deep matrix as RK.

---

## Bug-hunt vs deep

| Deep already did | Bug-hunt adds |
|------------------|---------------|
| EP/BV/ST/DT from Spec | UI ↔ API ↔ contract ↔ auth disagreements |
| Precise Expected from Spec | Silent coerce/defaults one layer applies |
| Trusted Spec as oracle | Same oracle — but hunt where **code layers disagree with each other or with Spec** |

If Spec is silent on which layer wins, **ask the user** or record an open question — do not invent.

---

## Oracle excerpts (reuse deep Spec)

| Clause | Rule |
|--------|------|
| §Shop.name | Trim before validate; 1..80 after trim |
| §Hours.open_day | Open day needs times; `close` strictly after `open` |
| §Hours.closed_day | Closed ⇒ times null |
| §Shop.save | Admin auth on **write**; atomic persist |
| §Errors | 400 + `{ code, field? }`; unauthenticated write → **401** |

UI design (fictional): client may disable Save when close ≤ open **or** may forget — treat UI as untrusted.

---

## Bug-hunt notes (paste shape)

```markdown
## Bug-hunt notes

- Layers compared: UI form rules ↔ API body schema ↔ OpenAPI ↔ auth on PUT
- SoT: Spec §§Shop.name, Hours.*, Shop.save; OpenAPI `PUT /settings`
- Suspect: coerce null→00:00; trim only on UI; GET public without auth vs PUT
- Cross-layer rows: ZZ-SHOP-30…35
```

---

## Cross-layer / silent behavior

| ID | Slot | Technique | Case | Expected | Spec/FR | Automated | Result |
|----|------|-----------|------|----------|---------|-----------|--------|
| ZZ-SHOP-30 | S1 | RK | UI allows close ≤ open; API must still reject | API 400 `HOURS_INVALID`; no silent `00:00` | §Hours.open_day · OpenAPI | integration | |
| ZZ-SHOP-31 | S1 | RK | Open day with `open`/`close` null via API (UI blocked) | 400 `HOURS_INVALID`; no coerce to midnight | §Hours.open_day | integration | |
| ZZ-SHOP-32 | S1 | RK | Closed day with times sent via API | 400 `HOURS_CLOSED_MUST_NULL` | §Hours.closed_day | integration | |
| ZZ-SHOP-33 | S2 | RK | UI trims name; raw API body has leading/trailing spaces | Stored value = trimmed per §Shop.name (both paths) **or** both reject — Spec wins; Fail if layers disagree silently | §Shop.name trim | integration | |
| ZZ-SHOP-34 | S2 | RK | PUT settings without session | **401**; no partial write | §Shop.save auth | integration | |
| ZZ-SHOP-35 | S2 | RK | GET settings allowed anonymously (if Spec says public read) but PUT without auth | GET may 200; PUT 401 | Spec read vs write | integration | |
| ZZ-SHOP-36 | S1 | RK | Capacity JSON string `"8"` while UI sends number | 400 `CAPACITY_TYPE` per Spec (no quiet coerce) **unless** Spec explicitly allows — then both layers must match Spec | §Capacity | integration | |
| ZZ-SHOP-37 | S1 | RK | OpenAPI says `close > open`; handler currently accepts equal (if code does) | Still Expected 400 from Spec/OpenAPI — **Fail** on execute if 200 | OpenAPI · §Hours | integration | |

---

## What not to write

| Bad row | Why |
|---------|-----|
| “schema currently allows 0 → Expected accept” | Validator-mirror |
| “handler returns 200 for null times → Expected 200” | Codifies a bug |
| RK row that only repeats ZZ-SHOP-03 with no layer contrast | Not bug-hunt — keep as deep BV |

---

## Catalogue

| Slot | Status after bug-hunt |
|------|------------------------|
| S1 / S2 | stay `deep` (bug-hunt is notes + rows, not a Round name) |

---

## Done checklist (this example)

- [x] SoT sections named  
- [x] ≥1 cross-layer row (UI↔API, auth write, coerce)  
- [x] Expected cites Spec/OpenAPI  
- [x] No validator-mirror-only rows  
- [x] Result blank  

If `/testcase-run` marks Fail → success for authoring discipline; fix product via build — do **not** rewrite Expected to match code.

## Hand-off

1. Automate new IDs → `/test`  
2. Execute → `/testcase-run`  
3. Open questions on Spec silence → ask user before more rows  
