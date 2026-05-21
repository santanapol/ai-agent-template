# auth — System Design (Production SoT)

## Metadata

| Field | Value |
| :--- | :--- |
| **Filename** | `docs/architecture.md` |
| **Document index** | [README.md](../README.md) |
| **Status** | Active — SoT ของ `auth` (login, refresh, และ JWT issuance แบบ self-hosted IdP) |
| **Companion docs** | [`ARCHITECTURE.md`](../../ARCHITECTURE.md) (ADR / ภาพรวม), [`gateway` production SoT](../../gateway/docs/architecture.md) (`gateway` verify + `token_gen`), [implementation checklist](./session-revoke-token-gen-changes.md) (O-16 / D1 — implemented) |
| **OpenAPI** | [`openapi.yaml`](../openapi.yaml) — **SoT เดียว** สำหรับสัญญา HTTP (`npm run spec:lint`, `npm run spec:codes`) — คำอธิบาย normative เพิ่มเติมอยู่ใน section **4–5** ของเอกสารนี้ |
| **Scope** | เอกสารนี้ **ไม่** แทน `gateway` — client รับ JWT จาก service นี้ แล้วค่อยเรียก `gateway` ตาม [`docs/architecture.md`](../../gateway/docs/architecture.md) ของ `gateway` |
| **Package version** | `0.1.6` |
| **Document version** | `1.4.1` |

---

## วิธีอ่านเอกสารนี้ (ลำดับขั้นแนะนำ)

แนะนำให้อ่านตาม **A → F** ในรอบแรก เพื่อเห็นภาพรวมก่อนลงรายละเอียดเชิง normative — หมายเลข section **1–13** เรียงตามลำดับในไฟล์ และใช้อ้างอิงใน checklist / PR ได้คงที่

| Step | Read | Outcome |
| :---: | :--- | :--- |
| **A — บริบท** | **1** → **2** → **3** | ใครทำอะไร → ภาพรวม flow → เป้าหมาย / non-goals |
| **B — สัญญา** | **4** → **5** | HTTP API + รูปแบบตอบ/ผิดพลาด + JWT / JWKS คู่ Gateway |
| **C — โครง service** | **6** | Runtime, Fastify+ESM, โครงสร้างโฟลเดอร์ |
| **D — ปลอดภัย + ข้อมูล** | **7** → **8** | Security, throttle, MongoDB (**8.3** persistence index) |
| **E — รันระบบ** | **9** → **10** → **11** | env, health, audit, CI/CD |
| **F — ดัชนีการตัดสินใจ** | **12** → **13** | O-01–O-16 ที่ล็อกแล้ว + เอกสารอ้างอิงหลัก |

**TL;DR:** `auth` ออก **access JWT + refresh token** → client เรียก `gateway` ด้วย Bearer access → refresh ทำที่ `auth` เท่านั้น (`gateway` ไม่รับผิดชอบ refresh)

---

## Contents

