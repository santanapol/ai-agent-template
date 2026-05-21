# ADR 001: `PUT` full replace on crud-service items

## Status

Accepted — **`crud-service`** sample upstream only (under `services/.demo/`).

## Context

Organization **`_coding-standards/backend/api.md`** defaults to **no `PUT`** on resources unless an ADR documents an exception: partial updates should prefer **`PATCH`** with JSON Merge Patch semantics.

The **`crud-service`** package exists to demonstrate **full-document replace** semantics (audit fields recomputed, full body validation matching `ReplaceItem` schema) alongside **`PATCH`** for partial updates.

## Decision

Keep **`PUT /api/v1/items/{itemId}`** as **full replace** for this teaching service:

- Same resource shape as **`POST`** (`ReplaceItem` ≡ `CreateItem` in [`openapi.yaml`](../../openapi.yaml)).
- Optimistic concurrency via **`If-Match`** (weak ETag) unchanged.
- **`PATCH`** remains the preferred pattern for incremental changes in production-style services.

## Consequences

- Consumers must not assume other internal APIs expose `PUT` unless their OpenAPI lists it.
- New production services should default to **`PATCH`** only unless a product-specific ADR approves `PUT`.

## References

- [`../architecture.md`](../architecture.md) — package technical SoT
- [`openapi.yaml`](../../openapi.yaml) — `replaceItem` operation (`PUT`)
- [`../db/erd.md`](../db/erd.md) — `items` persistence + indexes
- [`../../src/modules/items/items.route.js`](../../src/modules/items/items.route.js) — routes (`PUT` + `PATCH`)
- [`_coding-standards/backend/api.md`](../../../../../../../_coding-standards/backend/api.md) — default no `PUT` rule
