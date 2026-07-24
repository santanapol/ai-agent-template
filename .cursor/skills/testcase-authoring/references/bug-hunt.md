# Bug-hunt — distrust code

Adversarial authoring: find where **implementation diverges from product SoT**, especially across layers.

Full worked example: [examples-bug-hunt.md](examples-bug-hunt.md). Deep-from-SoT (not this mode): [examples-deep.md](examples-deep.md).

## Principles

1. **Oracle = external SoT** — specs, API contracts, UI design, acceptance criteria.  
2. **Implementation is suspect** — read code to spot gaps, not to copy rules into Expected.  
3. **No validator-mirror** — Expected that is only “whatever the current schema does,” with no SoT backing, fails bug-hunt quality.  
4. **Cross-layer required** — at least **one** row comparing layers (UI validation ↔ API schema ↔ published contract ↔ persistence / auth on write), or an explicit N/A in Bug-hunt notes with reason.  
5. **Hunt silent behavior** — coercion, hidden defaults, trim on one side only, nulls where SoT requires values, read allowed but write unauthenticated, timezone/string normalize mismatches, etc.  
6. **Execute Fail = bug signal** — do not “fix” Expected to match code; execution records Fail.

## When to run mode C

- User asks for bug-hunt / distrust code  
- Deep pass looked like validator-mirror  
- UI, API, and contract were written by different hands  
- Past production bugs around defaults/auth/parity  

## Anti-patterns

| Anti-pattern | Why it fails |
|--------------|--------------|
| Copy schema-library / handler rules into Expected without spec | Tests implementation against itself |
| Only happy paths after a “deep” pass | Misses parity and auth holes |
| Automated unit that imports the same validator as oracle | Circular confidence |
| Changing Expected after Fail to match code | Hides product bugs |
| Cross-layer row with no SoT on which layer should win | Vague Expected — pin Spec or document open question to user |

## Checklist (tick while authoring)

- [ ] Named the SoT sections used as oracle  
- [ ] At least one cross-layer row (or N/A noted)  
- [ ] Compared UI rules vs API/contract for the same field  
- [ ] Checked auth/authorization on **writes**, not only reads  
- [ ] Checked coerce / default / empty-string / whitespace  
- [ ] Checked “invalid combination” the UI might allow  
- [ ] Expected cites Spec/FR or contract clause  
- [ ] No row is pure mirror of current handler behavior  

## After authoring

Hand automated IDs to the repo’s TDD skill. Run via `testcase-execution`. Product fixes go through the normal build/fix path—not this skill.
