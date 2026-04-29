# Backend supply chain standard

Dependencies, lockfile, lint, format, pre-commit สำหรับ internal API service

> **Tag legend:** [`README.md` → Tag legend](./README.md#tag-legend)

> **Security SLA + license enforcement** ดู [Ops → Security SLA](./ops.md#21-security-sla) และ [Ops → License policy](./ops.md#22-license-policy)

## Table of contents
1. **Dependencies & Policies** (Production, Dev, SemVer, Lockfiles)
2. **Environment Management** (`dotenv`)
3. **Linting & Code Quality** (ESLint, Boundaries, Security rules)
4. **Formatting** (Prettier, EditorConfig)
5. **Git Hooks & CI Gates** (Husky, lint-staged, GitHub Actions)

---

## 1. Dependencies & Policies

### 1.1 Production dependencies

ติดเฉพาะแพ็กเกจที่ใช้จริง; **baseline ที่ระบุคอลัมน์ Version คือ floor range สำหรับ review ใน PR เท่านั้น** — เวอร์ชันที่รันจริงถูกล็อกที่ `package-lock.json` ตาม [Dependencies and lockfiles](#14-dependencies-and-lockfiles); อัปเดตตาราง version เฉพาะเมื่อ floor เปลี่ยน (major bump / security SLA)

**Required (ติดทุก service)**

| Package | Version | Purpose | Peer |
| :--- | :--- | :--- | :--- |
| `express` | `^5.2.1` | HTTP framework (CommonJS) | — |
| `express-rate-limit` | `^8.3.2` | rate limiting middleware | **`express`** |
| `helmet` | `^8.1.0` | security response headers | **`express`** |
| `joi` | `^18.1.2` | request validation | — |
| `mongodb` | `^7.1.1` | MongoDB official driver | — |
| `pino` | `^10.3.1` | structured logger (singleton) | — |
| `pino-http` | `^10.5.0` | HTTP request/response logger middleware | **`pino`** |
| `prom-client` | `^15.1.3` | Prometheus metrics | — |
| `dotenv` | `^17.4.1` | โหลด `.env` ใน **dev/test** (ดู [Environment Management](#2-environment-management)) | — |
| `json5` | `^2.2.3` | JSON5 config parsing | — |

**Conditional (feature-specific; ติดเมื่อใช้จริงเท่านั้น)**

| Package | Version | When to add |
| :--- | :--- | :--- |
| `exceljs` | `^4.4.0` | service มี endpoint export `.xlsx` |
| `rate-limit-redis` | `^4.2.0` | deploy แบบ **multi-replica (≥2)** / PM2 cluster / K8s scaled |
| `redis` | `^4.7.0` | ต้องมี Redis client เมื่อใช้ `rate-limit-redis` |

**Optional peer (MongoDB compressors)**

ต้องติด **อย่างน้อย 1 ตัว** เมื่อประกาศ `compressors` ใน MongoClient options; ไม่ติด = driver skip compression เงียบ

| Package | Note |
| :--- | :--- |
| `@mongodb-js/zstd` | enables `compressors: ['zstd']` (preferred) |
| `snappy` | enables `compressors: ['snappy']` (native add-on) |

### 1.2 Dev dependencies

**Required**

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `jest` | `^29.7.0` | test runner สำหรับ `test` / `test:unit` / `test:integration` |
| `supertest` | `^7.2.2` | HTTP integration test |
| `pino-pretty` | `^13.1.3` | pretty-print pino log ใน dev |
| `pm2` | `^6.0.14` | process manager; อนุญาตเฉพาะ **devDependency / global tool** (**License: AGPL-3.0**) |

*(หมายเหตุ: เครื่องมือ Lint, Format, Pre-commit ดูที่ [Linting & Code Quality](#3-linting-code-quality))*

### 1.3 SemVer bump policy

| Bump type | Action | Approval |
| :--- | :--- | :--- |
| **major** | ต้องมี **ADR** + PR review ก่อน merge | architect / tech lead |
| **minor** | auto via Renovate / Dependabot | CI smoke test ต้องผ่าน |
| **patch** | auto | CI ต้องผ่าน |
| **security patch** | override ทุก rule ข้างบน | ดู [Ops → Security SLA](./ops.md#21-security-sla) |

### 1.4 Dependencies and lockfiles

| Item | Rule |
| :--- | :--- |
| **Lockfile** | commit **`package-lock.json`** (npm only; ดู [Runtime → Package manager](./runtime.md#12-package-manager)) |
| **CI install** | **`npm ci`** (reproducible; ห้าม `npm install` ใน CI) |
| **`^` semver** | baseline เท่านั้น; runtime pinned by lockfile |
| **Unused deps** | แนะนำรัน `depcheck` ก่อน release (ไม่บังคับใน std.min) |

---

## 2. Environment Management

### 2.1 `dotenv` usage rule

| Environment | Rule |
| :--- | :--- |
| dev / test | `require('dotenv').config()` ที่บรรทัดแรกของ `src/server.js` (หรือจุด bootstrap เดียวกับที่อ่าน env) |
| production | **ค่า env มาจาก runtime/orchestrator เป็นหลัก** (K8s, PM2 `env`, systemd, PaaS) — **ไม่ต้องมีไฟล์ `.env` บนเครื่อง**; ถ้ายังมีไฟล์ (legacy / local image) ให้ใช้ **`require('dotenv').config({ override: false })`** |
| ทุก env | **`.env` ห้าม commit**; **`.env.example` ต้อง commit** พร้อม key + ค่า placeholder |

---

## 3. Linting & Code Quality

เวอร์ชันในตารางด้านล่างเป็น **floor สำหรับ review / baseline** เท่านั้น

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `eslint` | `^9.39.4` | linter core (flat config) |
| `@eslint/js` | `^9.39.4` | official recommended ruleset |
| `eslint-config-prettier` | `^10.1.8` | disable rules ที่ชน Prettier (extend **ท้ายสุด**) |
| `eslint-plugin-n` | `^17.24.0` | Node.js-specific rules |
| `eslint-plugin-security` | `^4.0.0` | security patterns (cherry-picked) |
| `eslint-plugin-import` | `^2.32.0` | import hygiene (`no-cycle`, ordering) |
| `eslint-plugin-boundaries` | `^5.0.1` | enforce **Module layer call graph** |
| `eslint-plugin-jest` | `^28.9.0` | Jest-specific rules |

### 3.1 ESLint base config (`eslint.config.js`)

Flat config; `sourceType: 'commonjs'` + latest Node globals

**Extend order** (สำคัญ — `eslint-config-prettier` ต้องท้ายสุด):
1. `@eslint/js` → `configs.recommended`
2. `eslint-plugin-n` → `configs['flat/recommended-script']`
3. `eslint-plugin-import` → ordering + `no-cycle`
4. `eslint-plugin-boundaries` → layer enforcement
5. `eslint-plugin-security` → cherry-picked rules
6. **`eslint-config-prettier`** ← ท้ายสุด

ดู template configใน [`examples/eslint.config.js`](./examples/eslint.config.js)

### 3.2 Custom rules (minimum)

| Rule | Setting | Reason |
| :--- | :--- | :--- |
| `no-var` | `error` | ใช้ `const` / `let` เท่านั้น |
| `prefer-const` | `error` | immutable by default |
| `eqeqeq` | `error` | strict equality |
| `camelcase` | `["error", { "properties": "never" }]` | ยอม snake_case key จาก API / DB |
| `no-unused-vars` | `["error", { "argsIgnorePattern": "^_" }]` | ยอม `_` prefix เป็นข้อยกเว้น |
| `no-process-env` | `error` (override **off** ใน `src/config/**`) | ENV access ผ่าน config layer เท่านั้น |
| `no-sync` | `error` | forbid sync I/O (block event loop) |
| `no-await-in-loop` | `warn` | hint ใช้ `Promise.all` ถ้าเหมาะสม |
| `require-await` | `error` | กัน `async` function ที่ไม่มี `await` |
| `import/no-cycle` | `error` | กัน circular dep |
| `no-console` | `error` | ยกเว้น test/dev (ดูรายละเอียดด้านล่าง) |

**`no-console` by environment:**
- production / default: **`error`** (ใช้ pino แทน)
- development: `off` หรือ `warn`
- test glob (`**/*.test.js`): `off`

### 3.3 Security rules (`eslint-plugin-security`)

**เปิด (4 rules):**
- `security/detect-eval-with-expression`: กัน `eval()` รับ input dynamic
- `security/detect-buffer-noassert`: กัน `Buffer` read ไม่เช็ค bounds
- `security/detect-unsafe-regex`: กัน ReDoS
- `security/detect-child-process`: audit `child_process`

**ปิด** (false-positive ถี่เกินคุ้ม):
- `security/detect-object-injection`
- `security/detect-non-literal-fs-filename`

### 3.4 Test file override (`**/*.test.js`)

| Rule | Setting |
| :--- | :--- |
| `no-console` | `off` |
| `no-magic-numbers` | `off` |
| `max-nested-callbacks` | `off` |
| extend | `eslint-plugin-jest` → `flat/recommended` |

### 3.5 Boundary enforcement (`eslint-plugin-boundaries`)

ประกาศ elements ให้ match **Module layers** (ดู [Runtime → Module layers](./runtime.md#32-module-layers-srcmodulesfeature)):

| Element type | File pattern |
| :--- | :--- |
| `route` | `src/modules/*/*.route.js` |
| `controller` | `src/modules/*/*.controller.js` |
| `validator` | `src/modules/*/*.validator.js` |
| `service` | `src/modules/*/*.service.js` |
| `repository` | `src/modules/*/*.repository.js` |
| `adapter` | `src/adapters/**` |
| `middleware` | `src/middlewares/**` |
| `config` | `src/config/**` |
| `util` | `src/utils/**` |

**Allowed targets** (match [Layer call graph](./runtime.md#33-layer-call-graph)):

| From | Allowed targets |
| :--- | :--- |
| `route` | `controller`, `middleware` |
| `controller` | `validator`, `service` |
| `validator` | `util`, `config` |
| `service` | `service` (cross-module OK), `repository` **(same module เท่านั้น)**, `adapter`, `util`, `config` |
| `repository` | `util`, `config` (**ห้าม** `service`, `adapter`) |
| `middleware` | `service`, `util`, `config` |

- `boundaries/element-types` ตั้งเป็น **`error`**
- Cross-module `repository` access ใช้ `boundaries/external` หรือ custom `import/no-restricted-paths` ร่วมด้วย

---

## 4. Formatting

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `prettier` | `^3.8.3` | formatter |

### 4.1 `.prettierrc`

| Option | Value |
| :--- | :--- |
| `singleQuote` | `true` |
| `semi` | `true` |
| `tabWidth` | `2` |
| `trailingComma` | `"all"` |
| `printWidth` | `100` |
| `bracketSpacing` | `true` |
| `arrowParens` | `"always"` |
| `endOfLine` | `"lf"` |

### 4.2 `.prettierignore` (required entries)

- `node_modules/`
- `coverage/`
- `dist/` / `build/`
- `package-lock.json`

### 4.3 `.editorconfig` (required)

สำหรับ editor ที่ไม่มี Prettier plugin:

```ini
root = true

[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

---

## 5. Git Hooks & CI Gates

| Package | Version | Purpose |
| :--- | :--- | :--- |
| `husky` | `^9.1.7` | Git hooks |
| `lint-staged` | `^15.2.11` | run lint เฉพาะไฟล์ที่ stage |

### 5.1 Pre-commit [Required]

- **husky** init; hook `.husky/pre-commit` เรียก **`npx lint-staged`**
- **lint-staged** config (ใน `package.json` หรือ `.lintstagedrc.json`):

```json
{ "*.js": ["eslint --fix", "prettier --write"] }
```

### 5.2 CI gate [Required]

เมื่อ repo มี **automated CI** (เช่น GitHub Actions) ต้องรวมขั้นตอนด้านล่างและถือเป็น merge gate; ถ้ายังไม่มี pipeline ให้ถือเป็นงานที่ต้องเปิด — เมื่อเปิดแล้วต้องครบตามนี้

| Step | Script | Policy |
| :--- | :--- | :--- |
| 1 | `npm run lint` | **block merge** เมื่อ fail |
| 2 | `npm run format:check` | **block merge** เมื่อ fail |
| 3 | `npm run spec:lint` | **block merge** เมื่อ fail (ดู [API → OpenAPI → Drift prevention](./api.md#drift-prevention-ci-gate)) |
| 4 | `npm run test` | **block merge** เมื่อ fail |
| 5 | `npm run audit:check` | **block merge** เมื่อพบ high / critical (ดู [Ops → Security SLA](./ops.md#21-security-sla)) |

ดู aggregate `ci` script ใน [Runtime → CI pipeline ordering](./runtime.md#45-ci-pipeline-ordering)
