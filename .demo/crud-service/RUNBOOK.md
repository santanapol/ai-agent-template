# crud-service Runbook

เอกสารสำหรับรันและดูแล **`crud-service`** ในเครื่องและสภาพแวดล้อมจริง

**ที่ตั้งโปรเจกต์:** จาก root ของ repo **`access-platform`** ให้ `cd .demo/crud-service` (นี่คือ **root ของแพ็กเกจ** `crud-service` สำหรับคำสั่ง `npm` / `pm2`) — ถ้าใช้ร่วมกับ [ai-agent workspace](https://github.com/santanapol/ai-agent-cursor) โปรเจกต์มักอยู่ที่ `project-active/access-platform/.demo/crud-service/`

## Table of contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Development](#development)
4. [Production](#production)
5. [Health checks](#health-checks)
6. [API contract](#api-contract)
7. [Smoke tests (API)](#smoke-tests-api)
8. [HTTP errors reference](#http-errors-reference)
9. [Troubleshooting](#troubleshooting)
10. [Pre-merge quality gate](#pre-merge-quality-gate)
11. [Production handoff](#production-handoff)
12. [Notes](#notes)

---

<a id="overview"></a>

## ภาพรวม

| รายการ      | ค่า                                                         |
| :---------- | :---------------------------------------------------------- |
| Service     | `crud-service`                                              |
| Node.js     | `>=24 <25`                                                  |
| Database    | MongoDB ชื่อ `api_example`                                  |
| HTTP listen | ค่าเริ่มต้น **`3003`** (`PORT` ใน `.env.example`)           |
| Development | `npm run dev` — ดู [Development](#development)              |
| Production  | PM2 + `ecosystem.config.cjs` — ดู [Production](#production) |

มาตรฐานอ้างอิง: ดู [`openapi.yaml`](./openapi.yaml) ในแพ็กเกจนี้ — ชุดมาตรฐาน org อยู่ที่ [`_coding-standards/`](../../_coding-standards/README.md) ใต้ root ของ repo `access-platform` (ถ้า clone เฉพาะ monorepo โดยไม่มี `_coding-standards/` ที่ path นี้ ให้ใช้ SoT ตามที่ทีม mirror ไว้) รวม [`backend/`](../../_coding-standards/backend/README.md) สำหรับ contract / envelope · **MongoDB (connection, lifecycle, ERD, data dictionary, indexes):** [`docs/db/erd.md`](./docs/db/erd.md)

---

<a id="configuration"></a>

## การตั้งค่า (`.env`)

จาก **root ของแพ็กเกจ** `.demo/crud-service/` (ไม่ใช่แค่ root ของ monorepo ถ้าคำสั่งรันคนละ cwd):

```bash
cp .env.example .env
```

ตัวแปรที่ต้องมีและควรตรวจก่อนรัน:

| ตัวแปร                  | หมายเหตุ                                                                                                                                 |
| :---------------------- | :--------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                  | ค่าเริ่มต้นใน repo นี้ **`3003`** (สอด `.env.example` / `README`) — ตัวอย่าง `curl` ด้านล่างใช้พอร์ตนี้; เปลี่ยนตาม `PORT` จริงถ้าไม่ตรง |
| `DB_NAME`               | `api_example`                                                                                                                            |
| `MONGODB_URI`           | connection string ที่มี user/password และ `authSource` ถูกต้อง                                                                           |
| `GATEWAY_SHARED_SECRET` | ต้องตรงกับค่าที่ gateway ส่งมาใน `x-gateway-secret`                                                                                      |

**ไฟล์ `.env`:** ถ้ามีที่ **root ของแพ็กเกจ** (เดียวกับที่มี `package.json`) แอปจะโหลดและตั้งเฉพาะตัวแปรที่ยังไม่มีใน `process.env` (ค่าจาก PM2 / systemd / shell มาก่อนเสมอ — ไม่ถูกทับ) ดู `src/config/load-local-env.js`  
บน production แนะนำตั้ง secret ผ่าน environment ของแพลตฟอร์ม; ใช้ `.env` บน server ได้ถ้าคุมสิทธิ์ไฟล์ (เช่น `chmod 600`) และไม่ commit ขึ้น git

---

<a id="development"></a>

## Development (เครื่องพัฒนา)

ใช้เมื่อแก้โค้ดในเครื่อง — โดยทั่วไป `NODE_ENV` เป็น `development` (ค่าเริ่มต้นของ Node / ไม่ได้ตั้งใน shell); ตั้งค่าลับใน `.env` ตาม [การตั้งค่า](#configuration)

**ติดตั้งและรันแอป**

```bash
npm ci
npm run dev
```

**ตรวจคุณภาพโค้ดในเครื่อง**

ชุดเต็มเดียวกับ CI ของแพ็กเกจ:

```bash
npm run ci
```

ตรวจแบบเร็ว (ไม่รวม Spectral / audit):

```bash
npm run lint
npm test
npm run format:check
```

ถ้าต้องการจัดรูปแบบไฟล์ในเครื่อง: `npm run format`

หลังขึ้นปกติ เรียก health ได้ (ดู [ตรวจสุขภาพ](#health-checks))

---

<a id="production"></a>

## Production (server)

ใช้บน server จริง — `ecosystem.config.cjs` ตั้ง `NODE_ENV=production`, `TZ=UTC`, และ `PORT` เริ่มต้น; ปรับค่าใน ecosystem หรือ inject ผ่าน environment ตามนโยบายทีม

**ติดตั้ง dependencies (production เท่านั้น)**

```bash
npm ci --omit=dev
```

**เริ่มรันครั้งแรก (หรือหลัง `pm2 delete crud-service`)**

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs crud-service
```

**อัปเดตหลัง deploy โค้ด** (สั่งจาก **root ของแพ็กเกจ** `.demo/crud-service/` บน server)

เมื่อ **มีการเปลี่ยน** `package.json` / `package-lock.json`:

```bash
git pull --ff-only
npm ci --omit=dev
pm2 startOrReload ecosystem.config.cjs --update-env
```

เมื่อ **แก้แค่โค้ด** (ไม่แตะ dependencies):

```bash
git pull --ff-only
pm2 startOrReload ecosystem.config.cjs --update-env
```

**จัดการ process**

```bash
pm2 restart crud-service
pm2 stop crud-service
pm2 delete crud-service
```

**ทางเลือก (ไม่ใช้ PM2):** จาก root ของแพ็กเกจหลังตั้ง env แล้ว

```bash
NODE_ENV=production npm start
```

---

<a id="health-checks"></a>

## ตรวจสุขภาพ

ไม่ต้องส่ง `x-gateway-secret` บน `/healthz` และ `/readyz` ตาม wiring ปัจจุบัน — แทน `3003` ด้วยค่า `PORT` จริงถ้าไม่ใช้ค่าเริ่มต้นใน repo นี้

| Endpoint        | คำสั่ง                                  | ผลที่คาดหวัง                                |
| :-------------- | :-------------------------------------- | :------------------------------------------ |
| Liveness        | `curl -s http://127.0.0.1:3003/healthz` | `200` — process ยังมีชีวิต                  |
| Readiness       | `curl -s http://127.0.0.1:3003/readyz`  | `200` — MongoDB ping ผ่าน                   |
| Readiness (ล้ม) | เหมือนบรรทัดบน                          | `503` + `SERVICE_UNAVAILABLE` — DB ไม่พร้อม |

---

<a id="api-contract"></a>

## สัญญา API (headers และ concurrency)

**Headers บังคับสำหรับ CRUD**

- `x-gateway-secret`
- `x-user-id`
- `x-user-ou`
- `x-user-branch`
- `x-user-role` (ไม่บังคับ — ส่งเมื่อต้องการสะท้อน role ใน `GET /api/v1/me`)

**Optimistic concurrency**

- `POST` create: ได้ `ETag` และ `Location` ใน response headers
- `GET` รายการเดียว / `PATCH` / `PUT` / `DELETE`: ต้องใช้ `If-Match` ตาม `ETag` ล่าสุด (รายละเอียดตาม `_coding-standards/backend/tenant-audit.md` เมื่อมี workspace มาตรฐาน)

**`Accept` (แนะนำสำหรับ `/api/v1/*`)**

- ถ้าส่ง `Accept` ต้องรวม **`application/json`** หรือ **`*/*`** — ไม่เช่นนั้น middleware ตอบ `400` + `INVALID_HEADER`

**`GET /api/v1/me`**

- ใช้ชุด mesh + user headers เดียวกับ CRUD (ไม่มี body)

**`GET /metrics`**

- ต้องมี **`x-gateway-secret`** เท่านั้น (ไม่ผ่าน stack `/api/v1`); response เป็น Prometheus text

---

<a id="smoke-tests-api"></a>

## Smoke tests (API)

ใช้ได้ทั้งหลัง [Development](#development) (`npm run dev`) หรือชี้ `BASE_URL` ไป staging/production

ตั้งค่า shell ใช้ซ้ำ (ค่าเริ่มต้นพอร์ต **`3003`** ตาม `.env.example`):

```bash
BASE_URL="http://127.0.0.1:3003"
GW_SECRET="replace-me"

COMMON_HEADERS=(
  -H "accept: application/json"
  -H "x-gateway-secret: ${GW_SECRET}"
  -H "x-user-id: user-001"
  -H "x-user-ou: ou-001"
  -H "x-user-branch: bkk-01"
)
```

**ด่วน:** `GET /api/v1/me` และ metrics

```bash
curl -i "${COMMON_HEADERS[@]}" "${BASE_URL}/api/v1/me"

curl -i -H "x-gateway-secret: ${GW_SECRET}" "${BASE_URL}/metrics"
```

ลำดับ **items CRUD** ที่แนะนำ:

1. **List** — `GET /api/v1/items`
2. **Create** — `POST /api/v1/items` (เก็บ `Location` และ `ETag` จาก headers)
3. **Detail** — `GET /api/v1/items/<itemId>`
4. **Patch** — `PATCH /api/v1/items/<itemId>` พร้อม `If-Match`
5. **Delete** — `DELETE /api/v1/items/<itemId>` พร้อม `If-Match` ล่าสุด

ตัวอย่างคำสั่ง:

```bash
# 1. List
curl -i "${COMMON_HEADERS[@]}" "${BASE_URL}/api/v1/items"

# 2. Create
curl -i "${COMMON_HEADERS[@]}" \
  -H "content-type: application/json" \
  -d '{"code":"ITEM-900","name":"Runbook Item","description":null,"status":"active","tags":[]}' \
  "${BASE_URL}/api/v1/items"

# 3. Detail (แทน <itemId>)
curl -i "${COMMON_HEADERS[@]}" "${BASE_URL}/api/v1/items/<itemId>"

# 4. Patch (แทน ETag จาก detail หรือ create)
curl -i "${COMMON_HEADERS[@]}" \
  -H "content-type: application/json" \
  -H 'if-match: W/"<etag-from-detail-or-create>"' \
  -X PATCH \
  -d '{"name":"Runbook Item Updated"}' \
  "${BASE_URL}/api/v1/items/<itemId>"

# 5. Delete (ใช้ ETag ล่าสุดหลัง patch)
curl -i "${COMMON_HEADERS[@]}" \
  -H 'if-match: W/"<latest-etag>"' \
  -X DELETE \
  "${BASE_URL}/api/v1/items/<itemId>"
```

---

<a id="http-errors-reference"></a>

## อ้างอิง HTTP / error code

| HTTP  | `code` (ตัวอย่าง)              | สาเหตุโดยย่อ                                                 |
| :---- | :----------------------------- | :----------------------------------------------------------- |
| `400` | `INVALID_HEADER`               | `Accept` ไม่รองรับ / header สำคัญซ้ำ                         |
| `401` | `GATEWAY_SECRET_REJECTED`      | `x-gateway-secret` ผิดหรือไม่มี                              |
| `403` | `MISSING_GATEWAY_USER_CONTEXT` | ขาด `x-user-*` ที่บังคับ                                     |
| `415` | `UNSUPPORTED_MEDIA_TYPE`       | `POST`/`PUT`/`PATCH` ไม่ใช่ `Content-Type: application/json` |
| `412` | `VERSION_CONFLICT`             | `If-Match` ผิดรูปแบบหรือไม่ตรงเวอร์ชันปัจจุบัน               |
| `428` | `PRECONDITION_REQUIRED`        | ขาด `If-Match` บน `PATCH` / `PUT` / `DELETE`                 |
| `429` | (rate limit)                   | เกินโควตา (write เข้มกว่า read)                              |
| `503` | `SERVICE_UNAVAILABLE`          | MongoDB ไม่พร้อม                                             |

รายละเอียดเต็มดู `openapi.yaml` และ (ถ้ามีใน workspace) `_coding-standards/backend/codes.yaml`

---

<a id="troubleshooting"></a>

## แก้ปัญหา (Troubleshooting)

| อาการ                              | สิ่งที่ตรวจ                                                                                                                                                                                                                                                                                                                                       |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/readyz` = `503`                  | MongoDB รันอยู่หรือไม่; `MONGODB_URI` / `DB_NAME` / user / `authSource`                                                                                                                                                                                                                                                                           |
| CRUD = `401` / `403`               | ครบ headers หรือไม่; `x-gateway-secret` ตรง `GATEWAY_SHARED_SECRET`                                                                                                                                                                                                                                                                               |
| `PATCH` / `DELETE` = `412`         | ดึง `ETag` ใหม่จาก `GET` แล้วส่ง `If-Match` ใหม่                                                                                                                                                                                                                                                                                                  |
| `429`                              | รอ reset window; write จำกัดเข้มกว่า read                                                                                                                                                                                                                                                                                                         |
| `GET /api/v1/items` ได้ `data: []` | แอปอ่าน MongoDB ตาม **`DB_NAME`** (ค่าเริ่มต้น `api_example`) และ collection **`items`** — ตรวจใน Compass ว่าเอกสารอยู่ database เดียวกัน; ถ้าข้อมูลอยู่ database อื่น ให้ตั้ง `DB_NAME` / URI ให้ตรง หรือย้ายข้อมูลเข้า `api_example`. ส่ง **`x-user-ou`** / **`x-user-branch`** เป็น **สตริง hex 24 ตัว** ให้ตรง `ou_id` / `branch_id` ในเอกสาร |
| `MODULE_NOT_FOUND` ตอน boot        | รัน `npm ci` ที่ **root ของแพ็กเกจ**; ตรวจว่ามี `node_modules/pino`; ถ้า `NODE_ENV` ไม่ใช่ `production` แต่ติดตั้งแบบ `--omit=dev` โค้ดจะข้าม `pino-pretty` ถ้าไม่มีแพ็กเกจ — บน server ให้ยึด [Production](#production) (`NODE_ENV=production` ผ่าน PM2)                                                                                         |

---

<a id="pre-merge-quality-gate"></a>

## ก่อน merge (quality gate)

แนะนำรันชุดเดียวกับ CI:

```bash
npm run ci
```

ทางเลือก (ไม่รวม Spectral / `npm audit`):

```bash
npm run lint
npm test
npm run format:check
npm run spec:lint
```

---

<a id="production-handoff"></a>

## มอบงาน production

### ก่อน deploy

- [ ] `npm run ci` ผ่าน (หรืออย่างน้อย `lint` + `test` + `format:check` + `spec:lint` ตามนโยบายทีม)
- [ ] `openapi.yaml` สอดคล้อง implementation
- [ ] index บน DB ตรงแผนใน `docs/db/erd.md`
- [ ] เวอร์ชันใน `package.json` (ถ้าทีมใช้ semver สำหรับ release)

### ตอน deploy

- [ ] ดึงโค้ดล่าสุดบน server (เช่น `git pull --ff-only`) หรือตาม flow CD ของทีม
- [ ] ตัวแปร production (`MONGODB_URI`, `GATEWAY_SHARED_SECRET` ฯลฯ) ครบ — ผ่าน env ของระบบ / PM2 หรือไฟล์ `.env` บน server (โหลดเฉพาะคีย์ที่ยังไม่ถูกตั้งใน environment)
- [ ] ติดตั้งและรีโหลดตาม [Production](#production) (`npm ci --omit=dev` เมื่อ lock เปลี่ยน, `pm2 startOrReload` ฯลฯ)
- [ ] หลาย instance: พิจารณา `RATE_LIMIT_STORE` (เช่น Redis) ตามสถาปัตยกรรม
- [ ] `ecosystem.config.cjs` ตั้ง instances / memory ตาม SLO
- [ ] พอร์ตที่ gateway เข้าถึงได้

### หลัง deploy

- [ ] `GET /healthz` = `200`
- [ ] `GET /readyz` = `200`
- [ ] ตรวจ log (PM2 / Pino) ไม่มี error ตอน boot
- [ ] smoke: `GET /api/v1/me` และ `GET /api/v1/items` พร้อม mesh + user headers (ดู [Smoke tests (API)](#smoke-tests-api))

---

<a id="notes"></a>

## หมายเหตุ

- ห้าม log ค่าลับ (`MONGODB_URI` เต็ม, `GATEWAY_SHARED_SECRET`)
- ทุกการเปลี่ยน index ต้องมี audit ใน `docs/db/erd.md` (ส่วน Indexes)
- ชื่อ process ใน PM2 แนะนำให้สอดคล้อง เช่น `crud-service`
