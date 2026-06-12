# API Gateway — System Design (Production SoT)

## Metadata

| Field                | Value                                                                                                                                                                                                                                                                                                                                                  |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Filename**         | `docs/architecture.md`                                                                                                                                                                                                                                                                                                                                 |
| **Document index**   | [README.md](../README.md) — document map, scripts, local routing                                                                                                                                                                                                                                                                                       |
| **Status**           | Active — SoT ระดับ production ของ `gateway` (API Gateway)                                                                                                                                                                                                                                                                                              |
| **Companion docs**   | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (ADR / ภาพรวม), [`auth` production SoT](../../auth/docs/architecture.md) (JWT issuer + Redis `token_gen` publish), [implementation checklist](./session-revoke-token-gen-changes.md) (D3 — implemented), [`local-ports.md`](../../local-ports.md) (dev ports), [ADR 001](./adrs/001-gateway-esm-fastify.md) |
| **OpenAPI**          | [`openapi.yaml`](../openapi.yaml) — edge contract + health (`npm run spec:lint`); normative `/auth/*` ชี้ [`auth/openapi.yaml`](../../auth/openapi.yaml)                                                                                                                                                                                               |
| **Scope**            | เอกสารนี้ **ไม่** แทน `auth` — login/refresh/JWKS อยู่ที่ [`auth` SoT](../../auth/docs/architecture.md); `gateway` ทำ verify JWT, optional `token_gen` gate, inject headers, proxy เท่านั้น                                                                                                                                                            |
| **Package version**  | `0.2.4`                                                                                                                                                                                                                                                                                                                                                |
| **Document version** | `1.5.0`                                                                                                                                                                                                                                                                                                                                                |
| **Terms**            | **ต้อง (MUST)** = บังคับ production · **ควร (SHOULD)** = default ยกเว้นมี ADR · **อาจ (MAY)** = optional                                                                                                                                                                                                                                               |

> **การเปลี่ยนแปลง:** หากแก้ **section 4 (headers), section 5 (env), section 7 (errors), section 8 (internal), sections 11–12 (decisions)** → ต้องมี **code review** + **bump เวอร์ชันเอกสาร** (อย่างน้อย minor) + อัปเดต `CHANGELOG.md` เมื่อ repo มีไฟล์นี้

---

## Contents

สแกนตามเลขหมวดได้เลย — ใน VS Code / Cursor ใช้ outline หรือค้นหา `## N.`

| #      | Section                                    |
| ------ | ------------------------------------------ |
| **1**  | Goals & non-goals                          |
| **2**  | Logical architecture                       |
| **3**  | Gateway (Fastify) — โครงสร้างและ lifecycle |
| **4**  | สัญญา header (contract)                    |
| **5**  | Configuration (environment)                |
| **6**  | Routing config                             |
| **7**  | Error & status behavior                    |
| **8**  | Internal service                           |
| **9**  | Observability & operations                 |
| **10** | Deployment & production checklist          |
| **11** | Architecture decisions                     |
| **12** | Operational baseline                       |
| **13** | Security                                   |
| **14** | CI/CD & quality gates                      |
| **15** | Release & document versioning              |
| **16** | References                                 |

---

## 1. Goals & non-goals

### 1.1 Goals (production)

- Client **ต้อง** ยืนยันตัวตนด้วย JWT ที่ **API Gateway เท่านั้น** — internal **ต้องไม่** verify JWT ซ้ำ
- Gateway **ต้อง** inject user context + `x-gateway-secret` แล้ว **proxy** ไปยัง upstream ตาม route จาก config เท่านั้น
- Internal **ต้อง** ตรวจ gateway secret ก่อนทำ authorization และ business logic

### 1.2 Non-goals

- ไม่รวม user management / **การออก (issuance) JWT** — อยู่ที่ **IdP ภายนอก** หรือ **[`auth`](../../auth/docs/architecture.md)** แยกต่างหาก
- ไม่กำหนด schema ธุรกิจของแต่ละ internal service
- mTLS ระหว่าง gateway ↔ internal ยัง **ไม่** อยู่ใน baseline; current design **ต้อง** วิ่งบน private network + TLS ตาม `ARCHITECTURE.md` section 4
- ไม่ใช้ TypeScript — รันเป็น **JavaScript ESM** เท่านั้น

