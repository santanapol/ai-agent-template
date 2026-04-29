# API Example Runbook

เอกสารสำหรับรันและดูแล `reference` ในเครื่องและสภาพแวดล้อมจริง

**ที่ตั้งโปรเจกต์:** ถ้า clone repo นี้โดยตรง ให้ใช้คำสั่งจาก **root ของ repo** ถ้าใช้ร่วมกับ [ai-agent workspace](https://github.com/santanapol/ai-agent-cursor) โปรเจกต์มักอยู่ที่ `project-active/access-platform/access/reference/` — `cd` เข้าไปก่อนรันคำสั่งด้านล่าง

## Table of contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Development](#development)
4. [Production](#production)
5. [Health checks](#health-checks)
6. [API contract](#api-contract)
7. [Smoke test (CRUD)](#smoke-test-crud)
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
| Service     | `reference`                                               |
| Node.js     | `>=24 <25`                                                  |
| Database    | MongoDB ชื่อ `api_example`                                  |
| Development | `npm run dev` — ดู [Development](#development)              |
| Production  | PM2 + `ecosystem.config.cjs` — ดู [Production](#production) |

มาตรฐานอ้างอิง: ดู [`openapi.yaml`](../openapi.yaml) ในแพ็กเกจนี้ — ชุดมาตรฐาน org อยู่ที่ [`_coding-standards/`](../../../_coding-standards/README.md) ใต้ root ของ monorepo (`access-platform`) รวม [`backend/`](../../../_coding-standards/backend/README.md) สำหรับ contract / envelope

---

<a id="configuration"></a>

## การตั้งค่า (`.env`)

จาก root ของ repo นี้:

```bash
cp .env.example .env
```

ตัวแปรที่ต้องมีและควรตรวจก่อนรัน:

| ตัวแปร                  | หมายเหตุ                                                        |
| :---------------------- | :-------------------------------------------------------------- |
| `PORT`                  | เช่น `3000` (ใช้ในตัวอย่าง `curl` ด้านล่าง — เปลี่ยนตามค่าจริง) |
| `DB_NAME`               | `api_example`                                                   |
| `MONGODB_URI`           | connection string ที่มี user/password และ `authSource` ถูกต้อง  |
| `GATEWAY_SHARED_SECRET` | ต้องตรงกับค่าที่ gateway ส่งมาใน `x-gateway-secret`             |

**ไฟล์ `.env`:** ถ้ามีที่ root ของ repo แอปจะโหลดและตั้งเฉพาะตัวแปรที่ยังไม่มีใน `process.env` (ค่าจาก PM2 / systemd / shell มาก่อนเสมอ — ไม่ถูกทับ) ดู `src/config/load-local-env.js`  
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

```bash
npm run lint
npm test
npm run format
```

หลังขึ้นปกติ เรียก health ได้ (ดู [ตรวจสุขภาพ](#health-checks))

---

<a id="production"></a>

## Production (server)

ใช้บน server จริง — `ecosystem.config.cjs` ตั้ง `NODE_ENV=production`, `TZ=UTC`, และ `PORT` เริ่มต้น; ปรับค่าใน ecosystem หรือ inject ผ่าน environment ตามนโยบายทีม

**ติดตั้ง dependencies (production เท่านั้น)**

```bash
npm ci --omit=dev
```

**เริ่มรันครั้งแรก (หรือหลัง `pm2 delete reference`)**

```bash
pm2 start ecosystem.config.cjs
pm2 status
pm2 logs reference
```

**อัปเดตหลัง deploy โค้ด** (สั่งจาก root ของ repo บน server)

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
pm2 restart reference
pm2 stop reference
pm2 delete reference
```

**ทางเลือก (ไม่ใช้ PM2):** จาก root ของ repo หลังตั้ง env แล้ว

```bash
NODE_ENV=production npm start
```

---

<a id="health-checks"></a>

## ตรวจสุขภาพ

แทน `3000` ด้วยค่า `PORT` จริงถ้าไม่ใช้ค่าเริ่มต้น

| Endpoint        | คำสั่ง                                  | ผลที่คาดหวัง                                |
| :-------------- | :-------------------------------------- | :------------------------------------------ |
| Liveness        | `curl -s http://localhost:3000/healthz` | `200` — process ยังมีชีวิต                  |
| Readiness       | `curl -s http://localhost:3000/readyz`  | `200` — MongoDB ping ผ่าน                   |
| Readiness (ล้ม) | เหมือนบรรทัดบน                          | `503` + `SERVICE_UNAVAILABLE` — DB ไม่พร้อม |

---

<a id="api-contract"></a>

## สัญญา API (headers และ concurrency)

**Headers บังคับสำหรับ CRUD**

- `x-gateway-secret`
- `x-user-id`
- `x-user-ou`
- `x-user-branch`

**Optimistic concurrency**

- `POST` create: ได้ `ETag` และ `Location` ใน response headers
- `GET` รายการเดียว / `PATCH` / `PUT` / `DELETE`: ต้องใช้ `If-Match` ตาม `ETag` ล่าสุด (รายละเอียดตาม `_coding-standards/backend/tenant-audit.md` เมื่อมี workspace มาตรฐาน)

---

<a id="smoke-test-crud"></a>

## Smoke test (CRUD)

ใช้ได้ทั้งหลัง [Development](#development) (`npm run dev`) หรือชี้ `BASE_URL` ไป staging/production

ตั้งค่า shell ใช้ซ้ำ:

```bash
BASE_URL="http://localhost:3000"
GW_SECRET="replace-me"

COMMON_HEADERS=(
  -H "x-gateway-secret: ${GW_SECRET}"
  -H "x-user-id: user-001"
  -H "x-user-ou: ou-001"
  -H "x-user-branch: bkk-01"
)
```

ลำดับที่แนะนำ:

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

| HTTP  | `code` (ตัวอย่าง)              | สาเหตุโดยย่อ                                   |
| :---- | :----------------------------- | :--------------------------------------------- |
| `400` | `INVALID_HEADER`               | `Accept` ไม่รองรับ / header สำคัญซ้ำ           |
| `401` | `GATEWAY_SECRET_REJECTED`      | `x-gateway-secret` ผิดหรือไม่มี                |
| `403` | `MISSING_GATEWAY_USER_CONTEXT` | ขาด `x-user-*` ที่บังคับ                       |
| `412` | `VERSION_CONFLICT`             | `If-Match` ผิดรูปแบบหรือไม่ตรงเวอร์ชันปัจจุบัน |
| `428` | `PRECONDITION_REQUIRED`        | ขาด `If-Match` บน `PATCH` / `PUT` / `DELETE`   |
| `429` | (rate limit)                   | เกินโควตา (write เข้มกว่า read)                |
| `503` | `SERVICE_UNAVAILABLE`          | MongoDB ไม่พร้อม                               |

รายละเอียดเต็มดู `openapi.yaml` และ (ถ้ามีใน workspace) `_coding-standards/backend/codes.yaml`

---

<a id="troubleshooting"></a>

## แก้ปัญหา (Troubleshooting)

| อาการ                       | สิ่งที่ตรวจ                                                                                                                                                                                                                                         |
| :-------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/readyz` = `503`           | MongoDB รันอยู่หรือไม่; `MONGODB_URI` / `DB_NAME` / user / `authSource`                                                                                                                                                                             |
| CRUD = `401` / `403`        | ครบ headers หรือไม่; `x-gateway-secret` ตรง `GATEWAY_SHARED_SECRET`                                                                                                                                                                                 |
| `PATCH` / `DELETE` = `412`  | ดึง `ETag` ใหม่จาก `GET` แล้วส่ง `If-Match` ใหม่                                                                                                                                                                                                    |
| `429`                       | รอ reset window; write จำกัดเข้มกว่า read                                                                                                                                                                                                           |
| `GET /api/v1/items` ได้ `data: []` | แอปอ่าน MongoDB ตาม **`DB_NAME`** (ค่าเริ่มต้น `api_example`) และ collection **`items`** — ตรวจใน Compass ว่าเอกสารอยู่ database เดียวกัน; ถ้าข้อมูลอยู่ database อื่น ให้ตั้ง `DB_NAME` / URI ให้ตรง หรือย้ายข้อมูลเข้า `api_example`. ส่ง **`x-user-ou`** / **`x-user-branch`** เป็น **สตริง hex 24 ตัว** ให้ตรง `ou_id` / `branch_id` ในเอกสาร |
| `MODULE_NOT_FOUND` ตอน boot | รัน `npm ci` ที่ root ของ repo; ตรวจว่ามี `node_modules/pino`; ถ้า `NODE_ENV` ไม่ใช่ `production` แต่ติดตั้งแบบ `--omit=dev` โค้ดจะข้าม `pino-pretty` ถ้าไม่มีแพ็กเกจ — บน server ให้ยึด [Production](#production) (`NODE_ENV=production` ผ่าน PM2) |

---

<a id="pre-merge-quality-gate"></a>

## ก่อน merge (quality gate)

```bash
npm run lint
npm test
```

---

<a id="production-handoff"></a>

## มอบงาน production

### ก่อน deploy

- [ ] `npm test` ผ่าน
- [ ] `npm run lint` ผ่าน
- [ ] `openapi.yaml` สอดคล้อง implementation
- [ ] index บน DB ตรงแผนใน `docs/indexes/items.md`
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
- [ ] smoke: `GET /api/v1/items` พร้อม secret และ user headers

---

<a id="notes"></a>

## หมายเหตุ

- ห้าม log ค่าลับ (`MONGODB_URI` เต็ม, `GATEWAY_SHARED_SECRET`)
- ทุกการเปลี่ยน index ต้องมี audit ใน `docs/indexes/<collection>.md`
- ชื่อ process ใน PM2 แนะนำให้สอดคล้อง เช่น `reference`
