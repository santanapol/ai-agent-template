# Backend runtime standard

Runtime + process management + npm scripts สำหรับ internal API หลัง gateway

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

Cross-ref: ใช้ "ดู ..." พร้อมชื่อหัวข้อ — ห้ามอ้าง line number

## Table of contents
1. **Runtime Environment** (Node.js, Package manager, Environment)
2. **Process Lifecycle** (Error handling, Graceful shutdown)
3. **Project Architecture** (Directory layout, Module boundaries)
4. **NPM Scripts & CI** (Required scripts, CI pipeline, Conventions)
5. **Forbidden Practices**

---

## 1. Runtime Environment

### 1.1 Node.js

| Item | Rule |
| :--- | :--- |
| **Version** | `>=24 <25` (**LTS เท่านั้น**); ระบุใน `engines.node` |
| **Engine check** | `.npmrc` ตั้ง **`engine-strict=true`** (fail install เมื่อ version ไม่ตรง) |
| **Module system** | **CommonJS** (`"type": "commonjs"` หรือ omit); ESM ต้องมี **ADR** |
| **Source maps** | **`--enable-source-maps`** ใน production (ให้ stack map กลับต้นฉบับ) |

### 1.2 Package manager

| Item | Rule |
| :--- | :--- |
| **Tool** | **npm เท่านั้น** (yarn / pnpm ต้องมี **ADR**) |
| **Pin** | field **`packageManager`** ใน `package.json` (Corepack) เช่น `"npm@10.x"` |
| **CI install** | **`npm ci`** (ดู [Supply chain → Dependencies and lockfiles](./supply-chain.md#14-dependencies-and-lockfiles)) |

### 1.3 Environment variables

| Item | Rule |
| :--- | :--- |
| **Timezone** | **`TZ=UTC`** ทุก environment (production / dev / test) |
| **`NODE_ENV`** | `production` / `development` / `test` เท่านั้น |
| **Secrets** | ENV เท่านั้น; **ห้าม** commit ลง repo (ดู [MongoDB → Lifecycle](./mongodb.md#13-lifecycle), [Observability → Redaction](./observability.md#22-log-redaction-required)) |

---

## 2. Process Lifecycle

### 2.1 Process error handling

- **`uncaughtException` / `unhandledRejection`:** log ผ่าน **pino** แล้ว `process.exit(1)` (fail-fast)
- **ห้าม** `--no-warnings` ใน production (กัน deprecation ถูกซ่อน)
- **ห้าม** experimental flags (`--experimental-*`) ใน production โดยไม่มี **ADR**

### 2.2 Graceful shutdown

- **Signals:** รับ **`SIGTERM`** และ **`SIGINT`**
- **Order:**
  1. Stop accepting new HTTP connections (`server.close()`)
  2. Drain in-flight requests (รอ handler จบ)
  3. เรียก **`closeDatabase()`** (ดู [MongoDB → Lifecycle](./mongodb.md#13-lifecycle))
  4. ปิด adapter / external client ที่มี long-lived connection
  5. `process.exit(0)`
- **Timeout:** ถ้า shutdown > **`SHUTDOWN_TIMEOUT_MS`** (default **`10000`**) ให้ `process.exit(1)` กัน process แขวน

**Exit codes [Reference]**

Code ที่ std.min **บังคับ** คือ `0` (success) และ `1` (any failure); `130`/`143` เป็น convention POSIX เมื่อ process จบจาก signal โดยตรง — ไม่ต้อง emit เอง

| Code | Meaning |
| :--- | :--- |
| `0` | normal shutdown |
| `1` | uncaught error / shutdown timeout |
| `130` / `143` | SIGINT / SIGTERM (POSIX convention; informational) |

---

## 3. Project Architecture

### 3.1 Naming & Top-level layout

- โฟลเดอร์และไฟล์: **kebab-case**
- ใช้ **role suffix** ตาม location:
  - `src/modules/<feature>/` → `.route.js`, `.controller.js`, `.validator.js`, `.service.js`, `.repository.js`
  - `src/middlewares/` → **`.middleware.js`**
  - `src/adapters/` → **`.adapter.js`** (หรือ folder `<vendor>/` เมื่อซับซ้อน)
  - `src/modules/<feature>/tests/` → **`.test.js`** ภายใต้ `unit-test/` หรือ `integration-test/`

**Top-level layout (`src/`):**

| Item | Role |
| :--- | :--- |
| `adapters/` | third-party API client |
| `config/` | `database.js`, `env.js`, `logger.js` (pino singleton), system config |
| `middlewares/` | auth, rate limit, error handler |
| `modules/` | per-feature (5 layers + `tests/`) |
| `utils/` | shared helpers (เช่น `error-codes.js` สำหรับ `code` enum กลาง) |
| `app.js` | Express instance, global middleware, mount routes |
| `server.js` | bootstrap (เช่น DB) แล้ว listen |

### 3.2 Module layers (`src/modules/<feature>/`)

| Layer | Role |
| :--- | :--- |
| **Route** | ผูก HTTP + middleware เท่านั้น; ห้าม business logic |
| **Controller** | เรียก Validator → Service → ส่ง response |
| **Validator** | Joi schema (body / query / params); ห้ามเรียก Service หรือ Repository |
| **Service** | business logic; ห้าม query DB โดยตรง |
| **Repository** | MongoDB driver access; ห้ามเรียก Service หรือ Adapter |

### 3.3 Layer call graph

| Direction | Status |
| :--- | :--- |
| Route → Controller | allowed |
| Controller → Validator / Service | allowed |
| Controller → Repository | **forbidden** (ต้องผ่าน Service) |
| Service → Repository (same module) | allowed |
| Service → Adapter | allowed |
| Service (module A) → Service (module B) | allowed |
| Service (module A) → Repository (module B) | **forbidden** (cross-module ผ่าน Service เท่านั้น) |
| Repository → Service / Adapter | **forbidden** |
| Validator → Service / Repository | **forbidden** |

> **Enforcement:** บังคับด้วย **`eslint-plugin-boundaries`** (ดู [Supply chain → Boundary enforcement](./supply-chain.md#35-boundary-enforcement-eslint-plugin-boundaries))

### 3.4 Directory tree (reference)

โฟลเดอร์เสริมเช่น `.github/`, `scripts/` เพิ่มได้ตามบริการ; `jest.config.js` / `ecosystem.config.*` ตาม tooling จริง

```text
<service-root>/
├── src/
│   ├── adapters/
│   │   └── <vendor>.adapter.js
│   ├── config/
│   │   ├── database.js
│   │   ├── env.js
│   │   └── logger.js
│   ├── middlewares/
│   │   ├── auth.middleware.js
│   │   ├── rate-limit.middleware.js
│   │   └── error-handler.middleware.js
│   ├── modules/
│   │   ├── health/
│   │   │   ├── health.route.js
│   │   │   ├── health.controller.js
│   │   │   ├── health.validator.js
│   │   │   ├── health.service.js
│   │   │   ├── health.repository.js
│   │   │   └── tests/
│   │   │       ├── unit-test/
│   │   │       │   └── health.service.test.js
│   │   │       └── integration-test/
│   │   │           └── health.route.test.js
│   │   └── <feature>/
│   │       ├── <feature>.route.js
│   │       ├── <feature>.controller.js
│   │       ├── <feature>.validator.js
│   │       ├── <feature>.service.js
│   │       ├── <feature>.repository.js
│   │       └── tests/
│   │           ├── unit-test/
│   │           └── integration-test/
│   ├── utils/
│   │   └── error-codes.js
│   ├── app.js
│   └── server.js
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── CHANGELOG.md
├── README.md
├── eslint.config.js
├── jest.config.js
├── openapi.yaml
├── package.json
└── ecosystem.config.*
```

---

## 4. NPM Scripts & CI

### 4.1 Required scripts (std.min baseline)

ทุก service **ต้อง** ประกาศ scripts ต่อไปนี้:

| Script | Purpose | Example | Cross-ref |
| :--- | :--- | :--- | :--- |
| **`start`** | Production entry | **`node src/server.js`** | runtime; pm2/Docker wrap ภายนอก |
| **`dev`** | Dev mode watch | `node --watch src/server.js` | runtime |
| **`lint`** | ESLint | `eslint .` | [Supply chain](./supply-chain.md#3-linting-code-quality) |
| **`lint:fix`** | ESLint auto-fix | `eslint . --fix` | dev convenience |
| **`format`** | Prettier write | `prettier --write .` | [Supply chain](./supply-chain.md#42-prettierignore-required-entries) |
| **`format:check`** | Prettier check (no write) — **CI required** | `prettier --check .` | [Supply chain → CI gate](./supply-chain.md#52-ci-gate-required) |
| **`spec:lint`** | OpenAPI lint (Spectral) — **CI required** | `spectral lint openapi.yaml --ruleset .spectral.yaml` | [API → OpenAPI → Drift prevention](./api.md#drift-prevention-ci-gate) |
| **`test`** | รัน test ทั้งหมด — **CI required** | `jest` | tests live in `src/modules/<feature>/tests/` |
| **`test:unit`** | Unit tests only | `jest --testPathPattern=unit-test` | — |
| **`test:integration`** | Integration tests only | `jest --testPathPattern=integration-test` | — |
| **`test:coverage`** | Coverage report — **CI required** | `jest --coverage` | [Ops → Coverage threshold](./ops.md#31-coverage-threshold) |
| **`audit:check`** | Vulnerability scan — **CI required** | `npm audit --audit-level=high` | [Ops → Security SLA](./ops.md#21-security-sla) |
| **`prepare`** | Husky auto-install (npm lifecycle) | `husky` | [Supply chain → Pre-commit](./supply-chain.md#51-pre-commit-required) |
| **`ci`** | Aggregate CI pipeline (fail-fast serial) | ดู [CI pipeline ordering](#45-ci-pipeline-ordering) | [Supply chain → CI gate](./supply-chain.md#52-ci-gate-required) |

### 4.2 Optional scripts

อนุญาตเพิ่ม (ไม่บังคับ; ประกาศใน README ถ้ามี):

| Script | Purpose | Example |
| :--- | :--- | :--- |
| `test:watch` | Watch mode for TDD | `jest --watch` |
| `lint:staged` | Run lint-staged manually | `lint-staged` |
| `spec:lint:fix` | Spectral with autofix (ถ้า ruleset รองรับ) | `spectral lint openapi.yaml --fix` |
| `deps:check` | Unused dependency detection | `depcheck` |

ดูตัวอย่าง full scripts block ที่ [`examples/package.json.scripts.json`](./examples/package.json.scripts.json)

### 4.3 Naming convention

| Rule | Value |
| :--- | :--- |
| **Case** | **lowercase** เท่านั้น |
| **Separator** | **colon `:`** สำหรับ namespace (`<domain>:<action>`) เช่น `test:unit`, `lint:fix` |
| **Forbidden** | camelCase, snake_case, hyphen (ยกเว้นชื่อมาตรฐาน npm เช่น `pre-commit`) |
| **Standard hooks** | `prepare`, `prestart`, `poststart`, `pretest`, `posttest` — ใช้ตาม npm convention |

### 4.4 Exit code policy

| Rule | Value |
| :--- | :--- |
| **Success** | `0` |
| **Any failure** | **non-zero** (ห้าม suppress ด้วย `\|\| true` ใน script bodies) |
| **Pipe chaining** | ใช้ `&&` (fail-fast) — ห้าม `;` หรือ `\|` ที่ mask exit code |
| **Shell-specific syntax** | หลีกเลี่ยง (scripts ต้องรันได้บน macOS / Linux / Git Bash บน Windows) |
| **`npm run test` exit** | ถ้า test fail → `process.exitCode ≠ 0`; CI block merge |

### 4.5 CI pipeline ordering

**`ci` script (required):** serial fail-fast — หยุดทันทีที่ step ใดล้มเหลว

```json
{
  "scripts": {
    "ci": "npm run lint && npm run format:check && npm run spec:lint && npm test && npm run audit:check"
  }
}
```

| # | Step | Time cost | Reason |
| :--- | :--- | :--- | :--- |
| 1 | `lint` | ~5–15s | fastest — catches 80% of obvious issues |
| 2 | `format:check` | ~3–10s | static file scan; fast |
| 3 | `spec:lint` | ~2–5s | Spectral = fast; catches OpenAPI drift |
| 4 | `test` | 30s–5min | slowest; run after static checks pass |
| 5 | `audit:check` | ~5–10s + network | last เพราะอาจ flaky จาก registry |

- **Coverage gate:** CI ต้องรัน `npm run test:coverage` เพิ่ม (separate job) + ตรวจ threshold (ดู [Ops → Coverage threshold](./ops.md#31-coverage-threshold))
- **Pre-commit hook (husky):** รันแค่ `lint-staged` (บน staged files) — **ไม่** รัน `ci` เต็ม (ช้าเกิน)

---

## 5. Forbidden Practices

- ห้ามใช้ `test`, `start`, `restart`, `stop` สำหรับ purpose อื่นจาก npm lifecycle convention
- ห้าม Inline pm2 / Docker commands ใน `start` (wrap ภายนอก — pm2 `pm2 start npm -- start`, Docker `CMD ["npm","start"]`)
- ห้าม Suppress exit code ด้วย `|| true` / `2>/dev/null`
- ห้ามใช้ `;` chain ที่ mask failure (ใช้ `&&` เท่านั้น)
- ห้ามตั้ง Custom `pre*` / `post*` hooks โดยไม่มีเหตุผลชัด (ให้ไปใช้ `ci` aggregate แทน)
- ห้าม Run coverage เป็น default `test` (ช้า; coverage ควรแยก script)
- ห้ามขาด `prepare` script (จะทำให้ pre-commit hook ไม่ทำงานหลัง `npm install`)
- ห้ามขาด `ci` script (CI yaml duplicate logic ทำให้เกิด drift risk)
- ห้าม `--no-warnings` หรือ experimental flags ใน production