---

## 2. Logical architecture

| Layer           | บทบาทหลัก                                                                         |
| --------------- | --------------------------------------------------------------------------------- |
| **Client**      | `Authorization: Bearer <JWT>` ไป gateway เท่านั้น — **ห้าม** ส่ง `GATEWAY_SECRET` |
| **API Gateway** | TLS (prod), verify JWT, inject headers, proxy, timeout, errors, observability     |
| **Internal**    | Validate secret, RBAC จาก role, domain logic — **ต้องไม่** เปิด public โดยตรง     |

**หลาย upstream:** ตาราง route แบบ **`prefix` เท่านั้น** (section 6) จะชี้ไป base URL + optional rewrite — header หลัง inject **ควร** เหมือนกันทุก upstream เว้นแต่ ADR กำหนดเป็นอย่างอื่น

---

## 3. Gateway (Fastify) — โครงสร้างและ lifecycle

### 3.1 ภาษาและโมดูล

- **ต้อง:** JavaScript **ESM** (`import` / `export`), `"type": "module"`, ไฟล์ **`.js`**
- **ต้องไม่:** TypeScript
- Service อื่นของทีมอาจเป็น CJS — `gateway` นี้เป็น **ข้อยกเว้น**

### 3.2 โครงสร้างไฟล์ (อ้างอิง)

```text
gateway/
  package.json              # "type": "module"; engines; scripts
  CHANGELOG.md              # กระทบ consumer / deploy
  src/
    app.js                  # Fastify + plugins + graceful shutdown
    config/
      env.js                # โหลด + validate — fail-fast
      routes.js             # ตาราง proxy
    plugins/
      jwt-auth.js
      inject-context.js
    proxy/
      register-proxies.js
    lib/
      errors.js
```

### 3.3 ลำดับ register

1. Logger + **global error handler**
2. `@fastify/jwt` (หรือชุด verify) จาก config ที่ validate แล้ว
3. **preHandler** (route ที่ต้องมี user): verify JWT
4. **preHandler** (proxy): inject headers ตาม section 4
5. `@fastify/http-proxy` ต่อ route

### 3.4 พฤติกรรม production

| Topic                    | Requirement                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| **Startup**              | Validate env + routes ก่อน listen — ถ้าไม่ผ่านให้ exit code ≠ 0                                                              |
| **Shutdown**             | **Graceful shutdown** (`SIGTERM` / `SIGINT`): หยุดรับ request ใหม่, รอ request ค้างให้จบภายใน deadline, แล้วค่อยปิด upstream |
| **Authorization header** | **ต้องไม่** forward ไป upstream — section 11.2                                                                               |
| **Body / timeout**       | **ต้อง** ตั้ง `bodyLimit` + upstream timeout — section 5 + `ARCHITECTURE.md`                                                 |
| **Correlation**          | **ควร** สร้างหรือส่งต่อ `x-request-id` ไปยัง upstream — ดู section 4                                                         |
| **ESM**                  | **ต้อง** `import.meta.url` + `fileURLToPath` แทน `__dirname`                                                                 |
| **Lint**                 | **ต้อง** ESLint ใน CI — `_engineering-standards/active/backend/code/`                                                        |

### 3.5 Testing (Jest + ESM)

- **ต้อง:** **Jest** สำหรับ unit/integration ของ `gateway` นี้
- **ต้อง:** `NODE_OPTIONS=--experimental-vm-modules` ใน `test` / `test:unit` และ **CI**
- **ควร:** `jest.config.cjs` หรือ `jest.config.mjs` เมื่อ `"type": "module"`
- **ควร:** pattern `*.test.js` / `__tests__/` ตามมาตรฐานทีม

---

## 4. สัญญา header (contract) — normative

ชื่อ header ด้านล่างถือเป็น **canonical** — **ต้อง** ใช้ constant ชุดเดียวกันใน gateway และ package กลางฝั่ง internal (ถ้ามี)

