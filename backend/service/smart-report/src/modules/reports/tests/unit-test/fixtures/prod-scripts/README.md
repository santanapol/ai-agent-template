# Production script compiler fixtures

Golden samples of Booster-style report scripts used in CI to verify `compileBoosterScript` output.

| Fixture | Pattern |
|---------|---------|
| `group-a-single-aggregate.js` | Trailing `aggregate([...])` |
| `group-b-batch-toarray.js` | `.toArray()` wrapper stripped at compile |
| `group-c-find.js` | Trailing `find({...})` |

Full production coverage is enforced by `npm run migrate:scripts -- --test-run --fail-on-error`, which validates every enabled report in the database. Add new golden files here when a distinct compile pattern appears in production scripts.
