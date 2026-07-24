# Result rules

## Values

| Result | When |
|--------|------|
| **Pass** | Observed behavior matches **Expected** (and SoT it cites) |
| **Fail** | Observed behavior differs from Expected / SoT |
| **Skip** | Not run: deferred, blocked prep, out of scope, or explicit reason |

### Fail subclasses (for Notes / report)

Tag Failures so summaries stay honest:

| Tag | Meaning |
|-----|---------|
| `product` | Behavior ≠ Expected; implementation likely wrong vs SoT |
| `missing_automation` | Automated column claims coverage but no matching test |
| `env` | Could not validly observe (wrong Env, flake, infra) — prefer Skip when entirely blocked; use Fail+`env` only if a run occurred and was inconclusive **and** user wants Fail recorded |

Bug-hunt Fail against Spec = **`product` finding**, not a docs mistake.

## Oracle

- Primary: **Expected** (+ Spec/FR).  
- Code disagrees → **Fail** (`product`).  
- **Do not** Pass because “the implementation intends this.”  
- **Do not** rewrite Expected during execution.

## Ambiguity

| Problem | Action |
|---------|--------|
| Expected vague (“reject”) | Fail only if clearly wrong; else Skip + “Expected too vague — re-author” |
| Spec conflict inside Expected | Skip + ask user |
| Flaky / env noise | Skip or Fail+`env` with evidence — never “Pass to move on” |

## Bundled automation

One test → many IDs: mark each consistently; note “bundled with …”.

## Evidence template (Fail)

Keep short; no secrets:

```text
ID: <ID>
Expected: <from column>
Observed: <HTTP/UI/state>
How: <command or UI steps>
Tag: product | missing_automation | env
```

## Last run

ISO date (and time if useful). Timezone from runbook/scenario Env; else UTC or user-locked session TZ — **state which**.

## Run summary

Per updated scenario file (in-scope rows only):

| | Count |
|--|------:|
| Pass | … |
| Fail | … |
| Skip | … |
| **Total** | |

Optional Notes line: `Fail tags: product=N missing_automation=N env=N`.

## Writing back to the scenario file

1. Set **Result** on each in-scope row (`Pass` / `Fail` / `Skip`).  
2. Set **Last run**.  
3. Recount **Run summary**.  
4. Do not edit Case / Expected / Automated / Spec/FR.  

See before/after in [examples-run.md](examples-run.md).

## Anti-patterns

| Bad | Why |
|-----|-----|
| Pass + edit Expected to match code | Hides bugs |
| Skip all Failures to green the summary | Lies |
| Mark Pass without running | Fraudulent Result |
| Leave Result blank after a claimed full run | Incomplete |
