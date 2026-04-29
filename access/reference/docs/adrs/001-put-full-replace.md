# ADR 001: `PUT` full replace on reference items

## Status

Accepted — `reference` reference service only.

## Context

Organization **`_coding-standards/backend/api.md`** defaults to **no `PUT`** on resources unless an ADR documents an exception: partial updates should prefer **`PATCH`** with JSON Merge Patch semantics.

The `reference` service exists to demonstrate **full-document replace** semantics (audit fields recomputed, full body validation matching `ReplaceItem` schema) alongside **`PATCH`** for partial updates.

## Decision

Keep **`PUT /api/v1/items/{itemId}`** as **full replace** for this teaching service:

- Same resource shape as **`POST`** (`ReplaceItem` ≡ `CreateItem` in [`openapi.yaml`](../../openapi.yaml)).
- Optimistic concurrency via **`If-Match`** (weak ETag) unchanged.
- **`PATCH`** remains the preferred pattern for incremental changes in production-style services.

## Consequences

- Consumers must not assume other internal APIs expose `PUT` unless their OpenAPI lists it.
- New production services should default to **`PATCH`** only unless a product-specific ADR approves `PUT`.

## References

- [`openapi.yaml`](../../openapi.yaml) — `replaceItem` operation (`PUT`).
- Mongoose/repository implementation: [`src/modules/items/items.route.js`](../../src/modules/items/items.route.js).
