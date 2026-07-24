# Repo discovery

Fill this table before writing. Prefer `AGENTS.md`, `docs/README.md`, `harness.config.yaml`, and existing specs indexes.

| Item | How to find | Value |
|------|-------------|-------|
| Docs root | `docs/` or AGENTS map | |
| Contracts root | Default `{docs}/specs/contracts/` — override if repo uses another path | |
| Product specs | `{docs}/specs/*.md` or AGENTS | |
| Design / ERD / stack | `{docs}/design-docs/` or equivalent | |
| Legacy API doc | Monolithic OpenAPI or similar (if any) | |
| Code zones | `harness.config.yaml` / AGENTS (frontend, backend, …) | |
| Actors | Who calls the API/UI (e.g. public, customer, admin, partner) | |
| API style | OpenAPI YAML, Proto, GraphQL SDL, … | |
| Auth surface | Session, JWT, API key — paths outside business API | |
| Jobs / cron | Paths not in actor API docs | |
| ORM / schema | Drizzle, Prisma, SQL migrations, … | |
| Completeness guide | Optional DoD doc under contracts (if present) | |
| QA review files | `contracts/review-*.md` (if present) | |

## Rules

- If contracts root does not exist and user wants bootstrap → create under the default convention unless discovery names another path.  
- If multiple OpenAPI files disagree → note both; as-built winner will be the contracts package.  
- Do not assume timezone, ID format, or envelope shape — read code.