| Header               | ตั้งโดย          | อ่านโดย       | ข้อกำหนด                                                                                                                                                   |
| -------------------- | ---------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `x-gateway-secret`   | Gateway          | ทุก service   | constant-time compare · **ห้าม** log                                                                                                                       |
| `x-user-id`          | Gateway          | identity      | จาก `JWT_CLAIM_USER_ID` · ASCII printable **ควร** · ≤ **128** chars — เกินหรือไม่ผ่าน validation ที่ขอบ gateway → **`401`** + **`GATEWAY_CLAIM_REJECTED`** |
| `x-user-ou`          | Gateway          | tenant        | จาก `JWT_CLAIM_OU` · รหัสองค์กรของผู้ใช้ — **ต้อง** non-empty หลัง normalize ที่ขอบ gateway มิฉะนั้น **`401`** + **`GATEWAY_CLAIM_REJECTED`**              |
| `x-user-branch`      | Gateway          | tenant        | จาก `JWT_CLAIM_BRANCH` · รหัสสาขาของผู้ใช้ — **ต้อง** non-empty หลัง normalize ที่ขอบ gateway มิฉะนั้น **`401`** + **`GATEWAY_CLAIM_REJECTED`**            |
| `x-user-role`        | Gateway          | RBAC          | section 12.2                                                                                                                                               |
| `x-user-permissions` | Gateway          | authorization | จากเคลม `permissions` · รายการสิทธิ์ดิบของผู้ใช้ (comma-separated, exact/wildcard ไม่ expand) — ต้องมีรูปแบบถูกต้อง (ห้ามมี Comma, Whitespace หรือสตริงว่างในสมาชิก) มิฉะนั้น **`401`** + **`GATEWAY_CLAIM_REJECTED`** |
| `x-request-id`       | Gateway / client | logs, trace   | **ควร** ทุก request · client ไม่ส่ง → gateway **ควร** สร้าง UUID                                                                                           |

**JWT → claim mapping**

- **ต้อง** กำหนดผ่าน `JWT_CLAIM_USER_ID`, `JWT_CLAIM_ROLE`, `JWT_CLAIM_OU`, `JWT_CLAIM_BRANCH` (section 5)
- ถ้า production ไม่ตั้งค่า → **ต้อง** ตรงกับ default ใน `.env.example` และเอกสารนี้
- producer ของ JWT **ควร** รับประกันว่า claim ที่แมปไป `x-user-id` เป็น ASCII printable และยาวไม่เกิน **128** ตัวอักษร เพื่อไม่ให้ gateway ปฏิเสธด้วย `401`

**Strip / override**

- gateway **ต้อง** strip หรือ override `x-user-*` จาก client ก่อน inject ค่าใหม่

---

## 5. Configuration (environment)

ค่าจริง **ห้าม** commit — ให้ใช้ secret manager / CI ตามนโยบาย

