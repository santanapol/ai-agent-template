# 📘 Authorization Gateway System Runbook

เอกสารฉบับนี้เป็น **ศูนย์รวมคู่มือปฏิบัติการ (Single SoT)** สำหรับ Monorepo นี้ ครอบคลุมตั้งแต่การตั้งค่า E2E, การรันบริการ, การแก้ไขปัญหาเบื้องต้น และ **Checklist ก่อน/หลัง Deploy** (สำหรับการตั้งค่า JWT และ Env ระหว่าง `auth`, `gateway`, และ upstream เช่น **`crud-service`** (ใต้ `.demo/`) / **`smart-report`**)

**ดัชนีพอร์ต local (อัปเดตเมื่อเพิ่ม service):** [`local-ports.md`](./local-ports.md)

---

## 1. ⚙️ การตั้งค่า Environment & RSA Keys (Setup)

ระบบต้องการตัวแปรแวดล้อมหลัก ได้แก่ Private Key (สำหรับ `auth` ใช้เซ็น JWT) และ `GATEWAY_SECRET` สำหรับการสื่อสารระหว่าง `gateway` และ upstream ที่ตรวจ `x-gateway-secret` / `GATEWAY_SHARED_SECRET` (เช่น **`crud-service`**, **`smart-report`** — ค่าเดียวกันใน dev ตาม template)

### 1.1 `auth`

เข้าไปที่โฟลเดอร์ `auth` และสร้าง `.env` พร้อม RSA 2048-bit Private Key สำหรับฝั่ง Development:

```bash
cd auth-service
npm run create-env
# ⚠️ ระบบจะสร้างไฟล์ .env ขึ้นมาอัตโนมัติ ห้าม Commit ไฟล์นี้!
```

