# Workflow

## Evidence sources (prefer in this order)

1. Route handlers / controllers  
2. Serializers / response mappers  
3. Request validators (schema libs, form validators, …)  
4. Domain services that set status / side effects  
5. UI forms and error copy (for UI contracts)  
6. ORM schema / migrations (for `schema-audit`)

Never invent fields. If OpenAPI previously claimed a field the code does not return, remove or gap it.

## API description format

From discovery (`API style`):

- **OpenAPI** → use [templates/api/](../templates/api/) (`_components` + per-actor files).  
- **Other** (GraphQL SDL, Protobuf, typed route modules, …) → keep the same *document kinds* (shared types + per-actor surface) but write in that format; do not force empty OpenAPI YAML if the repo never uses it. Note the chosen format in contracts `README.md`.

## Bootstrap

1. Create contracts root.  
2. Copy [templates/](../templates/) preserving required headings.  
3. For each discovered actor: copy `api/_actor.openapi.yaml` → `api/{actor}.openapi.yaml` and `ui/_surface.md` → `ui/{actor}.md` (**OpenAPI path only** — if API style is not OpenAPI, create the equivalent shared + per-actor files named in README).  
4. Fill README SoT matrix and Rules. **Preserve required headings** from templates.  
5. Fill domain from enums / status machines in code.  
6. Fill API surfaces from routes; shared errors into shared components (or equivalent).  
7. Fill UI surfaces from pages/components.  
8. Start `known-gaps.md` for known drift vs design/product.  
9. Add `error-catalogue.md` and `ops-surfaces.md` from envelope helpers and non-API paths.

## Audit / refresh

1. List endpoints or screens in scope (user slice or full package).  
2. For each: request schema, response schema, status codes, error codes — match code.  
3. Update UI field matrices (rules + error copy from validators).  
4. Append **Audit log** rows in `known-gaps.md`.  
5. Run conditional steps below.

## Conditional steps (mandatory when triggered)

| Trigger | Action |
|---------|--------|
| As-built documents behavior missing Testable AC in the matching product spec | Add `## Testable acceptance criteria` (≤ 8, Given/When/Then + HTTP/`error.code` or stable UI copy) |
| Two API docs disagree and no winner declared | Deprecate legacy as SoT; point to contracts; do **not** paste entire legacy file into contracts |
| DESIGN (or equivalent) contradicts code/contracts | Ask user: **A** update DESIGN to match code, or **B** change code — do not guess |
| User asks for DB/schema, or discovery finds ORM but ERD never audited against it | Run **`schema-audit`** (checklist below) |

## `schema-audit` checklist

Compare ORM models / migrations to the repo’s ERD (or data design doc). Do **not** move ERD into the contracts package by default.

- [ ] Tables / collections present in code appear in ERD (and vice versa for claimed tables)  
- [ ] Enums / check constraints vs `domain.md` status lists  
- [ ] Nullability and unique keys that APIs rely on  
- [ ] Public id vs internal id mapping documented in `domain.md` Identifiers  
- [ ] Drift → `known-gaps` rows or ERD patch (ask before large ERD rewrites)

Update ERD or open gaps; leave contracts focused on behavior contracts unless the user asks otherwise.

## QA follow-up

See [qa-follow-up.md](qa-follow-up.md).

## Quality bars

- Required template headings remain (rename only actor file names).  
- `as-built-of` date updated when content changes.  
- If the repo has OpenAPI lint, run it on touched YAML.