| Variable                | Prod           | Description                                                                                                                                                                                 |
| ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | Yes            | พอร์ต HTTP                                                                                                                                                                                  |
| `JWT_JWKS_URL`          | Yes            | เอกสารนี้ล็อกให้ใช้ asymmetric + JWKS เท่านั้น (section 11.3) — URL **ต้อง** ตรงกับ JWKS ของ `auth`                                                                                         |
| `JWT_ISSUER`            | Recommended    | ถ้าตั้ง → **ต้อง** ตรวจ `iss`                                                                                                                                                               |
| `JWT_AUDIENCE`          | Recommended    | ถ้าตั้ง → **ต้อง** ตรวจ `aud`                                                                                                                                                               |
| `JWT_CLAIM_USER_ID`     | Recommended    | default **`sub`**                                                                                                                                                                           |
| `JWT_CLAIM_ROLE`        | Recommended    | default ชัดใน `.env.example` เช่น `role`                                                                                                                                                    |
| `GATEWAY_SECRET`        | Yes            | inject `x-gateway-secret` · **ควร** ≥ 32 octets random                                                                                                                                      |
| `UPSTREAM_TIMEOUT_MS`   | Yes            | upstream timeout (ms)                                                                                                                                                                       |
| `ROUTES_JSON` หรือ path | Yes            | section 6                                                                                                                                                                                   |
| `TRUST_PROXY`           | Recommended    | `true` หลัง LB — section 12.6                                                                                                                                                               |
| `MAX_BODY_BYTES`        | Recommended    | default **1048576** (1 MiB) — section 12.5                                                                                                                                                  |
| `JWT_LEEWAY_SECONDS`    | Optional       | default **60** — section 12.3                                                                                                                                                               |
| `REDIS_URL`             | **Yes (prod)** | **ต้อง** ตั้งใน production (`NODE_ENV=production`) — หลัง JWKS verify **ต้อง** เทียบ claim **`token_gen`** กับ Redis `user:{sub}:token_gen` (สัญญา auth D1) — section 11.5 · dev/CI ว่างได้ |
| `CORS_ORIGINS`          | Optional       | เมื่อเปิด CORS — section 12.4                                                                                                                                                               |
| `SHUTDOWN_TIMEOUT_MS`   | Optional       | graceful deadline เช่น **10000**                                                                                                                                                            |
| `LOG_LEVEL`             | Recommended    | `info` / `warn` / `error`                                                                                                                                                                   |

**`env.js`**

- **ต้อง** reject ชุดค่าที่ขัดกับ section 5 / section 11 เช่น ไม่มี `JWT_JWKS_URL` หรือยังตั้ง `JWT_SECRET` ใน current design นี้

---

## 6. Routing config

**Schema ตัวอย่าง**

```json
[
  {
    "prefix": "/api/orders",
    "upstream": "http://orders-svc:3001",
    "stripPrefix": true
  },
  {
    "prefix": "/api/users",
    "upstream": "http://users-svc:3000",
    "stripPrefix": true
  }
]
```

| Topic             | Rule                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------- |
| **`stripPrefix`** | **ต้อง** ตกลงกับ upstream ว่า path ที่เห็นคืออะไร                                            |
| **URL**           | upstream **ต้อง** มาจาก config เท่านั้น                                                      |
| **Host-based**    | MVP ใช้ **`prefix`** เท่านั้น; ถ้าจะเพิ่ม `host` → ต้องอัปเดต schema + โค้ด + เวอร์ชันเอกสาร |

---

## 7. Error & status behavior — normative

| Scenario                                                                                                                                                                    | HTTP                               | Layer                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| JWT หมดอายุ / ลายเซ็นผิด / ไม่มี Bearer / ไม่มีหรือ stale **`token_gen`** (เมื่อ `REDIS_URL` ตั้ง) / Redis read ล้มเหลว (fail-closed)                                       | `401`                              | gateway — **`application/problem+json`** + `code` (`GATEWAY_JWT_*`) ตาม `_coding-standards/gateway/codes.yaml`                                                                                                                                                                                                                                        |
| claim/header ไม่พร้อม หรือเกินความยาว (section 4, section 12.2)                                                                                                             | `401`                              | gateway — **`application/problem+json`** + `code` **`GATEWAY_CLAIM_REJECTED`** (authentication failure — [`model-matrix.md`](../../../../model-matrix.md))                                                                                                                                                                                            |
| Path ไม่ match **ตาราง route ที่ deploy** (client ยิง URL ผิด / ไม่มี resource ที่ gateway รู้จัก)                                                                          | `404`                              | gateway — ตอบ **`application/problem+json`** + `code` **`GATEWAY_ROUTE_NOT_FOUND`** พร้อม header `x-gateway-hit: true` (แนว **Approach A** — แยกจาก `GATEWAY_ROUTE_NOT_CONFIGURED`)                                                                                                                                                                   |
| **Routing misconfiguration** ระดับ operator (เช่น deploy ผิด ทำให้ path ที่ **ควร** มี upstream กลับไม่มี / upstream ว่างหลัง validate ตาม SoT — ไม่ใช่แค่ client พิมพ์ผิด) | `502`                              | gateway — **`application/problem+json`** + `code` **`GATEWAY_ROUTE_NOT_CONFIGURED`** — **หมายเหตุ:** ใน implementation ปัจจุบัน ข้อผิดพลาดชุด route / env หลักถูก **fail-fast ตอน startup** (process exit) จึงไม่ค่อยส่ง HTTP response นี้ให้ client; รหัสยังอยู่ใน registry สำหรับ path ระหว่างรัน (เช่น hot reload / ตรวจซ้ำหลัง boot) หากมีในอนาคต |
| upstream connection/DNS/incomplete                                                                                                                                          | `502`                              | gateway — **`application/problem+json`** + `code` **`GATEWAY_UPSTREAM_UNAVAILABLE`**                                                                                                                                                                                                                                                                  |
| upstream ช้าเกิน `UPSTREAM_TIMEOUT_MS`                                                                                                                                      | `504`                              | gateway — **`application/problem+json`** + `code` **`GATEWAY_UPSTREAM_TIMEOUT`**                                                                                                                                                                                                                                                                      |
| upstream ตอบ HTTP **5xx** ครบ response                                                                                                                                      | **passthrough** ทั้ง body + status | section 12.9                                                                                                                                                                                                                                                                                                                                          |
| readiness (เช่น JWKS ไม่ถึง)                                                                                                                                                | `503`                              | gateway — **`application/problem+json`** + `code` **`GATEWAY_NOT_READY`**                                                                                                                                                                                                                                                                             |