> [!WARNING]
> **สำหรับ Production:** ห้ามใช้ `npm run create-env` เด็ดขาด! คุณต้องสร้าง RSA Key Pair แบบปลอดภัยด้วยเครื่องมือที่น่าเชื่อถือ (เช่น AWS KMS, HashiCorp Vault) และนำค่า Private Key (PKCS#8 PEM) มาใส่ใน `JWT_PRIVATE_KEY_PEM` ด้วยตัวเอง

### 1.2 `gateway`

เข้าไปที่โฟลเดอร์ `gateway` และสร้างไฟล์ `.env`:

```bash
cd gateway-service
cp .env.example .env
```

จากนั้นเปิดไฟล์ `.env` ที่ได้มา และแก้ไขค่าที่สำคัญ:
- `JWT_JWKS_URL=http://127.0.0.1:3001/.well-known/jwks.json` (ชี้ไปหา IP/Port ที่ `auth` รันอยู่)
- `GATEWAY_SECRET`: กำหนดรหัสผ่าน **ขั้นต่ำ 32 ตัวอักษร** (เช่น `super_secret_gateway_key_minimum_32_chars!`)

---

## 2. 🗄️ การสร้าง Database และ ข้อมูลตัวอย่าง

`auth` ใช้ MongoDB ในการเก็บข้อมูลผู้ใช้งานและ Token จึงจำเป็นต้องสร้าง Index ให้ถูกต้องก่อนใช้งาน

```bash
cd auth-service

# สร้าง Database Indexes ตามมาตรฐาน และเพิ่มผู้ดูแลระบบ (admin) 1 คน
npm run init:db
```
*(ค่าเริ่มต้น: ระบบจะสร้าง user ชื่อ `admin` รหัสผ่าน `ChangeMe!Admin-1`)*

> [!NOTE]
> หากต้องการเปลี่ยนค่าเริ่มต้นของ Admin ขณะรันคำสั่ง สามารถส่ง Environment Variables ไปด้วยได้:
> `ADMIN_USERNAME=boss ADMIN_PASSWORD=StrongPass1! npm run init:db`

---

## 3. 🚀 การรัน Services

ขั้นต่ำ: **`auth`** + **`gateway`** เปิดคนละ Terminal

### 📺 Terminal 1: `auth`
มีหน้าที่ตรวจสอบรหัสผ่าน, ออก Access Token (JWT), และจัดการ Refresh Token
```bash
cd auth-service
npm install
npm run dev
# 🌐 ทำงานที่พอร์ต 3001 (http://127.0.0.1:3001)
```

### 📺 Terminal 2: `gateway`
มีหน้าที่ดักจับ Request, ตรวจสอบ JWT Signature, นำ Claims ไปใส่ใน Headers, และ Proxy ไป upstream ตาม `ROUTES_JSON`
```bash
cd gateway-service
npm install
npm run dev
# 🌐 default จาก .env.example: พอร์ต 3002 (http://127.0.0.1:3002)
```

### 📺 Upstream เสริม (เมื่อใช้ default `ROUTES_JSON` จาก `gateway/.env.example`)

รันเพิ่มตามต้องการ — **`GATEWAY_SECRET` (gateway) ต้องตรงกับ `GATEWAY_SHARED_SECRET` / secret ฝั่ง upstream** ที่เกี่ยวข้อง — สรุปพอร์ตแบบตารางเต็มอยู่ที่ [`local-ports.md`](./local-ports.md)

| Terminal | Service | พอร์ต (ค่าเริ่มต้นใน repo) | โฟลเดอร์ |
|----------|---------|---------------------------|----------|
| 3 | **`crud-service`** | **`3003`** | **`.demo/crud-service/`** |
| 4 | `smart-report` (workspace) | `3000` | `../smart-report/` |

เส้นทาง gateway ที่ไป **`crud-service`** (`:3003`): prefix **`/api/v1/items`** และ catch-all **`/api`** (เช่น **`/api/v1/me`**) → `http://127.0.0.1:3003` (ดู [`gateway/.env.example`](gateway/.env.example))

---

## 4. 🧪 ทดสอบ Flow การทำงาน (Smoke Test)

เมื่อทั้ง 2 Services รันขึ้นมาแล้ว สามารถทดสอบการทำงานตาม Flow ด้วย cURL, Postman, หรือ HTTP Client อื่นๆ ได้ดังนี้:

### Step 1: Login เพื่อรับ JWT (ยิงตรงไปที่ `auth`)
```bash
curl -X POST http://127.0.0.1:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "ChangeMe!Admin-1", "client_kind": "native"}'
```
> 📌 ก๊อปปี้ค่าที่ได้ในฟิลด์ `"access_token"` เก็บไว้

### Step 2: เรียกใช้งานระบบผ่าน Gateway
*(ตัวอย่าง: path ที่ proxy ไป **`crud-service`** ตาม default — เช่น `/api/v1/me`)*
```bash
curl -X GET http://127.0.0.1:3002/api/v1/me \
  -H "Authorization: Bearer <วาง access_token ที่นี่>"
```
> ✅ หากทุกอย่างถูกต้อง Gateway จะดึงข้อมูลใส่ `x-user-*` headers และแนบ `x-gateway-secret` ส่งไปให้ upstream (**`crud-service`**) อัตโนมัติ

---

## 5. 🛠️ การแก้ไขปัญหาเบื้องต้น (Troubleshooting)

| อาการ (Symptom) | สาเหตุที่เป็นไปได้ (Possible Causes) | วิธีแก้ไข (Resolution) |
|---|---|---|
| `E11000 duplicate key error` (MongoDB) | มี User ใช้ Username นี้ไปแล้ว (Username เป็น Globally Unique) | ใช้ Username อื่นในการสร้าง หรือลบข้อมูลเก่าทิ้งหากเป็นระบบ Dev |
| Gateway ตอบ `401 Unauthorized` | 1. JWT หมดอายุ <br>2. Signature ไม่ตรง (Key คนละชุดกัน) <br>3. ไม่ได้แนบ Bearer Header | ตรวจสอบไฟล์ `.env` ของ Gateway ว่า `JWT_JWKS_URL` ชี้ไปหา `auth` ถูกต้องหรือไม่ |
| Upstream ปฏิเสธ Request (`403 Forbidden`) — mesh secret | รหัส `x-gateway-secret` ไม่ตรงกัน หรือตั้งค่าความยาวไม่ถึง 32 ตัวอักษร | ตรวจสอบตัวแปร `GATEWAY_SECRET` (gateway) กับ `GATEWAY_SHARED_SECRET` (upstream เช่น **api-example**) ให้ตรงกัน 100% |
| ขาด Tenant Scope (`x-user-ou` หรือ `x-user-branch` หายไป) | ไม่ได้ใส่ค่า `ou_id` / `branch_id` ให้ผู้ใช้ตอนสร้างใน DB | อัปเดตข้อมูลผู้ใช้ใน MongoDB แล้วให้ผู้ใช้ Login ใหม่เพื่อรับ JWT เล่มใหม่ |

---

<a id="deploy-jwt-env"></a>

## 6. 📦 Deploy: JWT & Env Alignment Checklist

ใช้เช็คลิสต์นี้ก่อน Deploy หรือหลังเปลี่ยน Env ระหว่าง **auth-service**, **gateway-service**, และ upstream (เช่น **api-example** / **smart-report**) เพื่อให้ระบบทำงานประสานกันได้อย่างถูกต้อง (เอกสารเดิม `docs/deploy-jwt-env-checklist.md` ถูกยุบรวมไว้ที่นี่)

### 6.1 JWKS URL (Gateway ต้องชี้ไปที่ Auth)

| จุดตรวจสอบ | `auth` | `gateway` |
|---|---|---|
| URL ต้องลงท้ายด้วย `/.well-known/jwks.json` | `JWKS_PUBLIC_URL` ใน `.env` ต้องเป็น URL ที่ Client/Gateway เข้าถึงได้จริง | `JWT_JWKS_URL` ต้องตรงกับ Endpoint ที่ `auth` ประกาศ |
| ตัวอย่าง (Dev) | `http://127.0.0.1:3001/.well-known/jwks.json` | `http://127.0.0.1:3001/.well-known/jwks.json` |

> ⚠️ ถ้า `JWT_JWKS_URL` ผิดหรือ auth ดับ → gateway จะตอบ **401** บน Route ที่ต้องใช้ JWT

### 6.2 Key ID (`kid`) — Signing กับ JWKS

| จุดตรวจสอบ | `auth` | `gateway` |
|---|---|---|
| `kid` บน Access Token | `JWT_KID` (Default: `default`) ต้องตรงกับ Key ใน JWKS Document | Gateway Verify ผ่าน `jose` + Remote JWKS — `kid` ใน Header ของ JWT ต้องมีอยู่ใน `keys[]` |

*การหมุนคีย์ (Key Rotation):* ให้อัปเดต JWKS โดยเพิ่ม `kid` ใหม่เข้าไปก่อน แล้วจึงเริ่มออก Token ด้วย `kid` นั้น

### 6.3 Issuer & Audience (ต้องคู่กันเสมอ)

| ตัวแปร | `auth` | `gateway` |
|---|---|---|
| Issuer | `JWT_ISSUER` (ถ้าว่าง จะไม่ใส่ Claim `iss` ลงใน Token) | `JWT_ISSUER` (ถ้าว่าง = ไม่ Verify Issuer) |
| Audience | `JWT_AUDIENCE` (ถ้าว่าง จะไม่ใส่ Claim `aud` ลงใน Token) | `JWT_AUDIENCE` (ถ้าว่าง = ไม่ Verify Audience) |

> ⚠️ **กฎเหล็ก:** ถ้าฝั่ง Auth ใส่ `iss` / `aud` ฝั่ง Gateway **ต้องตั้งค่าให้ตรงกัน** มิฉะนั้นการ Verify จะล้มเหลว (ตอบ `401`)

### 6.4 Claims -> Upstream Headers

| ตัวแปร | `auth` | `gateway` |
|---|---|---|
| User ID → `x-user-id` | `JWT_CLAIM_USER_ID` (Default: `sub`) | `JWT_CLAIM_USER_ID` **ต้องตั้งชื่อ Claim ให้ตรงกับ Auth** |
| Role → `x-user-role` | `JWT_CLAIM_ROLE` (Default: `role`) | `JWT_CLAIM_ROLE` **ต้องตรงกัน** |
| OU → `x-user-ou` | `JWT_CLAIM_OU` (Default: `ou_id`) | `JWT_CLAIM_OU` **ต้องตรงกัน** |
| Branch → `x-user-branch` | `JWT_CLAIM_BRANCH` (Default: `branch_id`) | `JWT_CLAIM_BRANCH` **ต้องตรงกัน** |

### 6.5 `GATEWAY_SECRET` (Gateway + upstream ที่ไว้ใจ gateway)

- ความยาว **ต้องไม่ต่ำกว่า 32 ตัวอักษร** (มีเช็คใน Joi)
- `GATEWAY_SECRET` ของ gateway ต้อง **ตรงกับ** secret ที่ upstream ใช้ตรวจแนว mesh (เช่น **`crud-service`** (`GATEWAY_SHARED_SECRET`) / `smart-report` — ตามที่แต่ละ service กำหนด)
- ห้ามส่งค่านี้มาจากฝั่ง Client เด็ดขาด; Gateway จะเป็นคน Inject ใส่ Header ในชื่อ `x-gateway-secret` ด้วยตัวเองตอน Proxy

### 6.6 เอกสารอ้างอิง API (OpenAPI / SoT)

| เอกสาร | หน้าที่ |
|---|---|
| [auth-service/docs/openapi.yaml](auth-service/docs/openapi.yaml) | การ Login / Refresh / Logout และ Token Issuance |
| [gateway-service/docs/openapi.yaml](gateway-service/docs/openapi.yaml) | ข้อมูล `GET /healthz`, `GET /readyz` และ SoT Links |
| [.demo/crud-service/openapi-via-gateway.yaml](.demo/crud-service/openapi-via-gateway.yaml) | Client → Gateway (Bearer) — รวม **`/api/v1/me`** และ **`/api/v1/items`** |
| [.demo/crud-service/openapi.yaml](.demo/crud-service/openapi.yaml) | Mesh contract ตรง **`crud-service`** (`x-gateway-secret` + `x-user-*`) |
| [gateway-service/docs/architecture.md](gateway-service/docs/architecture.md) | Header contract, errors, routing (Production SoT gateway) |
| [ARCHITECTURE.md](ARCHITECTURE.md) | ภาพรวม trust boundary และ routing แบบหลาย upstream |

### 6.7 Smoke Test หลัง Deploy

1. ยิง `GET` ไปที่ Auth JWKS → ต้องได้สถานะ **200** พร้อม JSON `{ "keys": [...] }`
2. ทำการ Login ผ่าน Auth → ได้รับ Access Token
3. ยิง `GET` ไปที่ Proxy Path ของ Gateway (พร้อมแนบ `Authorization: Bearer <access>`) → ต้องได้สถานะ **200** จาก Upstream
4. (ทางเลือก) ยิงทดสอบไปยัง upstream **โดยตรง** (แนบ `x-gateway-secret` + headers เอง) → ผลลัพธ์ต้องถูกต้องตามสเปก

> 💡 **ทิปส์สำหรับ Dev:** สำหรับ `gateway` สามารถทดสอบด้วยคำสั่ง `npm run try:proxy`
