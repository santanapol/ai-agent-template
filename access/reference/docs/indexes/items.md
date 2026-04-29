# items indexes

Index audit trail for collection `items` (DBA-managed; application bootstrap must not create indexes).

## IDX_ITEMS_TENANT_LIST

- name: `IDX_ITEMS_TENANT_LIST`
- keys: `{ ou_id: 1, branch_id: 1, _id: -1 }`
- options: `{ background: true }`
- reason: Supports `GET /api/v1/items` filter by tenant (`ou_id`, `branch_id`) with `_id` descending pagination/sort.
- date: `2026-04-20`
- PR/ticket: `TBD`
- explain (`executionStats`):

```js
db.items
  .find({ ou_id: "<ou_id>", branch_id: "<branch_id>" })
  .sort({ _id: -1 })
  .skip(0)
  .limit(20)
  .explain("executionStats");
```

## IDX_ITEMS_TENANT_VERSION_CHECK

- name: `IDX_ITEMS_TENANT_VERSION_CHECK`
- keys: `{ _id: 1, ou_id: 1, branch_id: 1, upd_date: 1 }`
- options: `{ background: true }`
- reason: Supports optimistic concurrency filters used by `PUT`, `PATCH`, and `DELETE` with `_id + tenant + upd_date`.
- date: `2026-04-20`
- PR/ticket: `TBD`
- explain (`executionStats`):

```js
db.items
  .find({
    _id: ObjectId("<item_id>"),
    ou_id: "<ou_id>",
    branch_id: "<branch_id>",
    upd_date: ISODate("<etag_timestamp>"),
  })
  .explain("executionStats");
```
