# 📘 Authorization Gateway System Runbook

> **คู่มือรวมทุกวิธีรัน (harness + manual + CI):** [RUNBOOK.md](../RUNBOOK.md) ที่ repo root

คู่มือปฏิบัติการสำหรับ Monorepo (`auth`, `gateway`, `demo-service`, `items`)

## 1. ⚙️ Setup & Environment

> **ไฟล์ env:** [ENV.md](./ENV.md) — harness → `backend/*/.env.harness` · manual → `.env` · PM2 → `.env.prod`

### `auth`

```bash
cd auth && npm run create-env
```

> [!WARNING]
> **Production:** ห้ามใช้ `create-env` ต้องสร้าง RSA Key (PKCS#8 PEM) แบบปลอดภัย และตั้งค่า `JWT_PRIVATE_KEY_PEM` เอง

### `gateway`

```bash
cd gateway && cp .env.example .env
```

ตั้งค่าใน `.env`:

- `JWT_JWKS_URL=http://127.0.0.1:3001/.well-known/jwks.json`
- `GATEWAY_SECRET` (ขั้นต่ำ 32 ตัวอักษร)

---

## 2. 🗄️ Database & Redis

ระบบใช้ **Docker Compose** จัดการทั้ง MongoDB และ Redis ให้เข้าไปที่โฟลเดอร์ `backend/` แล้วรัน:

```bash
cd backend
docker compose up -d
```

*(หมายเหตุ: สำหรับ Production ที่ต้องการรันแค่ Redis อย่างเดียว (ใช้ Cloud Database สำหรับ MongoDB) ให้รันด้วยคำสั่ง: `docker compose -f docker-compose.prod.yml up -d`)*

### Initial Data (สำหรับ `auth` / MongoDB)

หลังจาก Docker รันเสร็จ ต้องสร้าง Index และ Admin User ก่อน:

```bash
cd auth && npm run init:db
```

_(ค่าเริ่มต้น: admin / 1234)_

ตรวจสอบให้แน่ใจว่าทั้ง `auth` และ `gateway` มีค่าใน `.env`: `REDIS_URL=redis://127.0.0.1:6379/0`

---

## 3. 🚀 รัน Services (แยก Terminal)

1. **`auth`** (Port `3001`): `cd auth && npm run dev`
2. **`gateway`** (Port `3000`): `cd gateway && npm run dev`
3. **`demo-service`** (Port `3002`): `cd demo-service && npm run dev`

---

## 4. 🧪 Smoke Test

**1. ขอ Token**

```bash
curl -X POST http://127.0.0.1:3001/auth/login -H "Content-Type: application/json" -d '{"username":"admin","password":"1234","client_kind":"native"}'
```

**2. เทสต์ผ่าน Gateway**

```bash
curl -X GET http://127.0.0.1:3000/api/v1/me -H "Authorization: Bearer <access_token>"
```

---

## 5. 🛠️ Troubleshooting (ปัญหาพบบ่อย)

- **`E11000 duplicate key error`:** Username ซ้ำ (ลบข้อมูลเก่า หรือใช้ชื่ออื่น)
- **`401 Unauthorized` (ที่ Gateway):** JWT หมดอายุ, `token_gen` ถูก Revoke, หรือลืมใส่ `Bearer`
- **`403 Forbidden` (ที่ Upstream):** `GATEWAY_SECRET` ไม่ตรงกัน หรือสั้นกว่า 32 ตัวอักษร
- **`503 GET /readyz`:** เชื่อมต่อ Redis ไม่ได้เช็ค `REDIS_URL` หรือ `docker compose ps`

---

## 6. 📦 Deploy Checklist

เช็คลิสต์ก่อนนำขึ้น Production เพื่อให้ระบบเชื่อมต่อกันสำเร็จ:

- `[ ]` **JWKS:** `JWT_JWKS_URL` ของ gateway ชี้ไปที่ auth ถูกต้อง
- `[ ]` **Key ID (`kid`):** `JWT_KID` ใน gateway ตรงกับใน auth
- `[ ]` **Issuer / Audience:** `JWT_ISSUER` และ `JWT_AUDIENCE` ตรงกันทั้ง 2 ฝั่ง
- `[ ]` **Claims Mapping:** `JWT_CLAIM_USER_ID`, `ROLE`, `OU`, `BRANCH` ตั้งชื่อ field ตรงกันหมด
- `[ ]` **Redis:** `REDIS_URL` ชี้ไปที่เดียวกัน (เพื่อเช็ค `token_gen`)
- `[ ]` **Gateway Secret:** `GATEWAY_SECRET` ต้องยาวเกิน 32 ตัวอักษร และตรงกับค่าของ Upstream

### Shared package `@zero-platform/roles`

บริการ `staff`, `smart-report`, `agent-invoice`, และ `auth` ใช้ workspace package ที่ `backend/shared/platform-roles/`

**หลัง `git pull` บน Production** (ต้อง checkout repo เต็ม — มี `backend/shared/platform-roles/`):

```bash
# จาก repo root (แนะนำ)
cd /path/to/zero-platform && npm install

# หรือต่อ service (PM2 ecosystem ใช้ cwd แยก)
cd backend/service/smart-report && npm install
cd backend/service/staff && npm install
cd backend/service/agent-invoice && npm install
cd backend/auth && npm install
```

จากนั้น `pm2 restart` service ที่ deploy (อย่างน้อย `zero-smart-report` สำหรับ fix `support_admin`)

ดูรายละเอียดเพิ่ม: `backend/shared/platform-roles/README.md`

### Active Branch Selector (`POST /auth/me/active-branch`)

- **Auth:** ตั้ง `MONGODB_URI_READ` + `MONGODB_DB_BRANCH` (branch master) และ `REDIS_URL` (ต้องตรงกับ gateway)
- **Recovery เมื่อ switch คืน `503 AUTH_NOT_READY`:** session ใน DB อาจอัปเดต `active_branch_id` แล้วแต่ Redis publish ล้มเหลว — ให้ผู้ใช้ **refresh session** (`POST /auth/refresh`) หรือ logout/login; backoffice เรียก refresh อัตโนมัติเมื่อได้ `AUTH_NOT_READY` จาก switch
- **Monitor:** log `branch switch: redis publish failed after DB commit` — ตรวจ Redis connectivity ทันที
