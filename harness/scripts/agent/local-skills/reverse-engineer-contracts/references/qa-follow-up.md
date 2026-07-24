# QA follow-up

Use when a contracts review is **Conditional Pass** (or lists open DoD) and the user wants SE/docs fixes.

## Steps

1. Read the review file (path from user or discovery).  
2. Copy open DoD items into a working checklist.  
3. For each item:
   - **Schema / field gap** → fix as-built OpenAPI or UI/domain from code; add/close gap IDs.  
   - **Overclaim** (e.g. “audit complete” while stubs remain) → correct known-gaps wording; open leftover IDs.  
   - **DESIGN ≠ code** → ask A (update DESIGN) or B (change code); apply only the chosen path.  
4. Update the review’s follow-up section or DoD checkboxes if the review file is in scope (factual status only — do not invent a Pass verdict for QA).  
5. Suggest `/qa` `docs-review` for re-check (required — do not claim Pass yourself).

## Do not

- Mark Product-complete or QA Gate READY here.  
- Close gaps by deleting them without evidence.  
- Implement large runtime refactors unless the user chose path B and asked to build.
