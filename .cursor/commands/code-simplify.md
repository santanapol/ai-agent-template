---
name: code-simplify
description: Simplify code for clarity and maintainability — reduce complexity without changing behavior
disable-model-invocation: true
---


Read and follow **code-simplification** (`.cursor/skills/code-simplification/SKILL.md`) completely.

Simplify recently changed code (or the specified scope) while preserving exact behavior:

1. Read [agent-skills.mdc](../rules/agent-skills.mdc) and [AGENTS.md](../../AGENTS.md) for project conventions
2. Identify the target code — recent changes unless a broader scope is specified
3. Understand the code's purpose, callers, edge cases, and test coverage before touching it
4. Scan for simplification opportunities:
   - Deep nesting → guard clauses or extracted helpers
   - Long functions → split by responsibility
   - Nested ternaries → if/else or switch
   - Generic names → descriptive names
   - Duplicated logic → shared functions
   - Dead code → remove after confirming
5. Apply each simplification incrementally — run tests after each change
6. Verify all tests pass, the build succeeds, and the diff is clean

If tests fail after a simplification, revert that change and reconsider. Use `code-review-and-quality` to review the result.

## Related Coding Standards

`coding-standard/` is empty in this template — vendor org standards after fork; match `coding-standard/<domain>/` conventions when simplifying.

**Software testing** (included): `knowledge/software-testing/<topic>/README.md`
