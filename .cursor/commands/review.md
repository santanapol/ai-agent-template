---
name: review
description: Conduct a five-axis code review — correctness, readability, architecture, security, performance
disable-model-invocation: true
---


Read and follow **code-review-and-quality** (`.cursor/skills/code-review-and-quality/SKILL.md`) completely.

Review the current changes (staged or recent commits) across all five axes:

1. **Correctness** — Does it match the spec? Edge cases handled? Tests adequate?
2. **Readability** — Clear names? Straightforward logic? Well-organized?
3. **Architecture** — Follows existing patterns? Clean boundaries? Right abstraction level?
4. **Security** — Input validated? Secrets safe? Auth checked? (Use security-and-hardening skill)
5. **Performance** — No N+1 queries? No unbounded ops? (Use performance-optimization skill)

Categorize findings as Critical, Important, or Suggestion.
Output a structured review with specific file:line references and fix recommendations.

## Related Coding Standards

When executing this command, follow the domain standards that apply to the work:

**Backend:**
- `coding-standard/backend/02-folder-structure.md`
- `coding-standard/backend/03-api-routing.md`
- `coding-standard/backend/05-security-and-validation.md`
- `coding-standard/backend/06-api-response-codes.md`
- `coding-standard/backend/12-data-management.md`
- `coding-standard/backend/13-code-quality.md`

**Auth:**
- `coding-standard/auth/02-folder-structure.md`
- `coding-standard/auth/03-api-routing.md`
- `coding-standard/auth/05-security-and-validation.md`
- `coding-standard/auth/06-api-response-codes.md`
- `coding-standard/auth/12-data-management.md`
- `coding-standard/auth/13-code-quality.md`

**Frontend (Backoffice):**
- `coding-standard/frontend/backoffice/02-folder-structure.md`
- `coding-standard/frontend/backoffice/03-routing-and-pages.md`
- `coding-standard/frontend/backoffice/04-state-management.md`
- `coding-standard/frontend/backoffice/07-authentication.md`
- `coding-standard/frontend/backoffice/08-error-handling.md`
- `coding-standard/frontend/backoffice/10-code-quality.md`

**Gateway:**
- `coding-standard/gateway/02-folder-structure.md`
- `coding-standard/gateway/03-api-routing.md`
- `coding-standard/gateway/05-security-and-validation.md`
- `coding-standard/gateway/06-api-response-codes.md`
- `coding-standard/gateway/11-code-quality.md`
