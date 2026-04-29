# Backend observability standard

Logging (pino), metrics (prom-client), correlation, redaction

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

> **SLO baseline + alerting:** ดู [Ops → SLO baseline](./ops.md#11-slo-baseline)

## Table of contents
1. **Architecture & Setup** (Packages, Logger layout)
2. **Logging Rules & Levels** (Levels, Redaction, Error logging)
3. **HTTP & Correlation** (pino-http, Request ID)
4. **Metrics & Health** (prom-client, /metrics endpoint)
5. **Forbidden Practices**

---

## 1. Architecture & Setup

### 1.1 Package versions

| Package | Version | Purpose |
| :--- | :--- | :--- |
| **`pino`** | `^10.3.1` | structured JSON logger (singleton) |
| **`pino-http`** | `^10.5.0` | HTTP request/response logger middleware |
| **`pino-pretty`** | `^13.1.3` | **dev only** — pretty-print transport |
| **`prom-client`** | `^15.1.3` | Prometheus metrics (official Node client) |

ดู [Supply chain → Production dependencies](./supply-chain.md#11-production-dependencies)

### 1.2 Logger singleton layout

- File เดียว: **`src/config/logger.js`** export **instance เดียว** ของ pino
- โมดูลอื่นใช้ **`logger.child({ module: '<name>' })`** ผูก context เฉพาะที่ (ห้ามสร้าง instance ใหม่)
- Config base fields: `service` (= `APP_NAME`), `env` (= `NODE_ENV`), `version` (= `package.json#version`)

---

## 2. Logging Rules & Levels

### 2.1 Log level by environment

| `NODE_ENV` | Default level | Override via ENV |
| :--- | :--- | :--- |
| **`production`** | **`warn`** | `LOG_LEVEL` (`warn` \| `info` \| `error`) |
| **`development`** | `info` (pretty) | `LOG_LEVEL` |
| **`test`** | `silent` | `LOG_LEVEL=debug` สำหรับ debug test เฉพาะกรณี |

- **HTTP request/response log:** คงไว้ที่ **`info`** ผ่าน `pino-http` override เพื่อไม่ให้ log ของ traffic ปกติหายไปเมื่อ default เป็น `warn`
- **Dev only:** ใช้ `pino-pretty` ผ่าน transport; production **ห้าม** ใช้ `pino-pretty` (bundle size + stdout pipeline)

### 2.2 Log redaction [Required]

ใช้ **`redact`** ของ pino; apply ทุกครั้งใน logger singleton (ห้ามปิดตาม env)

**Paths ที่ต้อง redact (เพิ่มได้ ห้ามลด):**

- `req.headers["x-gateway-secret"]`
- `req.headers.authorization`
- `req.headers.cookie`
- `*.password`
- `*.token`
- `*.accessToken`
- `*.refreshToken`
- `*.apiKey`
- `*.secret`
- censor: `[REDACTED]`

ดู config snippet ใน [`examples/logger.config.js`](./examples/logger.config.js)

**Rules เพิ่มเติม:**

- **ห้าม log full URI ของ MongoDB / external service** (ดู [MongoDB → Lifecycle](./mongodb.md#13-lifecycle)); log `appName` + host + db ได้
- **PII:** id/email/phone log ได้เฉพาะเมื่อจำเป็นต่อ trace; ห้าม log ค่าที่เป็น free-text body (name, address) เว้นแต่ mask

### 2.3 Error logging

| Source | Level | Required fields |
| :--- | :--- | :--- |
| `uncaughtException` | `fatal` | `err`, `requestId?` → `process.exit(1)` (ดู [Runtime](./runtime.md#21-process-error-handling)) |
| `unhandledRejection` | `fatal` | `err`, `reason` → `process.exit(1)` |
| Expected 4xx (validator, business) | `warn` | `code`, `requestId` |
| Unexpected 5xx | `error` | `err` (full stack), `code`, `requestId` |
| DB/network retry exhausted | `error` | `err`, `operation`, `appName` |

---

## 3. HTTP & Correlation

### 3.1 Request correlation

| Rule | Detail |
| :--- | :--- |
| **Header** | **`x-request-id`** (lowercase) — รับ case ใดก็ได้, emit lowercase |
| **Missing** | สร้าง UUID v4 ที่ edge/first middleware |
| **Envelope** | ใส่ `requestId` ใน error envelope (success envelope ไม่ต้อง) |
| **Logger binding** | ผูก `requestId` กับ `logger.child({ requestId })` ที่ middleware แรกหลัง secret ผ่าน; ทุก log downstream ต้องมี `requestId` |
| **Downstream** | forward header `x-request-id` เดิมเมื่อเรียกบริการอื่น (ไม่สร้างใหม่) |
| **Distributed tracing** | ถ้า infra ใช้ W3C Trace Context ให้ forward `traceparent` ด้วย ([Recommended]); ห้ามสร้าง trace id ใหม่ทับ |

### 3.2 HTTP logger (`pino-http`)

- ใช้ **`pino-http`** drop-in middleware (ห้ามเขียน custom log ของ request/response เอง ยกเว้น ADR)
- **Order:** mount **หลัง** middleware ที่ตรวจ `x-gateway-secret` (เพื่อไม่ให้ log caller ที่ไม่มี secret) และ **ก่อน** route handler — ดู [API → Middleware pipeline](./api.md#middleware-pipeline-required-ordering)
- **Auto-log:** ทุก request/response (รวม 4xx/5xx) — ห้ามปิดด้วยเหตุผล noise; ถ้า noisy ให้ทำ sampling ที่ `customLogLevel` แทน

**Required behavior:**

- `genReqId(req)` = `req.headers['x-request-id']`
- `customLogLevel`: 5xx → `error`, 4xx → `warn`, อื่น → `info`
- ใช้ `pino.stdSerializers` สำหรับ `req`, `res`, `err`

ดู config snippet ใน [`examples/pino-http.config.js`](./examples/pino-http.config.js)

---

## 4. Metrics & Health

### 4.1 Metrics (`prom-client`)

- ใช้ **`prom-client`** (official) + **`collectDefaultMetrics()`** (event loop lag, GC, heap, CPU, open handles)
- **HTTP histogram (required):**

| Metric | Type | Labels | Buckets (ms) |
| :--- | :--- | :--- | :--- |
| **`http_request_duration_ms`** | histogram | `method`, `route`, `status_code` | `[5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000]` |
| **`http_requests_total`** | counter | `method`, `route`, `status_code` | — |

- **`route` label:** ใช้ route pattern (เช่น `/users/:id`) **ไม่ใช่** raw URL (กัน cardinality explosion)
- **Labels ต้องห้าม:** `user_id`, `request_id`, `ip`, free-text query (high-cardinality)

### 4.2 `/metrics` endpoint

| Rule | Detail |
| :--- | :--- |
| **Path** | **`GET /metrics`** (same service port) |
| **Access** | **Behind gateway** — ต้องผ่าน **`x-gateway-secret`** ก่อน (reuse middleware เดิม) |
| **Scrape** | Prometheus scrape ผ่าน gateway โดย gateway ส่ง `x-gateway-secret` |
| **Content-Type** | ใช้ `register.contentType` ของ `prom-client` |
| **Excluded from HTTP histogram** | เพื่อกัน self-noise |

### 4.3 Health and readiness (cross-reference)

- **Liveness (`/healthz`)** และ **Readiness (`/readyz`)** ดู [MongoDB → Health check integration](./mongodb.md#41-health-check-integration) + [API → Health and readiness endpoints](./api.md#health-and-readiness-endpoints)
- ทั้งสอง endpoint **ไม่ต้อง** ผ่าน `x-gateway-secret` (ใช้โดย orchestrator/load balancer); **ไม่นับ** ใน HTTP histogram

---

## 5. Forbidden Practices

- **ห้าม** `console.log` / `console.error` (enforced by `no-console` ใน Lint)
- **ห้าม log:** `x-gateway-secret`, Authorization, Cookie, password, token, refreshToken, apiKey, MongoDB URI
- **ห้าม log PII** (email เต็ม, phone เต็ม, address, free-text body) ยกเว้นจำเป็นต่อ trace และผ่าน redaction/mask
- **ห้าม** ใช้ `pino-pretty` ใน production
- **ห้าม** expose `/metrics` แบบ public (ต้องผ่าน gateway + secret)
- **ห้าม** เขียน custom HTTP request/response logger (ใช้ `pino-http`)
- **ห้าม** ใส่ high-cardinality labels (`user_id`, `request_id`, `ip`) ใน metrics
