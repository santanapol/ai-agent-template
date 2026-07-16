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

`coding-standard/` is empty in this template — vendor org standards after fork, then apply domain rules from `coding-standard/<domain>/` during review.

**Software testing** (included): `knowledge/software-testing/<topic>/README.md`