---

## 8. Internal service — normative

1. **ต้อง:** ให้ middleware แรกตรวจ `x-gateway-secret` (constant-time compare กับ env)
2. **ต้อง:** ถ้าไม่ผ่าน → **`403 Forbidden`** (ไม่ใช้ `401` — section 12.9)
3. **ต้อง:** ทำ authorization จาก `x-user-role` ก่อนเข้า business logic ที่ต้องใช้สิทธิ์
4. **ต้อง:** รับ inbound เฉพาะจากเครือข่าย trust — ดู `ARCHITECTURE.md`

**ควร:** มี package กลางสำหรับ middleware ที่ใช้ร่วมกัน

---

## 9. Observability & operations — production

| Topic               | Rule                                                                                                                                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Logs**            | structured (**ควร** JSON) · **ห้าม** JWT, `Authorization`, `x-gateway-secret` · **ควร** `x-request-id`, route, upstream, `duration_ms`, status                                                                                                                                   |
| **Log level**       | **ต้อง** `LOG_LEVEL` ใน production                                                                                                                                                                                                                                               |
| **Metrics**         | **ควร** ใช้ Prometheus บน **internal interface** เท่านั้น — ไม่เปิด public โดยไม่มี auth (section 12.1)                                                                                                                                                                          |
| **Metrics ขั้นต่ำ** | rate `400`/`401`/`502`/`504` + upstream status ต่อ route + latency                                                                                                                                                                                                               |
| **Health**          | **`GET /healthz`** — liveness; **ต้องไม่** บังคับ JWT                                                                                                                                                                                                                            |
| **Ready**           | **`GET /readyz`** — readiness (อย่างน้อยตรวจ **`JWT_JWKS_URL`**); เมื่อ **`REDIS_URL`** ตั้ง → **ต้อง** `PING` Redis ด้วย · **ต้องไม่** บังคับ JWT · ฟิลด์ `dependencies.routes: ok` หมายถึง **ตาราง route โหลดและ validate ผ่านตอน boot** ไม่ใช่การ probe TCP ไปยังทุก upstream |

---

## 10. Deployment & production checklist

