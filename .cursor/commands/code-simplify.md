---
name: code-simplify
description: Simplify code for clarity and maintainability — reduce complexity without changing behavior
disable-model-invocation: true
---


Read and follow **code-simplification** (`.cursor/skills/code-simplification/SKILL.md`) completely.

Simplify recently changed code (or the specified scope) while preserving exact behavior:

1. Read CLAUDE.md and study project conventions
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

When executing this command, follow the domain standards that apply to the work:

**Backend:**
- `coding-standard/backend/02-folder-structure.md`
- `coding-standard/backend/13-code-quality.md`

**Auth:**
- `coding-standard/auth/02-folder-structure.md`
- `coding-standard/auth/13-code-quality.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/02-folder-structure.md`
- `coding-standard/frontend/backoffice/10-code-quality.md`

**Gateway:**
- `coding-standard/gateway/02-folder-structure.md`
- `coding-standard/gateway/11-code-quality.md`