1. [Business SoT index](#business-sot-index)
2. [บทบาทในระบบ](#1-บทบาทในระบบ)
3. [End-to-end flow](#2-end-to-end-flow)
4. [Goals & non-goals](#3-goals--non-goals)
5. [API surface (normative)](#4-api-surface-normative)
6. [JWT contract (สอดคล้อง gateway)](#5-jwt-contract-สอดคล้อง-gateway)
7. [Stack & โครงสร้างแนะนำ](#6-stack--โครงสร้างแนะนำ)
8. [Security (production)](#7-security-production)
9. [ข้อมูล & token storage](#8-ข้อมูล--token-storage)
10. [Configuration (environment)](#9-configuration-environment)
11. [Observability & operations](#10-observability--operations)
12. [CI/CD & deployment](#11-ci-cd--deployment)
13. [Locked decisions (checklist)](#12-locked-decisions-checklist)
14. [References](#13-references)

---

## Business SoT index

| Topic | [`domain.md`](./domain.md) |
| :--- | :--- |
| MVP scope | [§1](./domain.md#1-role-and-scope-mvp) |
| HTTP intent | [§5](./domain.md#5-http-operations-intent--before-openapi) |
| Sequences | [§6](./domain.md#6-main-flows-sequence) |
| RBAC | [§7](./domain.md#7-rbac-product) |

---

> **ขั้น A — บริบท:** บทบาท → flow → เป้าหมาย

## 1. บทบาทในระบบ

| Layer | Responsibility |
| :--- | :--- |
| **`auth`** | รับ credential, ตรวจสอบ user, **ออก access JWT** และ **refresh token** (ล็อก O-02) รวมถึงทำ revoke / rotation ตาม section 8 |
| **`gateway`** (SoT: [`docs/architecture.md`](../../gateway/docs/architecture.md)) | **ไม่** ทำ login — ทำหน้าที่ **verify** access JWT แล้ว inject headers ไปยัง upstream |

---

## 2. End-to-end flow

```mermaid
sequenceDiagram
  autonumber
  participant C as Client
  participant L as auth
  participant G as gateway
  participant I as Internal API

  C->>+L: HTTPS POST /auth/login (credential)
  L->>L: Verify user, issue tokens
  L-->>-C: access JWT + refresh (channel ตาม O-04)

  C->>+G: HTTPS + Authorization Bearer access JWT
  G->>G: Verify JWT, inject headers + gateway secret
  G->>+I: Proxy (private)
  I->>I: Validate gateway secret, RBAC
  I-->>-G: Response
  G-->>-C: Response

  rect rgb(230, 240, 255)
    Note over C,L: Refresh ทำที่ auth เท่านั้น (O-02); rotation ตาม O-13
    C->>+L: HTTPS POST /auth/refresh (refresh cookie หรือ body ตาม O-04)
    L->>L: Verify refresh hash, rotate, persist DB
    L-->>-C: access JWT ใหม่ + refresh ใหม่ / Set-Cookie ตาม channel
  end

  C->>+G: HTTPS + Authorization Bearer access JWT ใหม่
  G->>G: Verify JWT, inject headers + gateway secret
  G->>+I: Proxy (private)
  I->>I: Validate gateway secret, RBAC
  I-->>-G: Response
  G-->>-C: Response
```

**Refresh:** client ส่ง refresh ไปที่ **`auth`** เท่านั้น (ล็อก O-02) เพื่อแลก access JWT ใหม่ (rotation ตาม O-13) จากนั้นจึงนำ access token ชุดใหม่ไปเรียก `gateway` ต่อ (`gateway` **ไม่** รับผิดชอบ refresh)

---

## 3. Goals & non-goals

### 3.1 Goals

- **ต้อง** ยืนยันตัวตนผู้ใช้ด้วย **username + password** (MVP — ล็อกตาม O-01)
- **ต้อง** ออก **access JWT** ที่ Gateway ตรวจได้ โดย **algorithm + JWKS ต้องสอดคล้องกับ** [`gateway` SoT ส่วน 11.3](../../gateway/docs/architecture.md) — service นี้ล็อก **โหมด (B) asymmetric เท่านั้น (O-08)** และ **ห้าม** ใช้ shared symmetric secret แบบโหมด (A) HS256 สำหรับ access token ที่ Gateway verify
- **ต้อง** รองรับ **refresh token** และ `POST /auth/refresh` (ล็อก O-02) โดย access TTL เป็นไปตาม O-07 และ refresh TTL อ้างอิง section 9

### 3.2 Non-goals

- **ไม่** proxy ไปยัง business upstream (เป็นหน้าที่ Gateway)
- **ไม่** inject `x-gateway-secret` (เป็นหน้าที่ Gateway)
- **ไม่** ทำ authorization ระดับ resource ของ domain (ทำเฉพาะ identity + claim พื้นฐาน เช่น role)

---

> **ขั้น B — สัญญา API + JWT (normative):** ข้อตกลงที่ client และ Gateway ต้องใช้ร่วมกัน

## 4. API surface (normative)

สเปก HTTP แบบ machine-readable มี **ไฟล์เดียว** คือ [`openapi.yaml`](../openapi.yaml) ที่ root ของแพ็กเกจ — CI ใช้ **`spectral lint`** (`npm run spec:lint`) และ **`spec:codes`** อ่านไฟล์นี้ — เมื่อเปลี่ยน path / schema **ต้อง** อัปเดตให้สอดคล้องกับ section **4–5** ในเอกสารนี้

### 4.1 เส้นทางขั้นต่ำ (MVP)

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | รับ **username** + **password** (JSON body — ล็อกตาม O-01) แล้วตอบ access JWT + metadata ตาม O-05 |
| `POST` | `/auth/refresh` | **ต้อง** — รับ refresh ตาม O-04 แล้วตอบ access JWT ชุดใหม่ (rotation ตาม O-13) |
| `POST` | `/auth/logout` | **ต้อง** — revoke refresh ที่ส่งมา และ revoke **ทั้ง `family_id`** ที่เกี่ยวข้อง (ล็อก O-03) |

**ต้อง** ใช้ **HTTPS** ใน production; **ห้าม** รับ password ใน query string

### 4.2 Response shape (normative — ล็อก O-05)

**กรณีสำเร็จ (login / refresh):** response body เป็น JSON และ **ไม่** ใช้ envelope ชั้นนอก

| Field | Required | Description |
| :--- | :--- | :--- |
| `access_token` | Yes | string JWT สำหรับ `Authorization: Bearer` |
| `expires_in` | Yes | วินาทีจน access หมดอายุ (สอดคล้อง `ACCESS_TOKEN_TTL_SECONDS`) |
| `token_type` | Yes | ค่า **`Bearer`** |
| `refresh_token` | Conditional | ส่งใน body **เฉพาะ** client แบบ non-browser (mobile, CLI); **ห้าม** ส่ง field นี้เมื่อใช้ cookie เป็น channel หลักสำหรับ refresh |

**กรณีผิดพลาด (4xx/5xx):** **ต้อง** ใช้ **`application/problem+json`** (RFC 7807) อย่างน้อยฟิลด์ `type` (URI), `title`, `status` และ **ควร** มี `detail` ที่ไม่ทำให้ข้อมูลรั่ว (เช่น ไม่เปิดเผยว่า username มีอยู่หรือไม่ในกรณี login ผิด)

**Cookie (เมื่อใช้ refresh channel แบบ cookie — O-04):** **ต้อง** ตั้ง `HttpOnly`, `Secure`, **`SameSite=Lax`** (หรือ `Strict` ถ้า flow รองรับ), ใช้ชื่อ cookie แบบคงที่ใน implementation เช่น `refresh_token` และบันทึกไว้ใน runbook

### 4.3 Error HTTP

| Scenario | HTTP |
| :--- | :--- |
| credential ผิด (`POST /auth/login`) | `401 Unauthorized` |
| body ไม่ valid | `400 Bad Request` |
| rate limit ทั่วไป (middleware / global — `api-rate-limit-standard.md`) | **`429 Too Many Requests`** — `problem+json` **`type`** **ต้อง** เป็น URI ที่ทีมกำหนดสำหรับ **rate limit** และต้องต่างจากแถวถัดไป |
| **เฉพาะ IP** ถูก lock จาก **credential throttle** แบบ **`ip:<…>`** แต่บัญชียังไม่เข้าเงื่อนไข `423` (**ล็อก P4**) | **`429 Too Many Requests`** — `problem+json` **`type`** **ต้อง** เป็น URI ที่ทีมกำหนดสำหรับ **IP throttle / abuse** และต้องต่างจาก rate limit ทั่วไป — `detail` ต้องเป็นข้อความ generic (ห้ามบอกว่า username มีในระบบหรือไม่ — สอดคล้อง 4.2) |
| **บัญชี** ถูก lock จาก credential throttle แบบ **`user:<id>`** (ล็อก O-12 / O-06) | **`423 Locked`** — พร้อม `problem+json` อธิบาย |
| **`POST /auth/refresh`** — refresh ไม่ valid / หมดอายุ / ไม่พบ hash (ยังไม่ถึง reuse O-13) | **`401 Unauthorized`** — `problem+json` (นับ **`ip:`** throttle ตาม section 7 / 8.3) |
| **`POST /auth/refresh`** — **reuse** หลัง rotate หรือ revoked (**ล็อก O-13**, section 8.3) | **`401 Unauthorized`** — revoke **ทั้ง `family_id`** — `problem+json`; **ควร** นับ **`ip:`** เพิ่มหนึ่งครั้งต่อเหตุการณ์ (กัน brute force) |

**หมายเหตุ P4:** `423` ใช้เมื่อ **บัญชีผู้ใช้** ถูก lock ตามนโยบาย O-12 ฝั่ง **user key** เท่านั้น ส่วนการอั้นเชิง **abuse ที่ IP** ใช้ **`429`** (แถว credential throttle) เพื่อให้ client backoff และไม่สับสนกับสถานะบัญชีถูกล็อก

**แยก semantics `429`:** มีสองกรณีที่ใช้ HTTP code เดียวกัน ดังนั้น client / observability **ต้อง** ใช้ค่า **`type`** ใน `problem+json` เพื่อแยกอย่างน้อยระหว่าง **rate limit ทั่วไป** กับ **IP credential throttle**; **ห้าม** ใช้ `type` เดียวกันทั้งสองกรณี

### 4.4 Internal API — revoke sessions by user (O-16 — implemented)

> **สถานะ:** implemented ในแพ็กเกจ auth (v0.1.5+) — สัญญา HTTP อยู่ที่ [`openapi.yaml`](../openapi.yaml); checklist รายการย่อยที่ [`session-revoke-token-gen-changes.md`](./session-revoke-token-gen-changes.md)

Trusted service (เช่น **staff** หลัง archive profile สำเร็จ) เรียกตัดทุก refresh session ของผู้ใช้และ bump **`access_token_gen`** เพื่อให้ gateway ปฏิเสธ access JWT เก่าทันที (ร่วมกับ [`gateway` session-revoke doc](../../gateway/docs/session-revoke-token-gen-changes.md))

| Method | Path | Description |
| :--- | :--- | :--- |
| `POST` | `/internal/users/{user_id}/sessions/revoke` | Revoke ทุก `auth_refresh_tokens` ที่ `revoked_at: null` ของ `user_id` + **`$inc` `access_token_gen`** |

**Trust boundary (ล็อก O-15 + O-16):**

- Path อยู่ใต้ **`/internal/*`** — **ห้าม** expose สู่ public internet โดยไม่มี network/auth แยก (private network, mTLS, VPN หรือ reverse proxy ภายใน)
- Caller **ต้อง** ส่ง **`Authorization: Bearer <AUTH_INTERNAL_SERVICE_SECRET>`** — ตรวจแบบ **constant-time**; secret **แยกจาก** `GATEWAY_SHARED_SECRET`; ผิดหรือขาด → **`401 Unauthorized`** (`AUTH_INTERNAL_UNAUTHORIZED`)
- **ไม่** ผ่าน `gateway` mesh header contract — เป็น service-to-service โดยตรง

**Request**

| Part | Rule |
| :--- | :--- |
| `user_id` | path param — **ต้อง** เป็น **ObjectId** 24-hex; ไม่ valid → **`400 Bad Request`** (`AUTH_INVALID_REQUEST`) |
| Body (JSON) | **Optional:** `reason` (เช่น `staff.profile_archive`), `correlation_id` — สำหรับ audit + idempotent retry จาก caller |

**Response (สำเร็จ — `200 OK`)**

| Field | Description |
| :--- | :--- |
| `revoked_refresh_tokens` | จำนวนแถว `auth_refresh_tokens` ที่ตั้ง `revoked_at` ในรอบนี้ (อาจเป็น **0**) |
| `access_token_gen` | ค่าหลัง **`$inc`** — ใช้ยืนยัน idempotent retry |

**Idempotency:** เรียกซ้ำด้วย `user_id` ที่มีอยู่ (แม้ไม่มี refresh ค้าง) → **`200`** + `revoked_refresh_tokens` (อาจ **0**) + `access_token_gen` หลัง **`$inc` ทุกครั้ง** (gen เพิ่มทุก call ที่สำเร็จ). **`user_id` ไม่พบ** → **`404`** (`AUTH_USER_NOT_FOUND`). เมื่อตั้ง **`REDIS_URL`** — หลัง bump DB ต้อง **`SET`** Redis สำเร็จ; ล้มเหลว → **`503`** (`AUTH_NOT_READY`, fail-closed)

**Rate limit:** **ต้อง** แยก bucket จาก `POST /auth/login|refresh|logout` — ระบุใน OpenAPI (`x-ratelimit`)

**Audit:** persist `auth_audit_events` ด้วย `event_type` = **`auth.sessions_revoked_by_service`**, `outcome` = `success`, `user_id`, `request_id` / `correlation_id`, และ `detail_safe.reason` (ถ้ามี)

**Caller ที่คาดหวัง (นอกแพ็กเกจ auth):** **staff** — **archive profile ก่อน** revoke; retry idempotent + `correlation_id`; env: `AUTH_INTERNAL_BASE_URL` + `AUTH_INTERNAL_SERVICE_SECRET`

---

## 5. JWT contract (สอดคล้อง gateway)

รายละเอียดสัญญา JWT, Claims, Algorithms และการจัดการ JWKS ถูกแยกไปที่ ADR เพื่อความชัดเจนในการประสานงานกับ Gateway:

👉 **[`docs/adrs/002-jwt-jwks-contract.md`](./adrs/002-jwt-jwks-contract.md)**

---

> **ขั้น C — โครง implement:** เลือก stack และโครงโฟลเดอร์ (สอดคล้อง ADR O-09)

## 6. Stack & โครงสร้างแนะนำ

| Topic | Recommendation |
| :--- | :--- |
| **Runtime** | Node **>=24** — สอดคล้อง [gateway SoT section 12.7](../../gateway/docs/architecture.md) |
| **Framework** | **ล็อก O-09:** **Fastify + ESM** (`"type": "module"` ใน `package.json` ของ service) — แตกจากค่า default **Express + CommonJS** ใน `_engineering-standards/active/backend/architecture/architecture-standard.md` จึง **ต้อง** มี **ADR** บันทึกเหตุผลและผลกระทบต่อทีม |
| **Validation** | **ควร** Joi ตามมาตรฐาน API ของทีม |
| **โครง** | 4-layer (`route` → `controller` → `service` → `repository`) ตาม architecture standard แม้ framework หลักจะเป็น Fastify |

ตัวอย่างโฟลเดอร์ย่อ (สอดคล้อง lean architecture; นามสกุล `.js` ใช้กับ ESM ได้เมื่อ package เป็น module)

```text
auth/
  package.json          # "type": "module"
  src/
    modules/
      auth/
        auth.route.js
        auth.controller.js
        auth.service.js
        auth.repository.js
        auth.validator.js
    config/
    plugins/
    app.js
    server.js
```

---

> **ขั้น D — ความปลอดภัยและ persistence:** กฎสำหรับ production + MongoDB

## 7. Security (production)

| Topic | Requirement |
| :--- | :--- |
| Password | **ล็อก O-11:** **ต้อง** hash ด้วย **Argon2id** โดยรับพารามิเตอร์ผ่าน env (section 9) — **ห้าม** เก็บ plaintext |
| Transport | **ต้อง** TLS |
| Logging | **ห้าม** log password, refresh token เต็ม, access JWT เต็มในระดับ info |
| Rate limit (HTTP) | **ต้อง** มี **middleware จำกัดความถี่แยกต่อ route** สำหรับ **`POST /auth/login`**, **`POST /auth/refresh`**, **`POST /auth/logout`** (คนละ bucket — ห้ามใช้ global เดียวกันทั้งสามเส้นถ้าทำให้ refresh กิน quota ของ login) — **implementation ปัจจุบัน (`auth.route.js`):** login **30**/นาที, refresh **120**/นาที, logout **60**/นาที ต่อ IP — SoT มาตรฐานองค์กร: [`_coding-standards/auth/api.md`](../../../../_coding-standards/auth/api.md) (§ Security) — แยกจาก **credential throttle** (คนละชั้น; `problem+json` **`type`** คนละค่าเมื่อตอบ `429` — ดู 4.3); อ้างอิงเพิ่ม: `api-rate-limit-standard.md` |
| Lockout | **ล็อก O-12 (+ P1/P4):** **ต้อง** lock ชั่วคราวหลัง **credential ผิด** (`POST /auth/login`) โดยนับแยกทั้ง **ต่อ user** (`user:<_id>`) และ **ต่อ IP** (`ip:<…>`) — **threshold:** **10 ครั้ง** ภายใน **15 นาที** (rolling) และ lock **30 นาที** — **P1:** ถ้า **username ไม่พบในระบบ** **ห้าม** สร้าง `user:` bucket (ไม่มี `_id`) และ **ต้อง** นับผิดเฉพาะ **`ip:`**; **P4:** user bucket ถึง threshold → **`423`**; IP-only bucket ถึง threshold → **`429`** (ดู 4.3) — implementation ต้องกัน race / double-submit |
| Refresh ไม่ valid | สำหรับ **`POST /auth/refresh`** ที่ refresh **ไม่ valid** / หมดอายุ / ไม่พบ `token_hash` (ยังไม่ใช่ reuse O-13) — **ต้อง** นับความพยายามผิด **หนึ่งครั้งต่อ request** ลง **`ip:<normalized_ip>`** เท่านั้น โดยใช้ **window / threshold / `locked_until` / `429` P4** **ชุดเดียวกับ** login ผิด (แชร์ bucket `ip:` กับ login) — **ห้าม** นับ `user:` จากเหตุการณ์นี้เพียงลำพัง (opaque refresh ยังไม่ผูก user ก่อน lookup สำเร็จ); **reuse (O-13):** **401** + revoke family (8.3) และ **ควร** นับ **`ip:`** เพิ่มอีกหนึ่งครั้งต่อเหตุการณ์ |
| Keys | private key สำหรับ JWT (**ล็อก O-08**) **ต้อง** มาจาก secret manager — **ห้าม** commit |

---

## 8. ข้อมูล & token storage

### 8.1 User store

- **ล็อก O-10:** แหล่งความจริงของ user คือ **MongoDB** — รายละเอียด **schema / index / TTL** อยู่ที่ **[`docs/db/erd.md`](./db/erd.md)**
- migration / versioning ของ schema ให้เป็นไปตามมาตรฐานทีม (เช่น สคริปต์ migrate, `createIndexes` ใน deploy pipeline)

### 8.2 Refresh token

| Approach | Details |
| :--- | :--- |
| **Opaque refresh** | เก็บ **hash** ใน collection `auth_refresh_tokens` พร้อม `user_id`, `expires_at`, `revoked_at`, `family_id` |
| **Rotation (ล็อก O-13)** | **ต้อง** ใช้ one-time refresh — เมื่อใช้ refresh หนึ่งครั้งแล้ว ต้องออกคู่ access+refresh ใหม่ และ **ต้อง** ตรวจ **reuse**; หากพบว่า refresh ถูก revoke แล้วหรือถูกใช้ซ้ำนอกลำดับที่อนุญาต → **revoke ทั้ง family** (`family_id`) และบังคับ login ใหม่ |

### 8.3 MongoDB database design (persistence index)

รายละเอียด **Schema**, **ERD**, และ **Index definition** ทั้งหมดถูกแยกไปที่:

👉 **[`docs/db/erd.md`](./db/erd.md)**

---

> **ขั้น E — รันระบบ:** env → observability → deploy

## 9. Configuration (environment)

ห้ามใส่ค่าจริงลงใน repo

| Variable | Description |
| :--- | :--- |
| `PORT` | พอร์ต service |
| `DATABASE_URI` | MongoDB connection string (**ล็อก O-10**) |
| `JWT_PRIVATE_KEY_PEM` | private key สำหรับ sign access JWT (**ล็อก O-08** — asymmetric) |
| `JWKS_PUBLIC_URL` | URL เต็ม (HTTPS) ของ JWKS — **ล็อก P2:** **ต้อง** ลงท้ายด้วย **`/.well-known/jwks.json`** และ **ต้อง** ตรงกับ **`JWT_JWKS_URL`** บน Gateway ([gateway SoT section 11.3](../../gateway/docs/architecture.md)) — ถ้าใช้ path อื่น **ต้อง** ADR + sync Gateway |
| `JWT_ISSUER` / `JWT_AUDIENCE` | **ต้อง** ตรงกับที่ Gateway ตรวจ |
| `ACCESS_TOKEN_TTL_SECONDS` | **ล็อก O-07:** **`900`** (15 นาที) ค่าเริ่มต้น production |
| `REFRESH_TOKEN_TTL_SECONDS` | **`2592000`** (30 วัน) ค่าเริ่มต้น production |
| `ARGON2_MEMORY_KIB`, `ARGON2_TIME`, `ARGON2_PARALLELISM` | **ล็อก O-11** — ตั้งตาม benchmark + OWASP / นโยบาย security (ไม่ commit ค่าจริง) |
| `REFRESH_COOKIE_NAME` | ชื่อ cookie เมื่อใช้ channel cookie (ค่าเริ่มต้น `refresh_token`) |
| `CORS_ORIGINS` | รายการ origin ที่อนุญาตให้ส่ง credential/cookie (ถ้าเป็น browser client) |
| `AUTH_INTERNAL_SERVICE_SECRET` | **Required** เมื่อเปิด internal route (O-16) — Bearer secret สำหรับ `POST /internal/users/{user_id}/sessions/revoke`; **แยกจาก** `GATEWAY_SHARED_SECRET` |
| `REDIS_URL` | **Required ใน production** (`NODE_ENV=production`); dev/CI ว่างได้ — เมื่อตั้ง: เชื่อม Redis; หลัง internal revoke **`SET`** `user:{sub}:token_gen` (**ล้มเหลว → 503**, fail-closed); **`GET /readyz`** รวม **`PING`** Redis |

---

## 10. Observability & operations

- **ต้อง** มี `GET /healthz` (liveness) และ `GET /readyz` (readiness; ไม่ต้อง auth) — **`readyz`** **ต้อง** ping MongoDB; **ถ้า** ตั้ง **`REDIS_URL`** แล้ว **ต้อง** `PING` Redis ด้วย (ล้มเหลว → **503** เช่นกัน)
- **ควร** มี metrics อย่างน้อย: login success/fail, refresh success/fail, latency DB
- **Audit (ล็อก O-14):** **ต้อง** เก็บอย่างน้อย **`event_type`**, เวลาเหตุการณ์ (**`timestamp`** ใน log / **`ts`** ใน MongoDB section 8.3), **`outcome`** (success/fail), และ **`request_id`** (correlation); **ถ้ารู้ตัวตนแล้ว** ให้เก็บ **`user_id`**; ส่วน **IP** ให้เก็บตามนโยบาย PII — **แนะนำ** hash/truncate หรือเก็บเฉพาะ /24 ถ้านโยบายห้ามเก็บ IP เต็ม — **ห้าม** เก็บ access JWT / refresh token แบบ plaintext ใน audit
- **Retention (ล็อก O-14):** ค่าเริ่มต้นคือ **180 วัน** — หากต้องปรับตาม compliance องค์กร ให้แก้เอกสารนี้และ bump version อย่างน้อยระดับ patch

---

## 11. CI/CD & deployment

- **ต้อง** มี lint + test + audit ใน CI — สอดคล้องมาตรฐานทีม
- **ต้อง** deploy แยกจาก Gateway เพื่อให้ scale และ rollout ได้อิสระ
- **ล็อก O-15:** path ต่อไปนี้ **ห้าม** expose สู่ public internet หากไม่มีชั้น auth/network แยก (เช่น private network, mTLS, VPN หรือ reverse proxy ภายในเท่านั้น): **`/internal/*`**, **`/admin/*`**, **`/metrics`** (ถ้าเปิด metrics endpoint แยกจาก scrape ภายใน)

---

> **ขั้น F — ดัชนีการตัดสินใจ:** สรุปค่าที่ล็อก (O-01–O-15) และอ้างอิงที่เกี่ยวข้อง

## 12. Locked decisions (checklist)

ค่าด้านล่าง **ล็อกแล้ว** และสอดคล้องกับหมวด normative ด้านบน (เวอร์ชันเอกสาร **1.4.1**)

ถ้าแถวใดมีการเปลี่ยนค่าที่กระทบ client หรือ deploy — **ควร** bump เวอร์ชันเอกสารอย่างน้อยระดับ patch และ sync `CHANGELOG.md` ถ้า repo มี

| ID | Decision | Reference | Locked value / Notes |
| :--- | :--- | :--- | :--- |
| O-01 | ชนิด credential สำหรับ login (MVP) | 3.1, 4.1 | **ล็อกแล้ว:** username + password (JSON body) |
| O-02 | มี `POST /auth/refresh` ในรอบแรกหรือไม่ | 2, 3.1, 4.1 | **ล็อกแล้ว:** **มี** ใน MVP |
| O-03 | มี `POST /auth/logout` หรือไม่ — revoke ระดับไหน | 4.1 | **ล็อกแล้ว:** **มี** — revoke refresh ที่ส่งมา + **ทั้ง `family_id`** |
| O-04 | ส่ง refresh: **body** vs **`httpOnly` cookie** (หรือทั้งคู่ + default) | 4.1, 4.2 | **ล็อกแล้ว:** **ทั้งคู่** — **default สำหรับ browser:** `httpOnly` + `Secure` + `SameSite=Lax` cookie; **non-browser** (mobile, CLI): `refresh_token` ใน JSON body เมื่อ login/refresh |
| O-05 | รูปแบบ JSON response หลัง login / refresh (field names, envelope, error body) | 4.2, 4.3 | **ล็อกแล้ว:** success ไม่มี envelope — `access_token`, `expires_in`, `token_type: Bearer`, และ `refresh_token` ใน body เฉพาะ non-browser; ข้อผิดพลาด **`application/problem+json`** |
| O-06 | HTTP status เมื่อ account ถูก lock (`403` vs `423`) | 4.3 | **ล็อกแล้ว:** **`423 Locked`** (ล็อกบัญชีจาก `user:` throttle); **P4:** ล็อกเฉพาะ **`ip:`** → **`429`** |
| O-07 | Access JWT TTL (วินาที) และความสัมพันธ์กับ refresh | 5, 9 | **ล็อกแล้ว:** access **900s** (15m); refresh **30d** (`REFRESH_TOKEN_TTL_SECONDS=2592000`) |
| O-08 | โหมด signing กับ Gateway (**ล็อกแล้ว = (B) เท่านั้น**) | 5, 9 | **(B) asymmetric + JWKS** (RS256 หรือ ES256); **`kid`** เมื่อมีหลายคีย์/rotation; **P2:** path **`/.well-known/jwks.json`** + `JWKS_PUBLIC_URL` / `JWT_JWKS_URL` sync — ไม่ใช้ **(A) HS256** สำหรับ access ที่ Gateway verify |
| O-09 | Stack: **Express + CommonJS** vs **Fastify + ESM** (+ ADR ถ้าผิดมาตรฐานทีม) | 6 | **ล็อกแล้ว:** **Fastify + ESM** + **ADR** ([`docs/adrs/001-fastify-esm.md`](./adrs/001-fastify-esm.md)) |
| O-10 | User store (เช่น MongoDB / PostgreSQL) + migration / index หลัก | 8.1, **8.3**, **[`docs/db/erd.md`](./db/erd.md)** | **ล็อกแล้ว:** **MongoDB** — collections / indexes ตาม **[`docs/db/erd.md`](./db/erd.md)** |
| O-11 | Password hash: **Argon2id** vs **bcrypt** + พารามิเตอร์ (cost / Argon) | 7, 9 | **ล็อกแล้ว:** **Argon2id** — พารามิเตอร์ผ่าน `ARGON2_*` env (tune ตาม hardware policy) |
| O-12 | Account lockout: ต่อ **IP** / ต่อ **user** / ทั้งคู่ + threshold + duration | 7, 4.3, **[`docs/db/erd.md`](./db/erd.md)** | **ล็อกแล้ว:** **ทั้ง IP และ user** — **10 ครั้ง** / **15 นาที** (rolling) → lock **30 นาที** — **P1:** username ไม่พบ → นับเฉพาะ **`ip:`**; **P4:** user lock → **`423`**, IP-only lock → **`429`** |
| O-13 | Refresh: บังคับ **one-time rotation** + ตรวจ reuse ใน MVP หรือไม่ | 8.2 | **ล็อกแล้ว:** **บังคับ** rotation + reuse detection → reuse แล้ว revoke **ทั้ง family** |
| O-14 | Audit / log: เก็บอะไรบ้าง (user id, IP, event) — retention / PII ตามนโยบาย | 10 | **ล็อกแล้ว:** ฟิลด์ขั้นต่ำตาม section 10; retention **180 วัน** default; IP ตามนโยบาย PII |
| O-15 | path ที่ถือเป็น admin / internal — ห้าม public โดยไม่มี auth แยก | 11, **4.4** | **ล็อกแล้ว:** **`/internal/*`**, **`/admin/*`**, **`/metrics`** (ถ้ามี) |
| O-16 | Access credential generation + internal revoke-by-user | **4.4**, 5, **[`docs/db/erd.md`](./db/erd.md)**, 9 | **ล็อกแล้ว (implemented):** ฟิลด์ **`access_token_gen`**; claim **`token_gen`**; internal revoke + **`AUTH_INTERNAL_SERVICE_SECRET`**; **404** เมื่อ user ไม่พบ; Redis publish **`user:{sub}:token_gen`** (fail-closed เมื่อ `REDIS_URL` ตั้ง); **`REDIS_URL` required ใน production**; gateway ตรวจ `token_gen` — [`session-revoke-token-gen-changes.md`](./session-revoke-token-gen-changes.md) |

---

## 13. References

| Path | Notes |
| :--- | :--- |
| [`gateway` SoT](../../gateway/docs/architecture.md) | Gateway verify, headers, JWT modes |
| [`gateway` session-revoke](../../gateway/docs/session-revoke-token-gen-changes.md) | `token_gen` verification ที่ edge (implemented) |
| [`session-revoke-token-gen-changes.md`](./session-revoke-token-gen-changes.md) | Implementation checklist — auth internal revoke + `token_gen` |
| [`ARCHITECTURE.md`](../../../ARCHITECTURE.md) | Trust boundary, security strategy |
| `_engineering-standards/active/backend/architecture/architecture-standard.md` | โครง service มาตรฐานทีม (Express+CJS) — service นี้ใช้ Fastify+ESM ตาม O-09 + ADR |
| `_engineering-standards/active/backend/api/api-rate-limit-standard.md` | Rate limit |

_หมายเหตุ:_ path ที่ขึ้นต้นด้วย `_engineering-standards/` ชี้มาตรฐานทีมที่อาจอยู่ **นอก** monorepo นี้ — ใช้เป็น reference เชิงข้อความ; ถ้า clone ไม่มีไฟล์ให้ดูที่ repo มาตรฐานขององค์กร

---

_Document version **1.4.1** — `auth` (self-hosted IdP) SoT; O-16 / D1 session revoke + `token_gen` implemented._