- [ ] **TLS** ที่ขอบ public (gateway หรือ LB)
- [ ] **Internal** ไม่รับ traffic จาก internet โดยตรง และรับจาก private network ของ gateway เท่านั้น
- [ ] **Firewall / SG** — inbound upstream เฉพาะ gateway
- [ ] **TLS** ระหว่าง gateway ↔ internal ตาม baseline ใน `ARCHITECTURE.md`
- [ ] **`GATEWAY_SECRET`** จาก secret manager + แผน **rotation** (`ARCHITECTURE.md` section 4)
- [ ] **`TRUST_PROXY`** ตรงสภาพจริงหลัง LB
- [ ] **Timeout / `MAX_BODY_BYTES`** สอดคล้องกับ SLO (**ควร** review เป็นระยะ)
- [ ] **Error mapping** section 7 + section 12.9
- [ ] **Graceful shutdown** ทดสอบใน staging
- [ ] **Rollback / handover** — **ควร** `_engineering-standards/active/deployment/`
- [ ] **`REDIS_URL`** ตั้งและตรงกับ auth (shared Redis สำหรับ `user:{sub}:token_gen`) — **ต้อง** ใน production
- [ ] **Rollout `token_gen`:** auth ออก JWT พร้อม claim + publish หลัง revoke ก่อนเปิด traffic ผ่าน gateway ที่ enforce gate

---

## 11. Architecture decisions — locked

| ID        | Decision                 | Value                                                                                                                                                                                                                                                                                                         |
| --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **11.1**  | Secret ต่อ upstream      | ใช้ **หนึ่งค่า** ร่วมกันทุก upstream (เปลี่ยนได้ด้วย ADR + bump doc)                                                                                                                                                                                                                                          |
| **11.2**  | Forward `Authorization`  | **ไม่ forward**                                                                                                                                                                                                                                                                                               |
| **11.3**  | JWT                      | เอกสารนี้ใช้เฉพาะ **(B) asymmetric + JWKS** ผ่าน `JWT_JWKS_URL`; **ไม่ใช้** `(A) JWT_SECRET / HS256` ใน doc set นี้                                                                                                                                                                                           |
| **11.3b** | JWKS                     | **ต้อง** key rotation (cache + refresh เมื่อ `kid` ไม่รู้จัก)                                                                                                                                                                                                                                                 |
| **11.5**  | `token_gen` (access JWT) | หลัง verify JWKS: access JWT **ต้อง** มี claim **`token_gen`** (integer ≥ 0) · **production ต้องมี `REDIS_URL`** → อ่าน `user:{sub}:token_gen` จาก Redis (สัญญา auth D1) · ถ้า JWT `token_gen` **<** ค่าปัจจุบัน → **`401`** + **`GATEWAY_JWT_REJECTED`** · key ไม่มี → **0** · Redis error → **fail-closed** |
| **11.4**  | Tests                    | Jest + ESM — section 3.5                                                                                                                                                                                                                                                                                      |

---

## 12. Operational baseline — locked defaults

ข้อในหมวดนี้คือ default สำหรับ production จนกว่าจะมี ADR เปลี่ยน

| ID       | Topic         | Value                                                                                                                                                                     |
| -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **12.1** | ไม่บังคับ JWT | เฉพาะ **`GET /healthz`** และ **`GET /readyz`** — **ไม่** ผ่าน JWT middleware · ส่วน proxy **ต้อง** ผ่าน JWT                                                               |
| **12.2** | `x-user-role` | string เดียวหรือ comma หลัง trim · max **256** — เกินหรือ claim ไม่ผ่าน validation ที่ inject context → **`401`** + **`GATEWAY_CLAIM_REJECTED`** (สอดคล้อง section 7)     |
| **12.3** | JWT leeway    | default **60** s (`JWT_LEEWAY_SECONDS`) · มี `nbf` → **ต้อง** ตรวจ + leeway                                                                                               |
| **12.4** | CORS          | default **ปิด** · browser → ADR + `CORS_ORIGINS`                                                                                                                          |
| **12.5** | Transport     | `gateway` → internal **ต้อง** ใช้ private network + TLS · WS/SSE **นอก spec** · body default **1 MiB**                                                                    |
| **12.6** | Trust proxy   | `TRUST_PROXY=true` → `trustProxy: true` · forward `x-request-id`, `X-Forwarded-*` ถ้ามี — **ห้าม** ใช้แทนการยืนยันตัวตน                                                   |
| **12.7** | Node          | `"node": ">=24 <25"` ใน `package.json` + CI (สอดคล้อง `_coding-standards/gateway/runtime.md`)                                                                             |
| **12.8** | Error body    | ข้อผิดพลาดขอบ gateway (JWT / claim / upstream ที่ gateway map) → **RFC 7807** `application/problem+json` + optional **`code`** ตาม `_coding-standards/gateway/codes.yaml` |
| **12.9** | 5xx / secret  | upstream HTTP 5xx ครบ → **passthrough** · secret ผิดที่ internal → **`403` เท่านั้น**                                                                                     |

