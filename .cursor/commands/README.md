# Commands index (Cursor)

**Generated** by [`../../harness/scripts/agent/sync-agent-skills.sh`](../../harness/scripts/agent/sync-agent-skills.sh).

Local overrides **replace** the upstream command body for `/spec`, `/plan`, and `/build`. Other commands are upstream English plus an appended [agent-skills-standards](../../harness/scripts/agent/agent-skills-standards/) snippet.

| Command | Definition (edit here) | Related standards |
|---------|------------------------|-------------------|
| `/spec` | [local-commands/spec.md](../../harness/scripts/agent/local-commands/spec.md) → `docs/specs/` | [standards/spec.md](../../harness/scripts/agent/agent-skills-standards/spec.md) |
| `/plan` | [local-commands/plan.md](../../harness/scripts/agent/local-commands/plan.md) → `docs/exec-plans/active/` | [standards/plan.md](../../harness/scripts/agent/agent-skills-standards/plan.md) |
| `/build` | [local-commands/build.md](../../harness/scripts/agent/local-commands/build.md) | [standards/build.md](../../harness/scripts/agent/agent-skills-standards/build.md) |
| `/code-build` | alias of `/build` | — |
| `/test` | upstream + standards | [standards/test.md](../../harness/scripts/agent/agent-skills-standards/test.md) |
| `/review` | upstream + standards | [standards/review.md](../../harness/scripts/agent/agent-skills-standards/review.md) |
| `/webperf` | upstream + standards | [standards/webperf.md](../../harness/scripts/agent/agent-skills-standards/webperf.md) |
| `/code-simplify` | upstream + standards | [standards/code-simplify.md](../../harness/scripts/agent/agent-skills-standards/code-simplify.md) |
| `/ship` | upstream + standards | [standards/ship.md](../../harness/scripts/agent/agent-skills-standards/ship.md) |
| `/release` | [local-commands/release.md](../../harness/scripts/agent/local-commands/release.md) | — |
| `/gc` | [local-commands/gc.md](../../harness/scripts/agent/local-commands/gc.md) | — |
