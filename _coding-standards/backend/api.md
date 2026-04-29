# Backend API contract standard

API contract สำหรับ internal API หลัง gateway — request, response envelope, routing, validation, OpenAPI

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

Cross-ref: ใช้ "ดู ..." พร้อมชื่อหัวข้อ — ห้ามอ้าง line number

## Companion standards (split per concern)

| File | Scope |
| :--- | :--- |
| [`runtime.md`](./runtime.md) | Node, npm, env, graceful shutdown, project structure, package.json scripts |
| [`mongodb.md`](./mongodb.md) | driver, pool, transactions, health, multi-cluster |
| [`observability.md`](./observability.md) | pino, prom-client, redaction, correlation |
| [`supply-chain.md`](./supply-chain.md) | deps, lockfile, ESLint, Prettier, husky |
| [`tenant-audit.md`](./tenant-audit.md) | `cr_*` / `upd_*`, `ou_id` / `branch_id`, ETag + `If-Match` |
| [`ops.md`](./ops.md) | SLO, security SLA, license policy, coverage threshold, index rollout |
| [`codes.yaml`](./codes.yaml) | central code registry (HTTP ↔ code) |

## Table of contents
1. **Design & Contract (การออกแบบ API)**
   - [1.1 OpenAPI contract](#11-openapi-contract)
   - [1.2 Routing & HTTP Methods](#12-routing-http-methods)
   - [1.3 Query parameters](#13-query-parameters)
2. **Request Lifecycle (ขาเข้า)**
   - [2.1 Headers & Authentication](#21-headers-authentication)
   - [2.2 Middleware pipeline & Rate limiting](#22-middleware-pipeline-rate-limiting)
   - [2.3 Data Validation (Joi)](#23-data-validation-joi)
3. **Response & Error Handling (ขาออก)**
   - [3.1 API response envelope](#31-api-response-envelope)
   - [3.2 Response and error code catalog](#32-response-and-error-code-catalog)


---

## 1. Design & Contract

### 1.1 OpenAPI contract

#### Version and file location

| Rule | Value |
| :--- | :--- |
| **Spec version** | **OpenAPI 3.1.0** (JSON Schema 2020-12 compatibility, `null` type, `examples` array) |
| **Deviation** | 3.0.x ต้อง ADR (tooling constraint เฉพาะ) |
| **File location** | **`openapi.yaml`** ที่ **repo root** (ดู [Runtime → Directory tree](./runtime.md#34-directory-tree-reference)) |
| **Format** | YAML **เท่านั้น** (ห้าม JSON); 2-space indent; ไม่มี tab |
| **File size** | ไฟล์เดียว; split ผ่าน `$ref` relative path (`./components/schemas.yaml`) เมื่อ > 3,000 lines |

#### Top-level structure (required)

ทุก `openapi.yaml` **ต้อง** มี top-level fields ต่อไปนี้:

| Field | Required | Notes |
| :--- | :--- | :--- |
| **`openapi`** | yes | `"3.1.0"` |
| **`info.title`** | yes | service name (kebab-case); **match** `package.json` `name` |
| **`info.version`** | yes | SemVer **ตรง** `package.json` `version` (single SoT) |
| **`info.description`** | yes | 1–3 ย่อหน้า; ระบุ overrides ของ pagination default/limit (ถ้ามี) |
| **`servers`** | yes | **internal URLs เท่านั้น** (ไม่ใส่ public gateway URL; ป้องกัน exposure); รายการแรก + placeholder headers — ดู [`servers` block](#servers-block-required), [Header parameters (client import)](#header-parameters-client-import-required) |
| **`security`** | yes | default `[{ GatewaySecret: [] }]` (ดู [Security scheme](#security-scheme)) |
| **`tags`** | yes | resource-based (`users`, `orders`); match module name ใน `src/modules/<feature>/` |
| **`paths`** | yes | paths ทั้งหมด prefix `/api/v1/` (ยกเว้น `/healthz`, `/readyz`) |
| **`components.schemas`** | yes | shared envelopes + domain schemas |

#### Shared envelope schemas (required per service)

ทุก service **ต้อง** define `Envelope`, `Pagination`, `ErrorEnvelope`, `ValidationErrorItem` ใน `components.schemas` — field names **ตรง** [API response](#31-api-response-envelope); copy จาก [`examples/openapi-components.fragment.yaml`](./examples/openapi-components.fragment.yaml) แล้วปรับ `$ref` ตามโครงสร้าง service

- **Reason:** per-service copy (ไม่ central `$ref` ข้าม repo) — Spectral/codegen resolve ง่าย; sync เมื่อ std.min เปลี่ยน (จับด้วย Spectral `envelope-schema-present`)

#### Code registry linkage

| Rule | Value |
| :--- | :--- |
| **Response code** | ทุก response ที่เป็น std.min code (`SUCCESS`, `DATA_NOT_FOUND`, `INVALID_PARAM`, ...) **ต้อง** ระบุใน example; **ห้าม** ใช้ code ที่ไม่อยู่ใน [`codes.yaml`](./codes.yaml) |
| **Domain code** | ถ้า service เพิ่ม domain code (เช่น `USER_NOT_FOUND`) ต้อง register ใน `codes.yaml` **ก่อน** merge |
| **HTTP status per code** | ตรง [`codes.yaml`](./codes.yaml) + สรุป prose [HTTP status and `code` mapping](#http-status-and-code-mapping); drift → Spectral fail |
| **Response example** | ทุก operation **ต้อง** มี example ของ success + อย่างน้อย 1 error ที่โดดเด่น (`400`, `404`, `429`) |

#### Security scheme

- **`GatewaySecret`:** `apiKey` / header `x-gateway-secret` — นิยาม YAML อยู่ใน [`examples/openapi-components.fragment.yaml`](./examples/openapi-components.fragment.yaml) (`components.securitySchemes`)
- **Root `security`:** default `[{ GatewaySecret: [] }]`
- **Per-operation override** อนุญาตเฉพาะ `/healthz`, `/readyz`: `security: []` (exempt)
- **`/metrics`:** นอก `/api/v1/*` — ถ้าใส่ใน spec ต้อง `GatewaySecret` + tag `internal`
- **`GatewaySecret` documentation [Required]:** `components.securitySchemes.GatewaySecret` **ต้อง** มี **`description`** ที่บอกวิธีใส่ค่าใน client โดยใช้ **token ตัวยึดที่ไม่ใช่ความลับ** (แนะนำ `<GATEWAY_SECRET>`) — **ห้าม** ใส่ค่า secret จริงใน `description` / `example` ของ scheme (OpenAPI ไม่รองรับ `example` บน apiKey มาตรฐาน; อย่าซ้ำ header นี้เป็น `parameters` เพื่อหลบกฎ)

#### `servers` block [Required]

- **ลำดับและชื่อ:** object แรกของ `servers` **ต้อง** เป็น URL สำหรับการพัฒนาบนเครื่อง local (เช่น `http://127.0.0.1:{port}`) และ **`description` ต้องเป็นคำว่า `Local` แบบตรงตัว** (client เช่น Bruno ใช้เป็น label ของ default server)
- **`variables`:** ถ้าใช้ `{port}` (หรือ host แบบแปรผัน) **ต้อง** มี `default` ที่ตรงค่า default ของ service (`PORT` / runtime ดู [Runtime](./runtime.md)); **`variables.*.description`** ต้องอธิบายแหล่งที่มา (เช่น env `PORT`)
- ตัวอย่างเพิ่มเติมของ `servers:` (หลาย mesh) อยู่ใน [`examples/openapi-components.fragment.yaml`](./examples/openapi-components.fragment.yaml) ถ้ามี — รายการถัดจากแรกเป็น staging/internal อื่นได้ตามทีม
- **ห้าม** public gateway URL หรือ credentials ใน URL

#### Header parameters (client import) [Required]

สำหรับ header ที่ service รับเป็น **`components.parameters`** (หรือ inline `parameters`) และเป็นบริบทจาก gateway (`x-user-ou`, `x-user-branch`, `x-user-id`, `x-user-role`, `If-Match`, `x-request-id`, ฯลฯ):

- **ลำดับใน `parameters` [Required]:** ถ้า operation ประกาศ header ในชุด [Canonical trusted header order](#canonical-trusted-header-order-openapi-docs-http-examples-required) ต้องเรียง **จากบนลงล่าง** ตามลำดับนั้น (เว้นตัวที่ operation ไม่ใช้ — **ห้าม** สลับลำดับของตัวที่เหลือ)
- **ทุก parameter ที่ `required: true`** **ต้อง** มี **`example`** เป็นข้อความ **placeholder ชัดเจน** รูปแบบ **มุมเล็บ** (`<x-user-id>`, `<x-user-ou>`, …) — เพื่อให้ import ไป client (Bruno, Postman, ฯลฯ) ได้ key + ตัวอย่างค่าที่แก้ทับใน env ได้ทันที **โดยไม่ใส่ค่าจริงใน repo**
- **Parameter ที่ `required: false`:** **แนะนำ** มี `example` placeholder เช่นกัน; ถ้าไม่ใส่ต้องมี **`description`** ว่าเมื่อไหร่ถึงส่ง
- **ห้าม** ใส่ค่า identity / token / gateway secret จริงใน `example` / `examples` ของ header
- **ห้าม** ประกาศ `parameters` ชื่อ **`x-gateway-secret`** ซ้ำกับ `GatewaySecret` ใน `security` (ผิดกฎ parameter ซ้ำของ OpenAPI และเสี่ยง drift)

#### `operationId`, `tags`, `paths`

| Rule | Value |
| :--- | :--- |
| **`operationId`** | **camelCase**; globally unique ในไฟล์; pattern: `<action><Resource>` เช่น `listUsers`, `createOrder`, `verifySlip` |
| **`tags`** | resource-based, lowercase plural (`users`, `orders`); 1 operation = 1 primary tag |
| **`summary`** | **[Required]** ชื่อสั้นสำหรับรายการใน API client (Bruno, Postman, …); รายละเอียดใส่ใน `description` — ตาราง canonical ดู [Operation summary (client list titles)](#operation-summary-client-list-titles-required) |
| **Path param syntax** | **`{userId}`** (OpenAPI convention); Express runtime map เป็น `:userId` (validator + controller responsibility) |
| **Path param name** | camelCase; match Joi validator `params` schema |
| **Response codes per op** | ใส่อย่างน้อย success + ทุก error ที่ route ตอบได้ (`400`, `404`, `429`, `500` เป็นต้น) |

#### Operation summary (client list titles) [Required]

- **บทบาท:** `summary` คือชื่อ request ที่ client แสดงใน sidebar — **ต้องสั้น**; ห้ามใช้เป็นที่ยาวประโยคเดียวกับ `description`
- **Endpoint อื่น:** ใช้หลัก **กริยาสั้น + วัตถุ** (เช่น `List reports`, `Get report`) ให้สอดคล้องกันในทีม
- **เมื่อ operation ต่อไปนี้มีใน spec** — ค่า `summary` **ต้องตรงตัว**ตามตาราง (ยกเว้นต้อง **ADR**):

| Operation | `summary` (ตัวอักษรตรงตัว) |
| :--- | :--- |
| `GET /healthz` | `Liveness` |
| `GET /readyz` | `Readiness` |
| `POST /auth/login` | `Login` |
| `POST /auth/refresh` | `Refresh token` |
| `POST /auth/logout` | `Logout` |

#### `x-` extensions catalog

std.min-wide extensions (ถ้า service ใช้ extension อื่นต้อง prefix `x-<team>-` และประกาศใน ADR):

| Extension | Scope | Value | Section |
| :--- | :--- | :--- | :--- |
| **`x-ratelimit`** | operation | `{ windowMs: <int ms>, max: <int>, reason?: <string> }` | [Rate limiting → Per-route override](#per-route-override) |
| **`x-user-role-enum`** | path item / operation | `['admin', 'user', 'viewer']` — optional, service ตัวใดไม่ lock enum ให้ **ละ extension นี้** (std.min ถือ `x-user-role` เป็น opaque string) | [Request headers → `x-user-*`](#gateway-to-service-x-user-) |
| **`x-gateway-exempt`** | operation | `true` (default false) | exempt จาก gateway secret — เฉพาะ `/healthz`, `/readyz` |
| **`x-idempotent`** | operation | `true \| false` | [Routing → Idempotency](#idempotency-timeouts-tracing-required) |
| **`x-deprecated-sunset`** | operation | ISO date (UTC `Z`) | deprecation (ดู [SemVer, deprecation](#semver-infoversion-and-deprecation)) |

#### Drift prevention (CI gate)

| Tool | Role | Enforcement |
| :--- | :--- | :--- |
| **`@stoplight/spectral-cli`** | lint + custom ruleset | **CI gate** — block merge on `error` severity |
| **Ruleset location** | `_coding-standards/spectral/org-api.yaml` (shared) | per-service `.spectral.yaml` extends shared + service-specific |
| **Trigger** | CI job `spec:lint` (PR + main) + pre-commit (warn only) | lint-staged: `spectral lint openapi.yaml --ruleset .spectral.yaml` |

**Required Spectral rules (std.min baseline):**

| Rule | Severity | Check |
| :--- | :--- | :--- |
| `openapi-version` | error | `openapi` === `"3.1.0"` |
| `info-version-matches-package` | error | `info.version` === `package.json.version` |
| `envelope-schema-present` | error | `components.schemas.Envelope` + `ErrorEnvelope` + `Pagination` + `ValidationErrorItem` มีครบ |
| `security-default-gateway-secret` | error | global `security` = `[{ GatewaySecret: [] }]` |
| `response-code-in-registry` | error | response `code` field ใน example อยู่ใน `codes.yaml` |
| `operation-operationid-camelcase` | error | `operationId` matches `/^[a-z][a-zA-Z0-9]*$/` |
| `operation-has-tags` | error | ทุก operation มี ≥ 1 tag |
| `paths-lowercase-kebab` | error | paths lowercase kebab (ยกเว้น `{param}`) |
| `no-public-servers` | error | `servers.url` ไม่ match public gateway pattern |
| `operation-has-error-response` | warn | operation มี response 400/500 อย่างน้อย 1 |
| `org-trusted-header-parameter-order` | error | ลำดับ `parameters` สำหรับ header ชุด gateway (`x-user-ou` → … → `x-request-id`) ตาม [Canonical trusted header order](#canonical-trusted-header-order-openapi-docs-http-examples-required) — ใช้ฟังก์ชันใน [`../spectral/functions/trustedHeaderParameterOrder.js`](../spectral/functions/trustedHeaderParameterOrder.js) |

#### SemVer, `info.version`, and deprecation

| Rule | Value |
| :--- | :--- |
| **`info.version` source** | **ตรง** `package.json` `version` (enforced ด้วย Spectral) |
| **SemVer bump** | ตาม [Supply chain → SemVer bump policy](./supply-chain.md#13-semver-bump-policy) — รายละเอียด major/minor/patch อยู่ที่นั่น |
| **Deprecation workflow** | `deprecated: true` + `x-deprecated-sunset` (UTC `Z`) + response headers `Deprecation` / `Sunset` ใน implementation |
| **Sunset minimum** | **90 วัน** จากวัน mark deprecated (internal); public API ต้อง ADR |

ตัวอย่าง path ที่ deprecated (YAML comment): [`examples/openapi-components.fragment.yaml`](./examples/openapi-components.fragment.yaml) ท้ายไฟล์

#### Forbidden

- OpenAPI 2.0 / Swagger (unsupported)
- JSON format ของ spec (YAML only)
- Public gateway URL ใน `servers`
- `servers` รายการแรกไม่ใช่ entry สำหรับ local dev หรือ **`description` แรกไม่ใช่คำว่า `Local` แบบตรงตัว** (ยกเว้นต้อง ADR)
- มี **`GET /healthz`** ใน spec แต่ `summary` **ไม่ใช่** `Liveness` ตาม [Operation summary](#operation-summary-client-list-titles-required) (ยกเว้นต้อง ADR)
- มี **`GET /readyz`** ใน spec แต่ `summary` **ไม่ใช่** `Readiness` (ยกเว้นต้อง ADR)
- มี **`POST /auth/login`**, **`POST /auth/refresh`**, หรือ **`POST /auth/logout`** ใน spec แต่ `summary` **ไม่ตรง** `Login` / `Refresh token` / `Logout` ตามลำดับ (ยกเว้นต้อง ADR)
- `components.securitySchemes.GatewaySecret` **ไม่มี** `description` ตาม [Security scheme](#security-scheme) (ยกเว้นต้อง ADR)
- `components.parameters` สำหรับ gateway context header ที่ **`required: true`** แต่**ไม่มี** `example` placeholder แบบมุมเล็บ (ยกเว้นต้อง ADR)
- ใส่ค่าความลับจริง (gateway secret, access token, …) ใน `example` / `examples` / `description` ของ header หรือ security scheme
- Response code ที่ไม่ได้ register ใน `codes.yaml`
- `operationId` ซ้ำ หรือ snake_case / kebab-case
- ไม่ใส่ `tags` ใน operation
- ส่ง spec ที่ fail Spectral `error`-severity rules เข้า main branch
- `info.version` ต่างจาก `package.json` `version`
- ลบ endpoint / field โดยไม่ bump major + ไม่มี deprecation period

### 1.2 Routing & HTTP Methods

#### Resource naming

| Rule | Value |
| :--- | :--- |
| Resource noun | **plural** (`/users`, `/bank-accounts`, `/slips`) |
| Path case | **kebab-case** (no camelCase, no snake_case) |
| Allowed chars | `[a-z0-9-]` + `/` + `:param` placeholder |
| Path param | **`:camelCase`** เช่น `/users/:userId` (path use kebab, param ใช้ camel ให้ตรง JS var) |
| Query param | **camelCase** (match response field) |
| Versioning | **บังคับ** prefix **`/api/v1/...`**; major bump = new prefix (v2) |

#### Path rules

| Rule | Value |
| :--- | :--- |
| **Trailing slash** | **ไม่มี trailing slash** (canonical `/api/v1/users`); ส่ง `/users/` → **`301 Moved Permanently`** ไป canonical (Express `strict: false` + redirect middleware) |
| **Case sensitivity** | lowercase **เท่านั้น**; uppercase path → **404 `DATA_NOT_FOUND`** (ไม่ redirect) |
| **Nesting depth** | **≤ 2 ระดับ** จาก resource หลัก (`/users/:id/addresses` OK; `/users/:id/addresses/:aid/notes` **ต้อง ADR**) |
| **Custom action** | verb ต่อท้าย resource **kebab-case** เช่น `POST /slips/:id/verify`, `POST /orders/:id/cancel`; ใช้เมื่อไม่ fit CRUD |
| **Query usage** | **filter / sort / pagination เท่านั้น**; ห้ามใส่ identity (`userId`) ใน query ถ้ามีใน path |

#### HTTP method policy

| Method | Purpose | Body | Idempotent | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`GET`** | Read (list / detail) | **forbidden** | yes | list = collection path, detail = `/:id` |
| **`POST`** | Create **หรือ** custom action | required | no | create → **`201 Created`** + `Location` header; action → **`200 OK`** |
| **`PATCH`** | **Partial update (default)** | required | yes (idempotent target) | ใช้ **JSON Merge Patch** (ดู [PATCH body](#patch-body-json-merge-patch-rfc-7396)) |
| **`PUT`** | Full replace | required | yes | **forbidden by default**; ถ้าต้องใช้ (เช่น upsert pattern) ต้องมี **ADR** ใน OpenAPI |
| **`DELETE`** | Delete (soft หรือ hard) | forbidden | yes | soft delete preferred; 204 (no body) หรือ 200 (envelope) ตาม service contract |
| **`HEAD`** | Metadata probe | — | yes | optional; auto-generate จาก `GET` ถ้า enable |
| **`OPTIONS`** | Preflight / discovery | — | yes | handled by `cors` / framework; **ห้าม custom route** |

- **Method ที่ไม่อยู่ในตาราง → `405 Method Not Allowed`** พร้อม `Allow` header และ envelope `code: "METHOD_NOT_ALLOWED"`

#### Idempotency, timeouts, tracing [Required]

- **Idempotency:** `GET`/`HEAD`/`PUT`/`PATCH`/`DELETE` ต้อง idempotent บน resource; `POST` ไม่ idempotent ยกเว้น OpenAPI `x-idempotent: true` หรือ **`Idempotency-Key`** (UUID v4) + cache 24 ชม. + **ADR**
- **Timeouts:** `server.requestTimeout` = **`REQUEST_TIMEOUT_MS`** (default **30000**); เกิน → **503** `SERVICE_UNAVAILABLE`. Mongo/HTTP outbound ≤ `REQUEST_TIMEOUT_MS − 2000` ms (ดู [Runtime → Environment](./runtime.md#1-runtime-environment))
- **Tracing:** `x-request-id` = correlation หลัก; forward เดิมไป downstream; W3C `traceparent` **[Recommended]** ถ้า infra รองรับ
- **Resilience:** external ≥ 3 ตัว → circuit breaker (**[Recommended]** e.g. `opossum`); retry downstream เฉพาะ idempotent op — backoff สั้น ๆ + log `warn`/`error`

#### `PATCH` body: JSON Merge Patch (RFC 7396)

- **Content-Type:** **`application/merge-patch+json`** preferred; อนุโลม `application/json` สำหรับ internal API (ถ้ารับ `application/json` ต้องประกาศใน OpenAPI)
- **Semantics (RFC 7396):**
  - field ที่ส่ง → **แทนค่า**
  - field ที่ **ไม่ส่ง** → **คงเดิม** (no-op)
  - field ค่า **`null`** → **ลบฟิลด์** (unset)
- **ห้าม:** JSON Patch (RFC 6902, `[{ op, path, value }]`) — verbose, ยาก validate; ถ้าต้องใช้ต้อง ADR
- **Validate:** Joi schema ต้องรองรับ partial (`.min(1)` + `.unknown(false)`); ว่าง → **`400 INVALID_PARAM`** (sub-code `REQUIRED`)
- **Example:**

```http
PATCH /api/v1/users/123
Content-Type: application/merge-patch+json

{
  "displayName": "New Name",
  "phone": null
}
```

> ผลลัพธ์ `displayName` ถูกอัปเดต; `phone` ถูกลบ; field อื่น ๆ คงเดิม

#### Health and readiness endpoints

| Path | Purpose | Auth | Rate limit | Log | Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`GET /healthz`** | **Liveness** — process alive | **exempt** `x-gateway-secret` | exempt | exempt | orchestrator (K8s livenessProbe) |
| **`GET /readyz`** | **Readiness** — deps พร้อมรับ traffic (Mongo ping ฯลฯ) | **exempt** `x-gateway-secret` | exempt | exempt | orchestrator (K8s readinessProbe) |

- **`GET /health` ห้ามใช้** (deprecated; ใช้ `/healthz` + `/readyz` แทนตาม K8s convention)
- **Path prefix:** ไม่ใส่ `/api/v1/` — health endpoints อยู่ **root level** (`/healthz`, `/readyz`) เพื่อให้ probe/ingress ชี้ได้ตรง ไม่ผูก version
- **Response body (`/healthz`):** minimal — `status`, `timestamp`, `uptime`; **ห้าม** secret / credential / connection string / build hash ที่ sensitive
- **Response body (`/readyz`):** `status` + `dependencies[]` (Mongo ping result ฯลฯ); **503 `SERVICE_UNAVAILABLE`** เมื่อ dep fail (ดู [MongoDB → Health check integration](./mongodb.md#41-health-check-integration))

ตัวอย่าง envelope `/healthz` (healthy) และ `/readyz` (degraded): [`examples/health-envelope-examples.json`](./examples/health-envelope-examples.json)

#### Forbidden patterns

- verb ใน path (`/getUsers`, `/createOrder`) — ใช้ method แทน
- file extension ใน path (`/users.json`) — ใช้ `Accept` header
- query param แทน path param สำหรับ identity (`/users?id=123` → ใช้ `/users/:id`)
- mix case (`/Users`, `/userProfiles`) — lowercase kebab-case เท่านั้น
- trailing slash ใน canonical (`/users/`) — 301 redirect
- health endpoint ใต้ `/api/v1/*` — ต้อง root level
- expose audit fields (`cr_*`, `upd_*`, `ou_id`, `branch_id`) ใน response หรือรับใน request body (ดู [Tenant + audit](./tenant-audit.md))

---

### 1.3 Query parameters

#### Case convention and encoding

| Rule | Value |
| :--- | :--- |
| **Key case** | **camelCase** (match response field; cross-ref [Routing → Resource naming](#resource-naming)) |
| **URL encoding** | **required** ตาม RFC 3986; special chars (`&`, `=`, `#`, space, non-ASCII) ต้อง percent-encode |
| **Charset** | UTF-8 |
| **Key reserved** | `page`, `limit`, `sort`, `q` (search) — service ห้ามใช้ชื่อเหล่านี้สำหรับ filter |

#### Pagination

| Field | Value |
| :--- | :--- |
| **`page`** | integer, **1-indexed**, min `1`, **std.min default `1`** |
| **`limit`** | integer, min `1`, **std.min default `20`**, **max `100`** |
| **Override** | service อาจ override `default`/`max` ผ่าน **OpenAPI** (เช่น default 10 สำหรับ legacy) — ต้องประกาศใน `info.description` |
| **Invalid value** | **strict 400 `INVALID_PARAM`** เสมอ (ไม่ silent clamp); ครอบคลุม:<br>• non-integer (`page=abc`)<br>• out-of-range (`page=0`, `page=-1`, `limit=0`, `limit=101`)<br>• float (`limit=1.5`)<br>• overflow (`page=9999999999999`) |
| **Response** | ดู [API response → `pagination`](#pagination-list) (`total`, `totalPages` formula) |
| **Deep page risk** | `page > 1000` บน collection ใหญ่ → Mongo `skip` O(n); เตือน client ใช้ filter แทน (cursor pagination **ต้อง ADR**) |

#### Sort

| Rule | Value |
| :--- | :--- |
| **Param** | `sort` (reserved) |
| **Syntax** | **`sort=<field>`** = ascending; **`sort=-<field>`** = descending (prefix `-`) |
| **Multi-field** | comma-separated, priority ซ้าย → ขวา เช่น **`sort=-createdAt,name`** |
| **Max fields** | **3** (ป้องกัน index blow-up); เกิน → 400 `INVALID_PARAM` |
| **Whitelist** | service **ต้อง** ประกาศ allowed fields ใน **OpenAPI** (`enum`); field นอก list → **400 `INVALID_PARAM`** (ไม่ ignore silently) |
| **Default** | service กำหนดใน OpenAPI (แนะนำ **`-createdAt`** หรือ `-_id`); ถ้าไม่ระบุ → ใช้ default จาก OpenAPI |
| **Security** | ห้ามใช้ field ที่เป็น internal (`__proto__`, `_id` เว้นแต่ expose เป็น `id`); validator ต้องเทียบกับ whitelist **ก่อน** forward ไป Mongo |

#### Filter

| Rule | Value |
| :--- | :--- |
| **Key** | **camelCase** + optional **operator suffix** (ดู [Operator suffix](#operator-suffix-convention-camelcase)) |
| **Allowed fields** | whitelist ใน **OpenAPI**; field นอก list → **400 `INVALID_PARAM`** (sub-code `UNKNOWN_FIELD`) |
| **Multi-value same key** | **OR semantics** (SQL `IN`) เช่น `?status=active&status=pending` → `status IN ['active','pending']` |
| **Multi-key** | **AND semantics** ข้าม key เช่น `?status=active&type=gold` → `status = active AND type = gold` |
| **`q` (search)** | reserved สำหรับ full-text; **std.min อนุญาตเฉพาะ eq semantics**; fuzzy/full-text search ต้อง ADR |
| **Case sensitivity** | **case-sensitive** โดย default; `nameContains=Foo` จะไม่ match `foo` — service ต้องประกาศใน OpenAPI ถ้าต้องการ case-insensitive |

##### Operator suffix convention (camelCase)

| Suffix | Meaning | Example | Mongo equivalent |
| :--- | :--- | :--- | :--- |
| _(none)_ | equal | `?status=active` | `{ status: 'active' }` |
| **`Ne`** | not equal | `?statusNe=closed` | `{ status: { $ne: 'closed' } }` |
| **`Gt`** | greater than | `?priceGt=100` | `{ price: { $gt: 100 } }` |
| **`Gte`** | greater or equal | `?priceGte=100` | `{ price: { $gte: 100 } }` |
| **`Lt`** | less than | `?priceLt=1000` | `{ price: { $lt: 1000 } }` |
| **`Lte`** | less or equal | `?priceLte=1000` | `{ price: { $lte: 1000 } }` |
| **`In`** | in list (comma-separated) | `?statusIn=active,pending` | `{ status: { $in: [...] } }` — alt ของ repeat key |
| **`Contains`** | substring (case-sensitive) | `?nameContains=foo` | `{ name: { $regex: 'foo' } }` (escape regex meta) |
| **`StartsWith`** | prefix | `?emailStartsWith=admin` | `{ email: { $regex: '^admin' } }` |

- **Operator stacking:** ส่งพร้อมกันได้ (`?priceGte=100&priceLte=1000` → range); ส่งซ้ำ operator เดียวกัน → 400 `INVALID_PARAM`
- **Regex safety:** `Contains` / `StartsWith` → **ต้อง escape** regex meta chars ก่อนส่ง Mongo; max value length **100 chars**; ป้องกัน ReDoS
- **Numeric/boolean coercion:** Joi validator **ต้องแปลง** string จาก URL เป็น type ที่ถูกต้องก่อนส่ง service layer

#### Array values

| Rule | Value |
| :--- | :--- |
| **Syntax** | **repeat key** (`?tag=a&tag=b`) **หรือ** `In` suffix (`?tagIn=a,b`) |
| **Forbidden** | comma ใน value เดียว (`?tag=a,b` โดย key ไม่มี `In` suffix), `[]` ใน key name (`?tag[]=a`) |
| **Max length** | **50 elements** ต่อ key (ป้องกัน memory/regex abuse); เกิน → 400 `INVALID_PARAM` |
| **Deduplication** | service responsibility (แนะนำ `Array.from(new Set(values))` ใน validator) |

#### Scalar value format

| Type | Format | Example | Invalid |
| :--- | :--- | :--- | :--- |
| **String** | UTF-8, URL-encoded; max **500 chars** ต่อ value | `?name=Meena` | value > 500 → 400 |
| **Number** | decimal integer หรือ float (`.` decimal); **no thousand sep** | `?price=99.50` | `?price=99,50` → 400 |
| **Boolean** | **`true`** หรือ **`false`** (lowercase) **เท่านั้น** | `?verified=true` | `?verified=1`, `?verified=yes` → 400 |
| **Null** | **ไม่รองรับ** — omit key แทน (ดู [Null / empty / omit](#null-empty-omit)) | — | `?foo=null` = literal string `"null"` → 400 ถ้า field ไม่ใช่ string |

- **Coercion ownership:** validator layer (Joi) — ใช้ `Joi.number()` / `Joi.boolean()` กับ `convert: true` (default) เพื่อ coerce string → type

#### Date and time

| Rule | Value |
| :--- | :--- |
| **Format (default)** | **ISO-8601 datetime UTC** ลงท้าย **`Z`** เช่น `2026-04-17T03:31:51.000Z` |
| **Date-only** | `YYYY-MM-DD` (เช่น `2026-04-17`) → **ต้องประกาศ** ใน OpenAPI; ถ้าไม่ประกาศ → 400 `INVALID_PARAM` |
| **Timezone offset** | **forbidden** (`+07:00`, `-05:00`) — ทุก query datetime ต้อง UTC `Z` (ดู [Runtime → Environment](./runtime.md#1-runtime-environment) `TZ=UTC`) |
| **Range convention** | **`<field>From`** / **`<field>To`** pair เช่น `?createdAtFrom=2026-01-01T00:00:00.000Z&createdAtTo=2026-01-31T23:59:59.999Z` |
| **Range semantics** | `From` = inclusive (`$gte`); `To` = inclusive (`$lte`); ถ้า `From > To` → 400 `INVALID_PARAM` |

#### Null / empty / omit

| Input | Meaning | Behavior |
| :--- | :--- | :--- |
| Key omitted | "ไม่ filter / ใช้ default" | OK (canonical) |
| **`?foo=`** (empty string) | — | **400 `INVALID_PARAM`** (sub-code `REQUIRED`) |
| **`?foo=null`** | literal string `"null"` | 400 ถ้า field ไม่ใช่ string; ถ้าเป็น string → valid แต่ไม่แนะนำ |
| `?foo=undefined` | literal string `"undefined"` | เหมือนข้างบน — discourage |

- **Rule:** client ต้อง **omit** key ถ้าไม่มีค่า; ห้ามส่ง key พร้อม value ว่าง

#### URL length and heavy filter

| Rule | Value |
| :--- | :--- |
| **URL length ceiling** | **8KB** (Node default; cross-ref [Request limits](#request-limits)); ห้ามบังคับ client ให้น้อยกว่านี้ |
| **Heavy-filter threshold** | ถ้า query ทำให้ URL **> 2KB** **หรือ** filter field **≥ 10 keys** → ต้องใช้ **`POST /<resource>/search`** + JSON body |
| **Search endpoint contract** | body schema = filter object; response envelope = list + pagination เหมือน GET; **ห้าม** สร้าง action อื่นใน search endpoint |
| **GET vs POST search** | GET idempotent + cacheable; POST search ไม่ cache — service กำหนดตามขนาด filter |

#### Example

```http
GET /api/v1/orders?status=active&status=pending&priceGte=100&priceLte=1000&createdAtFrom=2026-01-01T00:00:00.000Z&sort=-createdAt,amount&page=2&limit=50 HTTP/1.1
Host: api.internal
x-gateway-secret: ****
x-user-ou: <x-user-ou>
x-user-branch: <x-user-branch>
x-user-id: <x-user-id>
x-user-role: <x-user-role>
Accept: application/json
```

**แปลเป็น filter:**

```js
{
  status: { $in: ['active', 'pending'] },
  price: { $gte: 100, $lte: 1000 },
  createdAt: { $gte: new Date('2026-01-01T00:00:00.000Z') }
}
// sort: { createdAt: -1, amount: 1 }
// skip: 50, limit: 50
```

#### Forbidden

- สร้าง reserved key (`page`, `limit`, `sort`, `q`) เป็น filter field
- ส่ง timezone offset (`2026-04-17T00:00:00+07:00`) ใน query — ต้อง UTC `Z` เท่านั้น
- ใช้ `sort` field นอก whitelist (silent ignore ไม่ได้ — **400 required**)
- ส่ง operator ซ้ำกัน (`?priceGte=100&priceGte=200`) — ambiguous
- ส่ง array > 50 elements ต่อ key
- ใช้ query สำหรับ identity ที่มี path param แล้ว (`/users/:id?userId=...`)
- Regex input ตรง ๆ ใน `Contains` โดยไม่ escape meta chars

---

---

## 2. Request Lifecycle

### 2.1 Headers & Authentication

#### Scope and authentication

Traffic จาก **gateway เท่านั้น** (ไม่ public ตรง endpoint); network ตาม infra (private, allowlist, mTLS)

**นโยบายนอกเหนือจาก std.min:** ระบุใน **OpenAPI + ADR**

#### Caller authentication (`x-gateway-secret`)

| Item | Rule |
| :--- | :--- |
| Header | **`x-gateway-secret`** เท่านั้น (ไม่ใช้ **Bearer / JWT / Authorization**) |
| ENV | **`GATEWAY_SHARED_SECRET`** (legacy **alias ที่ config layer เท่านั้น**) |
| Compare | **constant-time** |
| Canonical | **lowercase** normalize ใน middleware |
| Duplicate keys | gateway ส่งค่าเดียว; บริการอ่านค่าแรก; ค่าหลายตัวไม่ตรงกัน **`INVALID_GATEWAY_SECRET`** |

#### User context (`x-user-*`)

- **Source:** gateway แนบ **`x-user-*`** หลังผ่าน upstream auth
- **Trust order:** ตรวจ **`x-gateway-secret`** ก่อน แล้วค่อยเชื่อ **`x-user-*`**
- **Default (business routes หลัง gateway):** บังคับ **พร้อมกัน** — **`x-user-ou`**, **`x-user-branch`**, **`x-user-id`** (รูปแบบต้องสอดคล้อง [ObjectId profile](./tenant-audit.md#22-header-id-format-mongodb-objectid-profile) เมื่อ persist เป็น `ObjectId`) ยกเว้นเฉพาะเมื่อ **OpenAPI หรือ ADR ระบุชัด** ว่า path/operation นั้น**ลดหรืองด** header บางตัว (เช่น บริการเฉพาะรายที่ยังไม่ต้องการ `x-user-id` ต้องประกาศ explicit); ลำดับการเขียนใน spec/ตัวอย่าง — [Canonical trusted header order](#canonical-trusted-header-order-openapi-docs-http-examples-required)
- **ยกเว้น path มาตรฐาน (ไม่ user-facing):** **`/healthz`**, **`/readyz`**, **`/metrics`** — ไม่บังคับ **`x-user-*`**; **`/metrics`** ยังบังคับ **`x-gateway-secret`** ตาม [Exempt paths](#exempt-paths-mesh-internal)
- **Server-side derivation:** `ou_id` / `branch_id` / audit fields จาก `x-user-*` ดู [Tenant + audit](./tenant-audit.md)

#### Authentication error mapping

| HTTP | `code` | Scenario |
| :--- | :--- | :--- |
| 401 | **`MISSING_GATEWAY_SECRET`** | ไม่มี `x-gateway-secret` เมื่อ route บังคับ |
| 401 | **`INVALID_GATEWAY_SECRET`** | ว่างหลัง trim / `""` / ค่าผิด |
| 403 | **`MISSING_GATEWAY_USER_CONTEXT`** | secret OK แต่ `x-user-*` ไม่ครบ / ว่างหลัง trim |
| 403 | **`INVALID_USER_CONTEXT`** (ถ้าลงทะเบียนใน `codes.yaml`) | secret OK และ header ครบ แต่ค่าไม่ valid ตาม policy (เช่น ไม่ใช่ ObjectId hex 24 เมื่อบริการบังคับ) — ทางเลือกเพื่อแยกจาก "ขาด header" |

- **Enumeration (401):** ใช้ `message` เดียวกันสำหรับ **`MISSING_GATEWAY_SECRET`** / **`INVALID_GATEWAY_SECRET`** เพื่อกัน caller enumerate เหตุ; **log ภายใน** แยกเหตุ (observability / ลด leak)
- **Contract ผิด:** ไม่ retry จนกว่า gateway + header mapping ใน **OpenAPI** ถูกแก้
- **ประกาศ `code`** ที่คืน (gateway + ที่ใช้จริง) ใน enum/schema error

---

#### Request headers

#### Header case convention

- HTTP header names เป็น **case-insensitive** (RFC 9110); Node/Express normalize `req.headers` เป็น **lowercase** เสมอ
- **Code:** อ้างถึง header ด้วย **lowercase key** เท่านั้น — `req.headers['content-type']`, `req.headers['x-user-id']`; **ห้าม** `req.headers['Content-Type']` (คืน `undefined`)
- **Docs / OpenAPI:** ใช้ canonical form (`Content-Type`, `Origin`, `Accept`) เพื่ออ่านง่าย; client ส่ง case ใดก็ได้

#### Client to API (internal profile, behind gateway)

**`Required` enum:**

- **`required`** = บังคับทุก route
- **`conditional`** = บังคับตามเงื่อนไข (OpenAPI / policy / body)
- **`optional`** = ไม่บังคับ (บริการเลือกบังคับผ่าน OpenAPI ได้)
- **`auto`** = สร้างให้ที่ edge / middleware ถ้าไม่มี

| Header | Required | Role / error mapping |
| :--- | :--- | :--- |
| **`x-gateway-secret`** | **required** บน business API หลัง gateway (ยกเว้น path ที่ [Exempt paths](#exempt-paths-mesh-internal) ระบุ) | caller; lowercase; ไม่มี key **401** **`MISSING_GATEWAY_SECRET`**; trim ว่าง / ค่าผิด **401** **`INVALID_GATEWAY_SECRET`**; ห้าม log เต็ม |
| **`Content-Type`** | **conditional** (บังคับเมื่อมี request body) | `application/json` + charset ตาม OpenAPI; ไม่มี **415** **`MISSING_CONTENT_TYPE`**; ชนิดที่ไม่รองรับ **415** **`UNSUPPORTED_MEDIA_TYPE`** (RFC 9110 §15.5.16); body JSON เพี้ยน **400** **`INVALID_PARAM`** |
| **`x-request-id`** | **auto** | correlation; รับ case ใดก็ได้; emit lowercase; ดู [Observability → Correlation](./observability.md#31-request-correlation) |
| **`Origin`** | **conditional** (ตาม OpenAPI / policy; default optional) | ไม่ส่งเมื่อบังคับ **400** **`MISSING_ORIGIN`** (service ที่ใช้ Origin เป็น CSRF mitigation อาจ override **403** ผ่าน **ADR**) |
| **`Accept`** | **optional** | ไม่ส่ง = default `application/json`; `application/json` หรือ `*/*` OK; ชนิดอื่น **400** **`INVALID_HEADER`** (ดู [Accept handling](#accept-handling)) |
| **`If-Match`** | **conditional** (บังคับบน `PATCH` / `PUT` / `DELETE` resource ที่มี audit fields) | ETag token จาก GET/POST/PATCH response; ขาด **428** **`PRECONDITION_REQUIRED`**; ค่าไม่ตรง ETag ปัจจุบัน **412** **`VERSION_CONFLICT`** (ดู [Tenant + audit](./tenant-audit.md)); ใน OpenAPI/ตัวอย่าง HTTP ร่วมกับ `x-gateway-secret` + `x-user-*` ต้องอยู่ **ท้ายบล็อก** ตาม [Canonical trusted header order](#canonical-trusted-header-order-openapi-docs-http-examples-required) |

#### Accept handling

| Caller ส่ง | Action |
| :--- | :--- |
| ไม่ส่ง header | default `application/json` (ไม่ reject) |
| `application/json` / `application/json; q=1.0` / `*/*` | OK |
| `application/xml`, `text/html`, อื่นๆ | **400** **`INVALID_HEADER`** |

**หมายเหตุ:** std.min เลือก **400 `INVALID_HEADER`** (ไม่ใช่ **406**) เพื่อลด code surface (ไม่ต้องมี `NOT_ACCEPTABLE` อีกตัว) และเพราะ internal caller รู้อยู่แล้วว่า service คืน JSON เท่านั้น — service ที่ต้องคืน **406** ต้องประกาศ **OpenAPI + ADR**

#### CORS policy [Required]

std.min internal API = **ไม่เปิด CORS default** — traffic ทั้งหมดมาจาก gateway + mesh เดียวกัน (same-origin effectively)

| Scenario | Rule |
| :--- | :--- |
| **Default** | ไม่ mount `cors` middleware + **ไม่** set `Access-Control-*` headers → preflight ที่มาจาก browser จะ fail ที่ CORS policy เอง (ไม่ต้อง 405 เอง) |
| **Browser caller (rare; internal admin UI)** | **[ADR-gated]** — mount `cors` ก่อน `helmet`, allowlist **origins ≤ 5 รายการ**, `credentials: false`, `maxAge ≥ 600` |
| **`OPTIONS` preflight** | จัดการโดย `cors` package เท่านั้นเมื่อ ADR ประกาศ; **ห้าม** เขียน custom `app.options()` handler |
| **`Access-Control-Allow-Origin: *`** | **[Forbidden]** — ต้องระบุ origin รายตัว (audit + CSRF posture) |

#### `x-request-id`

- ไม่ส่ง: **สร้างใหม่** (UUID v4) ที่ edge หรือ middleware แรก
- ใช้ **`x-request-id` lowercase** ให้สอดคล้อง gateway
- โยง **log context** ทุก request (`logger.child({ requestId })`) และใส่ **`requestId`** ใน envelope เมื่อ error
- **Downstream:** forward `x-request-id` เดิมเมื่อเรียกบริการอื่น (**ห้ามสร้างใหม่**)
- **Echo:** ทุก response ต้องมี response header `x-request-id` กลับไปหา caller

#### Gateway to service (`x-user-*`)

Gateway ใส่ **`x-gateway-secret`** + **`x-user-*`** หลัง upstream; บริการตรวจ secret ก่อน (constant-time; ห้าม secret ใน query) แล้วค่อยเชื่อ **`x-user-*`**; ห้ามเชื่อจาก caller นอก trust boundary

| Header | Required | Role |
| :--- | :--- | :--- |
| **`x-user-ou`** | **default บังคับ** บน business API (ยกเว้น OpenAPI/ADR/Exempt ระบุ) | OU — ถ้า persist `ou_id` เป็น BSON `ObjectId` ต้องเป็น **hex 24** (ดู [ObjectId profile](./tenant-audit.md#22-header-id-format-mongodb-objectid-profile)) |
| **`x-user-branch`** | **default บังคับ** บน business API (ยกเว้น OpenAPI/ADR/Exempt ระบุ) | สาขา — เหมือน `x-user-ou` กับ `branch_id` |
| **`x-user-id`** | **default บังคับ** บน business API (ยกเว้น OpenAPI/ADR/Exempt ระบุ) | user id (หลัง auth ที่ gateway); รูปแบบต้อง **สอดคล้องการ persist** ของ `cr_by` / `upd_by` (ดู [Tenant → ObjectId profile](./tenant-audit.md#22-header-id-format-mongodb-objectid-profile)) |
| **`x-user-role`** | ตาม OpenAPI | **opaque string** — ค่าถูกกำหนดโดย gateway; service treat เป็น string. std.min **ไม่ lock enum**; service ที่ต้อง lock enum เฉพาะทางใช้ `x-user-role-enum` ใน OpenAPI (ดู [`x-` extensions catalog](#x--extensions-catalog)) — extension **optional** |

ไม่ครบ / ว่างหลัง trim เมื่อบังคับ **403** **`MISSING_GATEWAY_USER_CONTEXT`**

#### Canonical trusted header order (OpenAPI, docs, HTTP examples) [Required]

เมื่อระบุหรือแสดง header ชุดเดียวกัน (เอกสาร, ตัวอย่าง HTTP, OpenAPI `parameters`, collection นำเข้า client) สำหรับ **internal API หลัง gateway** ต้องใช้ **ลำดับนี้จากบนลงล่าง** (เว้นรายการที่ operation ไม่ใช้ — **ห้าม** สลับลำดับของรายการที่เหลือ):

1. **`x-gateway-secret`** — มาจาก `security` (`GatewaySecret`) ใน OpenAPI; ใน **ตัวอย่าง HTTP** ใส่บรรทัดนี้ก่อน header อื่นในชุดเดียวกัน (ไม่ประกาศซ้ำใน `parameters`)
2. **`x-user-ou`**
3. **`x-user-branch`**
4. **`x-user-id`**
5. **`x-user-role`**
6. **`If-Match`** — เมื่อ operation ใช้ (conditional write / optimistic lock ตาม [Tenant + audit](./tenant-audit.md))

- **หลังบล็อกนี้:** **[Recommended]** `x-request-id` แล้วตามด้วย header อื่น (`Content-Type`, `Accept`, …) ตามความเหมาะสมของ operation
- **Gateway → upstream:** เมื่อ forward request ที่มี header ในชุดข้างบน ควรส่ง **ตามลำดับนี้** เพื่อให้สอดคล้อง log และเอกสาร (HTTP ไม่กำหนด semantics จากลำดับ แต่ใช้เป็นมาตรฐานทีม)

#### Duplicate header policy [Required]

HTTP อนุญาต header ซ้ำได้ (Node aggregate เป็น comma-joined string หรือ array บาง header); **critical headers** ต้อง reject เพื่อกัน **header smuggling**

| Header | Value count > 1 | Action |
| :--- | :--- | :--- |
| **`x-gateway-secret`** | > 1 (แม้ค่าตรงกัน) | **401** **`INVALID_GATEWAY_SECRET`** (external message เดียวกันกับ auth fail; ดู [Authentication error mapping](#authentication-error-mapping)) |
| **`x-request-id`** | > 1 | **400** **`INVALID_HEADER`** |
| **`x-user-id`** / **`x-user-ou`** / **`x-user-branch`** / **`x-user-role`** | > 1 | **400** **`INVALID_HEADER`** |
| **`Content-Type`** | > 1 | **400** **`INVALID_HEADER`** |
| **`Origin`** / **`If-Match`** | > 1 | **400** **`INVALID_HEADER`** |

**Detection — ใช้ `req.rawHeaders` (source of truth):**

Node's `req.headers` join duplicate header values เป็น comma-separated string (single-valued headers) — เช็ค `Array.isArray` จึง **ไม่เพียงพอ**; critical headers ที่ซ้ำจะ **หลุด** guard ได้

**Rule:** ต้องตรวจจาก `req.rawHeaders` เท่านั้น (เพื่อนับ occurrences จริง); `req.headers[name]` ใช้ **หลัง** guard ผ่านแล้ว

ดู middleware reference ใน [`examples/duplicate-header.middleware.js`](./examples/duplicate-header.middleware.js)

#### Request limits

| Limit | Default | ENV override | Exceeded response |
| :--- | :--- | :--- | :--- |
| **JSON body size** | **`1mb`** | `BODY_LIMIT` | **413** **`PAYLOAD_TOO_LARGE`** |
| **URL length** | default (Node 8KB per header) | — | **431** **`REQUEST_HEADER_FIELDS_TOO_LARGE`** |
| **JSON strict mode** | `strict: true` | — | `{`, `[` เท่านั้น; อื่นๆ **400** **`INVALID_PARAM`** |

**Implementation:**

```js
app.use(express.json({ limit: process.env.BODY_LIMIT || '1mb', strict: true }));
```

- เกินขีด → Express ยิง `entity.too.large` error; **error handler ต้อง wrap เป็น envelope** `code: PAYLOAD_TOO_LARGE`
- ถ้าต้องการ limit ใหญ่กว่า 1MB (เช่น upload) ให้ประกาศใน **OpenAPI + ADR** และใช้ route-level `express.json({ limit: '...' })` เฉพาะ route นั้น

### 2.2 Middleware pipeline & Rate limiting

#### Middleware pipeline [Required ordering]

**ต้อง** mount ตามลำดับนี้ใน `src/server.js` (หรือ `src/app.js`); เบี่ยงได้เฉพาะเมื่อมี **ADR**:

| # | Middleware | Why this order |
| :--- | :--- | :--- |
| 1 | **`app.set('trust proxy', 1)`** | ต้องตั้งก่อนทุก middleware ที่อ่าน IP (logger, rate limit) |
| 2 | **`helmet()`** | security headers ติดไปกับทุก response รวม 401/403/429 |
| 3 | **`x-request-id` generator** | สร้าง UUID ถ้าไม่มี + bind `logger.child({ requestId })` |
| 4 | **`pino-http`** | log ทุก request รวม unauthorized (ดู [Observability](./observability.md)) |
| 5 | **`x-gateway-secret` validator** | reject **401** ก่อน logic ใดๆ (exempt paths ข้าม step นี้) |
| 6 | **Duplicate header guard** | reject **400** `INVALID_HEADER` (ดู [Duplicate header policy](#duplicate-header-policy-required)) |
| 7 | **`x-user-*` validator** | default บังคับ **`x-user-id`** + **`x-user-ou`** + **`x-user-branch`** บน business API (เว้น path/operation ที่ OpenAPI/ADR หรือ [Exempt paths](#exempt-paths-mesh-internal) ยกเว้น); reject **403** **`MISSING_GATEWAY_USER_CONTEXT`** |
| 8 | **Rate limit** (`express-rate-limit`) | หลัง auth เพื่อไม่เปลือง budget กับ unauth traffic |
| 9 | **`Content-Type` enforcement** | สำหรับ route ที่มี body |
| 10 | **`express.json({ limit: '1mb', strict: true })`** | body parser หลัง rate limit (กัน DoS บน body ใหญ่) |
| 11 | **Route handlers** | route-level: `validate(schema)` (Joi) → controller → service → repository |
| 12 | **Error handler** | final `(err, req, res, next)` — wrap envelope + echo `x-request-id` |

#### Exempt paths (mesh-internal)

| Path | `x-gateway-secret` | `x-user-id` / `x-user-ou` / `x-user-branch` | Rate limit | `pino-http` | HTTP histogram | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`/healthz`** | **exempt** | **exempt** | exempt | exempt | exempt | liveness probe (orchestrator) |
| **`/readyz`** | **exempt** | **exempt** | exempt | exempt | exempt | readiness probe (ดู [MongoDB → Health check integration](./mongodb.md#41-health-check-integration)) |
| **`/metrics`** | **required** (ดู [Observability → `/metrics`](./observability.md#42-metrics-endpoint)) | **exempt** | exempt | exempt | exempt | Prometheus scrape ผ่าน gateway — ไม่บังคับ user context |

- Implementation: mount **separate router** สำหรับ exempt paths **ก่อน** step 5; mount router หลักหลัง step 5
- **ห้าม** เพิ่ม exempt path อื่นโดยไม่มี **ADR**

---

#### Rate limiting

#### Scope and ordering

- Mount ที่ **step 8** ของ middleware pipeline (**หลัง** `x-gateway-secret` + `x-user-*` validator); ดู [Middleware pipeline](#middleware-pipeline-required-ordering)
- **`trust proxy`:** ตั้งที่ step 1 แล้ว — ไม่ต้องตั้งซ้ำที่นี่
- **Exempt paths:** `/healthz`, `/readyz`, `/metrics` exempt จาก rate limit; ดู [Exempt paths](#exempt-paths-mesh-internal)
- **Auth endpoints:** std.min model ให้ auth อยู่ที่ **gateway** (ดู [Scope](#scope-and-authentication)) — service ไม่ควรมี public login path; ถ้ามี ให้เปิด **ADR** + custom limiter

#### Tier and default limits

| Tier | HTTP methods | windowMs | Max | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Read** | `GET`, `HEAD` | **1 นาที** | **200** | idempotent; สูงกว่าเพราะไม่เปลี่ยน state |
| **Write** | `POST`, `PUT`, `PATCH`, `DELETE` | **1 นาที** | **30** | state-changing; conservative |

- **Baseline บังคับ** — service ที่ไม่ override อะไรต้องใช้สอง tier นี้
- **บังคับ per-route override** (ต่ำกว่า / สูงกว่า default) ผ่าน **OpenAPI** (ดู [Per-route override](#per-route-override))

#### Per-route override

- **ประกาศใน OpenAPI** ต่อ operation ด้วย vendor extension **`x-ratelimit`** (shape บังคับ ดู [`x-` extensions catalog](#x--extensions-catalog)):

```yaml
paths:
  /users/export:
    post:
      x-ratelimit:
        windowMs: 3600000      # required — window ในหน่วย ms
        max: 5                 # required — request ต่อ window ต่อ key
        reason: "bulk export; expensive query"  # required เมื่อ max > default
      # ...
```

| Direction | Approval |
| :--- | :--- |
| **Stricter** (ค่าน้อยกว่า default) | อนุญาต auto (OpenAPI เท่านั้นก็พอ) |
| **Looser** (ค่ามากกว่า default) | ต้องมี **ADR** + reason |

- Service **ต้อง** อ่าน `x-ratelimit` จาก OpenAPI ตอน bootstrap แล้วสร้าง limiter ต่อ route (อย่าฝังใน code)

#### Keying

| Priority | Key source | When used |
| :--- | :--- | :--- |
| 1 | **`x-user-id`** (trim) | route ที่ต้องมี user context (ปกติ) |
| 2 | **`x-gateway-secret` hash** | route ที่ไม่ต้องมี user (system-to-system) |
| 3 | `req.ip` (`trust proxy: 1`) | fallback เท่านั้น |

**หมายเหตุ IP fallback:** Service ทุกตัวอยู่หลัง **gateway เดียวกัน** → `req.ip` อาจเป็น IP ของ gateway ทำให้ caller **share bucket เดียว** (self-DoS risk); หลีกเลี่ยงโดยกำหนดให้ route ที่ rate-limit ต้องมี `x-user-id` หรือ secret hash เสมอ (ประกาศใน OpenAPI)

#### Store

| Deployment | Store | Package |
| :--- | :--- | :--- |
| **Single replica** (dev / test / PM2 fork mode เดี่ยว) | **memory** (default) | — |
| **Multi-replica** (≥2) / PM2 cluster / K8s scaled | **Redis** (required) | **`rate-limit-redis`** |

- **เหตุผล:** default memory store แยก counter ต่อ process → scaled service จะทนได้จริง `max × N replicas` (silent bypass)
- **Redis connection:** reuse connection ที่มีอยู่; ถ้ายังไม่มี connection ติดตั้ง client (`redis` หรือ `ioredis`) + บันทึกใน **ADR**
- **Store toggle:** ใช้ ENV `RATE_LIMIT_STORE` (`memory` | `redis`); production ที่ `replicas ≥ 2` ต้องเป็น `redis` (เช็คใน readiness probe ได้)

#### Implementation contract [Required]

Middleware `src/middlewares/rate-limit.middleware.js` ต้องมี behavior ตามนี้ (implementation ขึ้นกับ service):

| Aspect | Rule |
| :--- | :--- |
| **Key** | ตาม [Keying](#keying) (priority: `x-user-id` → `x-gateway-secret` hash → `req.ip`) |
| **Store selection** | ENV `RATE_LIMIT_STORE` (`memory` \| `redis`); multi-replica ต้องเป็น `redis` (ดู [Store](#store)) |
| **Headers** | `standardHeaders: true`, `legacyHeaders: false`, `Retry-After` บน 429 |
| **Handler (429)** | return envelope ตาม [Response contract](#response-contract) ด้านล่าง (พร้อม `requestId` = `req.id`) |
| **Tier selection** | `GET`/`HEAD` → read tier; อื่นๆ → write tier; per-route override อ่านจาก OpenAPI `x-ratelimit` |
| **Redis store prefix** | `rl:${APP_NAME}:` — isolate ข้าม service บน Redis เดียวกัน |

ดู middleware reference ใน [`examples/rate-limit.middleware.js`](./examples/rate-limit.middleware.js)

#### Response contract

| Item | Value |
| :--- | :--- |
| **HTTP status** | **429** |
| **Body** | envelope: `success: false`, `code: TOO_MANY_REQUESTS`, `message`, `data: null`, `requestId` |
| **Response headers** | **`X-RateLimit-Limit`**, **`X-RateLimit-Remaining`**, **`Retry-After`** (seconds), **`x-request-id`** |
| **Legacy headers** | **disabled** (`legacyHeaders: false`) |

---

### 2.3 Data Validation (Joi)

#### Library and scope

| Rule | Value |
| :--- | :--- |
| **Library** | **Joi** (ดู [Supply chain → Required](./supply-chain.md#11-production-dependencies) `joi ^18.1.2`) |
| **Scope** | **body**, **query**, **params**, **headers** (เฉพาะที่ต้อง business-validate; critical headers ใช้ dedicated middleware — ดู [Duplicate header policy](#duplicate-header-policy-required)) |
| **Deviation** | ห้ามใช้ validator อื่น (Yup, ajv, zod) โดยไม่มี ADR |
| **Schema language** | Joi native (ห้าม JSON Schema รูป raw) — Joi รองรับ coercion + async custom rules ครบ |

#### File location and export shape

| Rule | Value |
| :--- | :--- |
| **File path** | `src/modules/<feature>/<feature>.validator.js` (ดู [Runtime → Naming](./runtime.md#43-naming-convention)) |
| **Export shape** | `module.exports = { <action>: { <source>: <Joi schema> } }` ต่อ action |
| **Action keys** | `create`, `update`, `replace`, `list`, `detail`, `delete`, custom action (kebab → camelCase เช่น `verifySlip`) |
| **Source keys** | `body`, `query`, `params`, `headers` — ใส่เฉพาะที่มี |
| **Compile cache** | schema **ต้อง compile ครั้งเดียว** ที่ module load (top-level `const`); **ห้าม** สร้างใหม่ใน handler |

ดู validator template ใน [`examples/user.validator.js`](./examples/user.validator.js) และ route wiring ใน [`examples/user.route.js`](./examples/user.route.js)

#### Validation middleware

| Rule | Value |
| :--- | :--- |
| **Pattern** | dedicated **middleware** per-route (**ไม่** validate ใน controller body) |
| **File** | `src/middlewares/validate.middleware.js` |
| **Signature** | `validate(schema)` → returns Express middleware; `schema` = `{ body?, query?, params?, headers? }` |
| **Mount order** | **ต้อง** อยู่ **หลัง** rate limit + content-type check, **ก่อน** controller (ดู [Middleware pipeline](#middleware-pipeline-required-ordering)) |
| **Failure** | call `next(error)` พร้อม `ValidationError` — ให้ **error handler** แปลงเป็น envelope `400 INVALID_PARAM` + `data.errors[]` |

ดู middleware reference ใน [`examples/validate.middleware.js`](./examples/validate.middleware.js)

#### Joi global config

`validate()` middleware **ต้อง** เรียก `.validate()` ด้วย options:

| Option | Value | Reason |
| :--- | :--- | :--- |
| **`abortEarly`** | **`false`** | collect **ทุก** error ใน 1 response (ดู [Validation error shape](#validation-error-shape)) |
| **`convert`** | **`true`** | coerce string → type (query params จาก URL เป็น string เสมอ) |
| **`stripUnknown`** | **`false`** | ไม่ strip silently; ใช้ `.unknown(false)` บน schema แทน (reject explicit) |
| **`errors.wrap.label`** | **`''`** | `message` ไม่มี quote รอบ label (เช่น `"email" is required` → `email is required`) |
| **`errors.label`** | `'path'` | ใช้ dotted path (`user.email`) แทน default label |
| **`presence`** | `'optional'` (default) | required fields ประกาศบน schema ด้วย `.required()` |

#### Strict mode (unknown fields)

| Scope | Rule | On unknown field |
| :--- | :--- | :--- |
| **body** | **`.unknown(false)`** บังคับ | **400 `INVALID_PARAM`** sub-code **`UNKNOWN_FIELD`** |
| **query** | **`.unknown(false)`** บังคับ | เหมือนกัน — **reject** (ไม่ strip, ไม่ ignore) |
| **params** | **`.unknown(false)`** | path params fix จาก route pattern อยู่แล้ว |
| **headers** | **`.unknown(true)`** | HTTP header มี standard headers นอก list ได้ตลอด |

- **Reason:** strict reject = **defense-in-depth** ป้องกัน parameter pollution, typo bugs (`limmit=10` เงียบ ๆ ไม่ผ่าน)
- **Deviation:** service ไหนต้อง `.unknown(true)` บน body/query ต้องประกาศ ADR

#### Shared schema library

ไฟล์กลาง: **`src/utils/schemas.js`** — shared reusable schemas ทั้ง service

| Schema | Definition | Purpose |
| :--- | :--- | :--- |
| **`objectId`** | `Joi.string().pattern(/^[0-9a-f]{24}$/i).message('must be a valid ObjectId')` | Mongo `_id` validation **ก่อน** query (ลด attack surface) |
| **`isoDatetime`** | `Joi.string().isoDate()` + custom `.custom(v => UTC Z only)` | align [Date and time](#date-and-time) (ห้าม offset) |
| **`pagination`** | `Joi.object({ page: ..., limit: ... })` | reuse ใน list endpoints |
| **`sortField(enum)`** | helper → returns `Joi.string().valid(...enum)` | sort whitelist ตาม OpenAPI |

- **Ownership:** shared schemas live ใน `src/utils/schemas.js`; per-feature schemas อยู่ใน module (ห้าม duplicate `objectId` ใน validator)

#### Error mapping (Joi → sub-code)

ไฟล์: **`src/utils/validation-error.js`** — central mapper จาก Joi error type → std.min validation sub-codes (registered ใน [`codes.yaml`](./codes.yaml))

| Joi error type | Sub-code | HTTP |
| :--- | :--- | :--- |
| `any.required`, `string.empty`, `array.includesRequiredUnknowns` | **`REQUIRED`** | 400 |
| `string.base`, `number.base`, `boolean.base`, `array.base`, `object.base` | **`INVALID_TYPE`** | 400 |
| `number.min`, `number.max`, `array.min`, `array.max`, `string.min`, `string.max`, `date.min`, `date.max` | **`OUT_OF_RANGE`** | 400 |
| `string.email`, `string.pattern.base`, `string.uri`, `string.isoDate`, `any.only` (enum) | **`INVALID_FORMAT`** | 400 |
| `object.unknown` | **`UNKNOWN_FIELD`** | 400 |
| _fallback_ (type ไม่ match ข้างบน) | **`INVALID_FORMAT`** | 400 |

**Top-level envelope:**

- `success: false`
- `code: "INVALID_PARAM"` (**เสมอ** สำหรับ validation error)
- `message: "Request validation failed"` (generic; **ห้าม** concat field errors)
- `data.errors[]` = array ของ `{ path, code, message }` mapped ตามตารางด้านบน

#### Performance

- **Schema compile once:** top-level `const schema = Joi.object({...})` ที่ `require` time; ห้าม compile ใน handler (overhead ~100-500µs ต่อ request)
- **`validateAsync` only when needed:** async custom rules (เช่น uniqueness check) ใช้ `.external()` — แต่ **แนะนำ** ทำใน service layer แทน (validator ไม่ควร query DB)
- **Avoid `.alternatives()`:** `alt` hierarchy ทำ error path ซับซ้อน — prefer flat schema + service-layer guard

#### Forbidden

- validate **ใน controller body** (ต้องใช้ middleware)
- compile Joi schema ใน handler (perf + memory leak)
- concat Joi errors เป็น `message` string เดียว (ต้องใช้ `data.errors[]`)
- ใช้ `stripUnknown: true` เป็น default (silent drop typo)
- query DB ใน validator (`.external()` → async I/O); เลื่อนไป service layer
- ใช้ validator อื่น (Yup / ajv / zod) โดยไม่มี ADR
- ใช้ regex ยาว / complex ใน `Joi.string().pattern()` โดยไม่ ReDoS-proof (escape meta, bounded length)

---

## 3. Response & Error Handling

### 3.1 API response envelope

#### Principles

| Rule | Detail |
| :--- | :--- |
| **HTTP status จริง** | ตั้งผ่าน `res.status()`; **ห้าม** คืน **200** แล้วแฝง error ใน body |
| **`code` casing** | **UPPER_SNAKE_CASE** เท่านั้น; ≤ 40 chars; noun-based preferred |
| **Encoding** | **UTF-8** ทั้งหมด; `Content-Type: application/json; charset=utf-8` |
| **Time zone** | runtime **`TZ=UTC`** (ดู [Runtime → Environment](./runtime.md#1-runtime-environment)); datetime emit เป็น ISO 8601 ลงท้าย `Z` |
| **Code registry + immutability** | `code` ทั้งหมด **ต้องลงทะเบียน** ใน [`codes.yaml`](./codes.yaml) ก่อน merge; เปลี่ยน/ลบ code ใน OpenAPI contract = **major version + ADR** + grace period ≥ 1 major (รายละเอียด ดู [`code` taxonomy → Central registry](#code-registry-categories-sot)) |

#### Envelope field order

`success`, `code`, `message`, `data`, (`pagination` **หรือ** `requestId`)

#### `requestId` placement

| Placement | When |
| :--- | :--- |
| **Response header `x-request-id`** | **ทุก** response (success + error) — echo ค่าที่ใช้ใน log context (ดู [Request headers → `x-request-id`](#x-request-id)) |
| **Envelope body `requestId`** | **เฉพาะ error** (`success: false`); success envelope **ไม่ใส่** |

#### `message`

| Aspect | Rule |
| :--- | :--- |
| Success | optional; ใส่ `null` หรือ omit ได้ตาม OpenAPI |
| Error | **required**; ข้อความ caller-safe — ห้ามมี stack trace, SQL, ชื่อ table/collection, internal path, connection string |
| **Language** | **English (en)** เป็น default; i18n ต้องประกาศใน OpenAPI + header `x-locale` + **ADR** |
| **Max length** | **500 chars** (ป้องกัน DoS และ log bloat) |
| **PII** | **ห้าม** embed ค่าที่เป็น PII (email, phone, address, full user input); ใช้ reference เช่น `"field 'email' is invalid"` แทน `"email 'foo@bar.com' is invalid"` |
| **Enumeration guard** | `MISSING_GATEWAY_SECRET` และ `INVALID_GATEWAY_SECRET` ต้องใช้ `message` **เดียวกัน** external (log ภายในแยกเหตุ; ดู [Authentication error mapping](#authentication-error-mapping)) |

#### Field naming in `data`

- ตั้งชื่อฟิลด์ให้สื่อความหมาย (เช่น `id` แทน `_id`) **ยกเว้น** บริการต้องการให้ตรงชื่อใน DB; ถ้ายกเว้น **ต้องระบุใน OpenAPI**

#### `null` vs omit keys

- ค่าที่ "ไม่มีค่า" ใน **response body:** ใช้ **`null`** **ห้าม**ใช้ `""` แทน missing
- **ห้ามตัด key ที่จำเป็นตาม contract/OpenAPI ทิ้ง**
- **Query string:** ไม่ส่งคีย์ที่ไม่ใช้ (ไม่ส่งค่าว่าง)

#### `data` shape

| Case | `data` | Top-level `code` | Other |
| :--- | :--- | :--- | :--- |
| **List** (มี items) | **array** | `SUCCESS` | ถ้าแบ่งหน้า **ต้อง** มี **`pagination`** |
| **List (empty)** | **`[]`** | `SUCCESS` | pagination `total: 0, totalPages: 0`; **ไม่ใช้** `DATA_NOT_FOUND` สำหรับ list |
| **Detail** | **object** | `SUCCESS` | |
| **Detail (missing)** | `null` | **domain code** (เช่น `USER_NOT_FOUND`) + HTTP **404** | ต้องมี `requestId` |
| **Validation error** (multi-field) | **`{ errors: [...] }`** | `INVALID_PARAM` | HTTP **400**; ดู [Validation error shape](#validation-error-shape) |
| **Malformed JSON body** (strict parse) | **`{ detail: ... }`** (caller-safe) | `INVALID_JSON_BODY` | HTTP **400** — ไม่ใช้ `INVALID_PARAM` |
| **Other error / no payload** | **`null`** | — | ต้องมี `requestId` |

#### `pagination` (list)

| Field | Rule | Example |
| :--- | :--- | :--- |
| **`page`** | **1-indexed** integer ≥ 1 | `1` |
| **`limit`** | integer > 0; service กำหนด default + max ใน OpenAPI (**แนะนำ default 20, max 100**) | `20` |
| **`total`** | integer ≥ 0 | `150` |
| **`totalPages`** | `total === 0 ? 0 : Math.ceil(total / limit)` | `8` (หรือ `0` เมื่อ `total: 0`) |

**Empty list contract:** `data: []`, pagination `total: 0, totalPages: 0`, HTTP **200**, `code: SUCCESS` — **ไม่ใช่** `DATA_NOT_FOUND`

#### Validation error shape

Joi (หรือ validator อื่น) ที่ตรวจหลาย field พร้อมกัน **ต้อง** คืนทุก error ใน `data.errors` — เพื่อให้ client แสดง inline error ได้

- **Envelope:** `success: false`, top-level `code` = **`INVALID_PARAM`** เสมอ, `data: { errors: [...] }`, `requestId` — field shape = `ValidationErrorItem` ใน [`examples/openapi-components.fragment.yaml`](./examples/openapi-components.fragment.yaml); ตัวอย่าง JSON ใน [`examples/envelope-examples.json`](./examples/envelope-examples.json)
- **HTTP status:** **400**
- **`data.errors[]`:** ≥ 1 entry; แต่ละรายการ `{ path, code, message }` — `path` = dot-notation (`body.` / `query.` / `params.` / `headers.`)
- **Sub-code** (`data.errors[].code`): ลงทะเบียนใน [`codes.yaml`](./codes.yaml) หมวด `validation` (baseline: `REQUIRED`, `INVALID_TYPE`, `OUT_OF_RANGE`, `INVALID_FORMAT`, `UNKNOWN_FIELD`)

#### Payload types (under `data`)

| Type | Rule |
| :--- | :--- |
| **String** | UTF-8 (ตาม `Content-Type: application/json; charset=utf-8`) |
| **DateTime** | ISO 8601 string; **UTC instant ลงท้าย `Z`**; ห้าม numeric timestamp |
| **Number** | JSON Number (integer / float) |
| **Money** | **`String` เสมอ** (ห้าม Number — กัน floating-point drift) |
| **Boolean** | `true` / `false` |
| **ID** | `String` |
| **Missing value** | `null` (ห้าม `""`) |

#### `code` registry (categories + SoT)

- **Categories:** **system** (envelope top-level `code`), **validation** (เฉพาะ `data.errors[].code`), **domain** (business errors — ลงทะเบียนใน OpenAPI + [`codes.yaml`](./codes.yaml))
- **SoT หลัก:** [`codes.yaml`](./codes.yaml) — ทุก `code` ต้องอยู่ที่นี่ก่อน merge; **unique ทั่ว org**; code เดียวกัน → HTTP status เดียวกัน; ตั้งชื่อ **UPPER_SNAKE_CASE**, ≤ 40 chars, noun-based preferred; deprecation ตาม field ใน YAML + **major** bump service
- **CI:** ทุก `code` ใน OpenAPI examples ต้อง resolve ใน registry (ดู [Drift prevention](#drift-prevention-ci-gate))

#### HTTP status and `code` mapping

**SoT:** [`codes.yaml`](./codes.yaml) — ตาราง HTTP ↔ `code` ครบอยู่ที่นี่ (อย่าซ้ำใน prose เป็นรายการยาว)

**กรณีที่มักสับสน (สรุปใน prose):**

| Situation | HTTP | `code` / note |
| :--- | :--- | :--- |
| List ว่าง (query valid) | **200** | default = `SUCCESS` + `data: []` — ดู [Empty list contract](#pagination-list); ใช้ `DATA_NOT_FOUND` เฉพาะเมื่อ service ประกาศใน OpenAPI + [`codes.yaml`](./codes.yaml) (ห้ามทับกรณี detail ไม่พบ) |
| Detail ไม่พบ | **404** | **domain code** เท่านั้น (เช่น `USER_NOT_FOUND`) — **ไม่มี** generic `NOT_FOUND` |
| Validation หลาย field | **400** | top-level **`INVALID_PARAM`** เสมอ + `data.errors[]` |
| Body ไม่ใช่ JSON ที่ parse ได้ (strict / `entity.parse.failed`) | **400** | **`INVALID_JSON_BODY`** — **ไม่ใช้** `INVALID_PARAM`; รายละเอียด parse อาจอยู่ใน `data.detail` (caller-safe) |
| Auth fail (401) | **401** | `MISSING_GATEWAY_SECRET` / `INVALID_GATEWAY_SECRET` — `message` เดียวกันภายนอก (ดู [Authentication error mapping](#authentication-error-mapping)) |
| Optimistic lock | **412** / **428** | `VERSION_CONFLICT` / `PRECONDITION_REQUIRED` (ดู [Tenant + audit](./tenant-audit.md)) |
| MongoDB unique index ชน (`E11000` / `code` 11000) | **409** | domain `code` (เช่น `DUPLICATE_*`) — **ห้าม** `INTERNAL_ERROR`; ดู [MongoDB → Unique index violations](./mongodb.md#33-unique-index-violations-e11000) |
| No body success | **204** | ไม่มี envelope (ดู [204 policy](#204-policy)) |
| Readiness fail | **503** | `SERVICE_UNAVAILABLE` (ดู [MongoDB → Health check integration](./mongodb.md#41-health-check-integration)) |

#### 204 policy

- **When:** `DELETE /things/:id` สำเร็จ; `PUT /things/:id` update ที่ไม่ต้องคืน payload
- **Body:** **empty** — **ไม่ใส่ envelope**
- **Headers:** ไม่ต้อง `Content-Type`; **ต้อง** มี `x-request-id`
- **Alternative:** ถ้า service ต้องการ envelope ทุก response (สำหรับ consistency) ให้คืน **200** + `data: null` + `code: SUCCESS` **แทน** 204

#### Example responses [Reference]

ตัวอย่าง JSON (list success, detail 404, validation 400) อยู่ที่ [`examples/envelope-examples.json`](./examples/envelope-examples.json) — shape อื่น (`204`, `POST 201`, `429`, `412`, `428`) ดูหมวดที่เกี่ยวข้องในไฟล์นี้

> **Note:** error ที่ **ไม่ใช่** Joi/field validation (`INVALID_JSON_BODY`, `PAYLOAD_TOO_LARGE`, `CONFLICT`, `INTERNAL_ERROR`, ...) **ห้าม** reuse `code: INVALID_PARAM` — `INVALID_JSON_BODY` ใช้ top-level `code` ของตัวเอง (HTTP 400) และอาจมี `data.detail` สำหรับสาเหตุ parse แบบ caller-safe; error อื่นที่ไม่มี payload มัก `data: null` เหมือน 404 domain error

#### Response headers

##### Security headers [Required]

- ใช้ **`helmet()`** ด้วย default config — mount เป็น middleware แรก **หลัง** `trust proxy`; ครอบคลุม HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-*` suite (รายละเอียดตาม version ของ `helmet` ที่ล็อคใน `package-lock.json`)
- **Override แนะนำ (internal API):** `X-Frame-Options: DENY` (default = `SAMEORIGIN`)
- **ปิด/แก้ header ใดก็ได้** ต้องมี **ADR** ต่อ header ที่ปิด
- **`Content-Security-Policy`:** internal API ไม่ return HTML → เปิด default หรือปิดได้ตามความเหมาะสม

##### Correlation

- ทุก response (success / error) ต้อง set **`x-request-id`** = ค่าที่ใช้ใน log context

##### Concurrency (`ETag`)

- Single-resource response (GET detail, POST create, PATCH/PUT response body) **ต้อง** set response header **`ETag`** (ดู [Tenant + audit → ETag generation](./tenant-audit.md#etag-generation))
- List responses **ไม่** ใส่ `ETag` ระดับ envelope
- Error responses **ไม่** ต้องใส่ `ETag` (รวม 412 / 428)

##### Rate limit (ดู [Rate limiting](#rate-limiting))

- `X-RateLimit-Limit`, `X-RateLimit-Remaining` (`standardHeaders: true`)
- `Retry-After` เมื่อ **429**
- `legacyHeaders: false`

##### Content-Type

- Success / error: **`application/json; charset=utf-8`** เสมอ
- Empty body responses (เช่น 204) ไม่ต้องตั้ง `Content-Type`

---

### 3.2 Response and error code catalog

ส่วนนี้รวม **`code` ฉบับอ่านง่าย** สำหรับทีม QA, PM และผู้รับ response — **ไม่ละเมิด registry กลาง** — รายละเอียด field-level, envelope shape และกรณี edge ดูที่หัวข้อ [API response](#31-api-response-envelope), [Scope and authentication](#scope-and-authentication), [Validation](#23-data-validation-joi) และ [OpenAPI contract](#11-openapi-contract)

| SoT | บทบาท |
| :--- | :--- |
| [`codes.yaml`](./codes.yaml) | **ฉบับ authoritative** — HTTP status, `message` default, `owner`, ชื่อ `code` ต้องลงทะเบียนที่นี่ |
| ตารางด้านล่าง (ไฟล์ `api.md`) | **ฉบับ human-readable** — สรุปภาษาไทย + คอลัมน์ *เมื่อไรเห็นโค้ดนี้*; หากขัดกับ `codes.yaml` **แก้ `codes.yaml` ก่อน** แล้วอัปเดตตารางนี้ให้สอดคล้อง |

**รูปแบบ response (error):** `success: false`, `code`, `message`, `data` (มัก `null` — ยกเว้น **`INVALID_PARAM`** ที่มี `data.errors[]` และ **`INVALID_JSON_BODY`** ที่อาจมี `data.detail`), `requestId` — ดู [API response → Envelope error](#31-api-response-envelope)

#### Top-level `code` — system (shared services)

| HTTP | `code` | ความหมาย (caller-safe) | เมื่อไรเห็น / สิ่งที่ QA ลอง (สรุป) |
| :--- | :--- | :--- | :--- |
| 200 | **`SUCCESS`** | ดำเนินการสำเร็จ | `success: true` — ดำเนินการตามปกติ |
| 201 | **`SUCCESS`** | สร้าง resource สำเร็จ | `success: true` — เมื่อสร้าง resource สำเร็จ (POST create ตามสัญญา) |
| 200 | **`DATA_NOT_FOUND`** | ค้นแล้วไม่พบ row | เฉพาะ **list/search** ที่ valid แต่ผลลัพธ์ว่าง; **ไม่** ใช่ HTTP 404 resource |
| 400 | **`INVALID_PARAM`** | validation ฝั่ง request ล้ม | top-level นี้เสมอเมื่อ body/query ผิด; รายละเอียดฟิลด์อยู่ที่ `data.errors[]` โค้ดย่อย ดู [Validation sub-codes](#validation-sub-codes-under-invalid_param) |
| 400 | **`INVALID_JSON_BODY`** | body ไม่ใช่ JSON ที่ parse ได้ | strict JSON parse ล้ม (`entity.parse.failed`); **ไม่ใช่** `INVALID_PARAM`; ลองส่ง body ที่ไม่ใช่ JSON หรือมี trailing comma เมื่อ parser strict |
| 400 | **`INVALID_HEADER`** | header ไม่ถูก / ซ้ำวิกฤต | Accept ผิดชนิด, หรือ header ซ้ำที่ policy ห้าม (x-request-id, `x-user-*`, …) |
| 400 | **`MISSING_ORIGIN`** | ต้องส่ง `Origin` | เมื่อ service กำหนดให้ CSRF/Origin บังคับ (default 400; อาจ override 403 ตาม ADR) |
| 405 | **`METHOD_NOT_ALLOWED`** | method ไม่รองรับ | GET ไปที่รับเฉพาะ POST ฯลฯ; response ควรมี `Allow` |
| 409 | **`CONFLICT`** | ขัดกับ state ปัจจุบันทั่วไป | คอนฟลิกตามธุรกิจ/สถานะ; รายเฉพาะ domain อาจใช้ `code` domain อื่น (ลงทะเบียนใน `codes.yaml`) |
| 412 | **`VERSION_CONFLICT`** | ข้อมูลเปลี่ยนแล้ว (optimistic lock) | `If-Match` / ETag ไม่ตรง `upd_date` ปัจจุบัน — ลอง GET ใหม่แล้ว retry PATCH/DELETE |
| 413 | **`PAYLOAD_TOO_LARGE`** | body ใหญ่เกิน | เกิน `BODY_LIMIT` (ค่าเริ่ม 1mb) |
| 415 | **`MISSING_CONTENT_TYPE`**, **`UNSUPPORTED_MEDIA_TYPE`** | ชนิดสื่อ (body) ไม่สอดคล้อง | มี body แต่ไม่มี `Content-Type` หรือ type ไม่ match route |
| 428 | **`PRECONDITION_REQUIRED`** | ต้องส่ง `If-Match` | mutation บน resource ที่มี ETag/audit แต่ client ไม่ส่ง `If-Match` |
| 426 | **`REQUEST_NOT_SECURE`** | ต้อง TLS | กำหนด policy endpoint นั้นต้อง https |
| 429 | **`TOO_MANY_REQUESTS`** | rate limit | ดู header `X-RateLimit-*`, `Retry-After` |
| 431 | **`REQUEST_HEADER_FIELDS_TOO_LARGE`** | header รวมใหญ่เกิน | ลดขนาด/จำนวน header |
| 500 | **`INTERNAL_ERROR`** | ข้อผิดพลาดภายใน (generic) | ไม่ควรรวม PII/ stack ใน `message` — ใช้ `requestId` อ้างอิง log |
| 503 | **`SERVICE_UNAVAILABLE`** | บริการ/dependency ล่มชั่วคราว | มักกับ `/readyz` หรือ outage; ดู `Retry-After` |

#### Top-level `code` — auth (gateway → service)

| HTTP | `code` | ความหมาย (caller-safe) | เมื่อไรเห็น / สิ่งที่ QA ลอง (สรุป) |
| :--- | :--- | :--- | :--- |
| 401 | **`MISSING_GATEWAY_SECRET`**, **`INVALID_GATEWAY_SECRET`** | รวม **ข้อความ `message` เดียวกันภายนอก** | ไม่มี/ผิด `x-gateway-secret` — ตรวจค่าและ duplicate header; ห้ามคาดว่า 401 สองแบบต่างข้อความ (enumeration guard) |
| 403 | **`MISSING_GATEWAY_USER_CONTEXT`** | user/tenant context ไม่ครบ | ต้องส่ง `x-user-id` + `x-user-ou` + `x-user-branch` ตาม default ยกเว้น OpenAPI/ADR กำหนดอย่างอื่น |
| 403 | **`INVALID_USER_CONTEXT`** | ค่า `x-user-*` รูปแบบไม่ valid | เช่น ไม่ใช่ ObjectId 24 hex เมื่อนโยบาย service กำหนด |

#### Validation sub-codes (under INVALID_PARAM)

รายการ `code` ด้านล่างปรากฏใน **`data.errors[].code`** ขณะ **top-level `code` = `INVALID_PARAM`** และ **HTTP 400** — ดู [Validation](#23-data-validation-joi) และ [codes.yaml หมวด validation](./codes.yaml)

| `code` (sub) | ความหมาย (สั้น) |
| :--- | :--- |
| **`REQUIRED`** | ขาดฟิลด์ / ส่ง empty |
| **`INVALID_TYPE`** | ชนิดค่าไม่ตรง (string vs number) |
| **`OUT_OF_RANGE`** | นอก min/max, ความยาว, ช่วง |
| **`INVALID_FORMAT`** | รูปแบบ: email, pattern, enum, ISO date ฯลฯ |
| **`UNKNOWN_FIELD`** | ส่ง key ที่ schema ห้าม (`unknown(false)`) |

#### การบำรุงรักษา

- เพิ่ม/ย้าย/ deprecate `code` → แก้ **[`codes.yaml`](./codes.yaml) ก่อน** แล้ว sync OpenAPI ของ service ที่เกี่ยวข้อง
- CI (Spectral `response-code-in-registry` ฯลฯ) อ้าง `codes.yaml` เป็นหลัก

---
