# Bootstrap — empty testcase docs (portable)

Use only when discovery finds **no** testcase SoT (or user asked to recreate from scratch). Confirm with the user before writing files.

Do **not** invent product rules. Bootstrap creates **structure**; Expected still comes from product Spec/contract/UI SoT.

## Suggested layout

```text
docs/
  testing-guide.md          # levels · Automated · CI pointers (discover runner later)
  test-cases/
    README.md               # index · ID shape · folder map
    catalogue.md            # coverage slots · stub/deep status
    RUNBOOK.md              # prep · manual how-to (link ops)
    scenarios/
      _template.md          # copy of skill scenario-template or repo variant
      <zone>/               # e.g. settings, admin, customer
        <slice>.md
    reports/                # optional; created on first /testcase-run report
```

Paths may differ if AGENTS/README say so — adapt names, keep the roles.

## File minimums

### `docs/testing-guide.md`

- Purpose of guide vs catalogue vs scenarios  
- Levels: testcase docs → unit → integration → e2e (or repo’s names)  
- Rule: levels pick cases; do not invent requirements  
- How Automated values map to runners (commands from `package.json` — fill after discovery)  
- Link to `test-cases/README.md`

### `docs/test-cases/README.md`

- What this tree owns (IDs + Expected)  
- ID shape `PREFIX-SCENARIO-nn`  
- Folder map (zones → files) — start sparse  
- Link catalogue, RUNBOOK, testing-guide  
- Agent commands: `/testcase-author`, `/testcase-run`, `/test` (TDD)

### `docs/test-cases/catalogue.md`

| Column | Meaning |
|--------|---------|
| Slot | Stable id (e.g. `S1`) |
| Behavior | One-line capability |
| Primary scenario file | Path under `scenarios/` |
| Status | `empty` \| `stub` \| `deep` |
| Notes | optional |

Add rows from Spec/AC; do not mark `deep` until deep authoring is done.

### `docs/test-cases/RUNBOOK.md`

- Prep checklist (services, seed, health) — **fill from ops docs**, no invented ports  
- How to run automated suite (link testing-guide)  
- Manual browser notes  
- Fixture restore  

### `scenarios/_template.md`

Copy from [scenario-template.md](scenario-template.md). Prefer adapting language to the repo later.

## Order of work after bootstrap

1. Catalogue slots from Spec (status `empty`)  
2. Mode **A — Stub** per priority slice ([examples-stub.md](examples-stub.md))  
3. Mode **B — Deep** ([examples-deep.md](examples-deep.md)) — scale to SoT size  
4. Mode **C — Bug-hunt** where layers may disagree ([bug-hunt.md](bug-hunt.md))  
5. `/test` for automation · `/testcase-run` for Results  

## Refuse

- Bootstrap that embeds a tech stack or product domain from this skill’s fiction into the real repo as if it were truth  
- Writing hundreds of IDs before PREFIX/zone scheme is confirmed with the user  
