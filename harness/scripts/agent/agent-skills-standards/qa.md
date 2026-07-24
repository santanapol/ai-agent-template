## Harness verification (portable)

Before **QA Gate READY** (`pre-ship`):

1. Run any **discovered** docs-lint / harness docs gate (if the repo defines one)
2. Run **discovered** app CI command(s) in discovered code zone(s)
3. Scenario Results recorded for in-scope rows (or Skip + reason)
4. Attach `security-auditor` + `test-engineer` summaries (after functional) — `/ship` may reuse if **fresh** (see below)

Lighter modes do not require the full gate; still run discovered docs-lint when writing review/report files under docs.

See [AGENTS.md](../../../../AGENTS.md) for this repo’s map (discovery still required).

## Related Coding Standards

`coding-standard/` may be empty — vendor org QA standards after fork when needed.

## Overlap with `/ship`

`/qa` issues **READY|NOT READY** only. Ship GO/NO-GO stays with `/ship`.

**Fresh** (reuse persona fan-out without re-run): latest `qa-gate-*.md` is from today (**session timezone from discovery**) or age ≤ 24h, **and** no material diff after the gate under **discovered** material paths (code zones + product oracle + in-scope scenarios).

## Overlap with `/reverse-contracts`

`/qa` reviews product + contracts and writes `review-*.md`. `/reverse-contracts` refreshes as-built from code. Loop: docs-review → Conditional Pass (as-built) → `/reverse-contracts` → docs-review again.