### Bootstrap (แนะนำ)

เริ่มจากหนึ่ง upstream + หนึ่ง prefix + **`/healthz`** / **`/readyz`** ที่ไม่ต้องใช้ JWT

---

## 13. Security — production requirements

| Topic            | Rule                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ |
| Secrets          | **ห้าม** อยู่ใน repo · **ต้อง** มาจาก env ของระบบที่ approved                                                      |
| Dependencies     | **ต้อง** `npm audit` หรือ `audit:check` ใน CI                                                                      |
| Rate limit       | **ควร** ที่ขอบ gateway เมื่อ public client — `_engineering-standards/.../api-rate-limit-standard.md` + trust proxy |
| Response headers | **ควร** ใส่ `X-Content-Type-Options: nosniff` บน response ที่ gateway สร้างเอง                                     |

---

## 14. CI/CD & quality gates

| Gate           | Rule                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PR             | **ต้อง** lint + unit tests + **`npm run spec:lint`** (Spectral บน `openapi.yaml` ที่ root แพ็กเกจ) — รวมอยู่ใน **`npm run ci`** ของแพ็กเกจ |
| Main / release | **ควร** มี integration tests (proxy + JWT)                                                                                                 |
| Node           | **ต้อง** ตรง `engines`                                                                                                                     |
| Docs           | แก้ contract / env / error → **ต้อง** อัปเดตเอกสารนี้ + `CHANGELOG.md`                                                                     |

---

## 15. Release & document versioning

- **ต้อง:** ใช้ SemVer บน **artifact** (tag / image)
- **ต้อง:** bump **เวอร์ชันเอกสาร** (metadata ด้านบน) เมื่อมี normative breaking change ต่อ implementer / internal consumers
- **ควร:** มี release note ควบคู่กับ `_engineering-standards/active/deployment/release-handover-template.md`

---

## 16. References — workspace

| Path                                                                           | Notes                                                           |
| :----------------------------------------------------------------------------- | :-------------------------------------------------------------- |
| [README.md](../README.md)                                                      | Document map — entry point                                      |
| [`session-revoke-token-gen-changes.md`](./session-revoke-token-gen-changes.md) | D3 `token_gen` + Redis checklist (implemented)                  |
| [`openapi.yaml`](../openapi.yaml)                                              | HTTP contract (Spectral)                                        |
| [`local-ports.md`](../../local-ports.md)                                       | Local dev port index                                            |
| [`auth` SoT](../../auth/docs/architecture.md)                                  | ออก access/refresh JWT — Gateway verify เท่านั้น                |
| [`ARCHITECTURE.md`](../../ARCHITECTURE.md)                                     | Trust boundary, monorepo overview                               |
| [`_coding-standards/gateway`](../../../../_coding-standards/gateway/README.md) | Org gateway edge standard                                       |
| `_engineering-standards/active/backend/architecture/architecture-standard.md`  | ทีม = Express — `gateway` นี้เป็น exception (`ARCHITECTURE.md`) |
| `_engineering-standards/active/backend/api/api-rate-limit-standard.md`         | trust proxy, rate limit                                         |
| `_engineering-standards/active/backend/code/`                                  | ESLint, security rules                                          |
| `_engineering-standards/active/deployment/`                                    | rollback, handover                                              |

_หมายเหตุ:_ path ที่ขึ้นต้นด้วย `_engineering-standards/` ชี้มาตรฐานทีมที่อาจอยู่ **นอก** monorepo นี้ — ใช้เป็น reference เชิงข้อความ

---

_Document version **1.5.0** — add x-user-permissions to header contract; Phase G implemented._
