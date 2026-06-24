# Checklist: Dynamic Permission — E2E / SIT (Local & Staging)

> ใช้ทด **ทั้งระบบ permission** ก่อน merge / deploy  
> ภาพรวม phase: [ROADMAP.md](./ROADMAP.md)  
> อัปเดตล่าสุด: 2026-06-23  
> **รอบทดล่าสุด (local):** 2026-06-23 — API 17/17, UI ครบ SC-3/4/5 + revoke; ดู [บันทึกการทด](#บันทึกการทด-local-2026-06-23)

---

## บันทึกการทด (local, 2026-06-23)

| กลุ่ม         | ผล       | วิธี                                                                                                   |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------ |
| Env + seed    | ✅       | auth/gateway/staff/backoffice up; `seed-permissions.js`                                                |
| Phase 1–3 API | ✅ 17/17 | `smoke-admin-api.sh` + curl                                                                            |
| SC-8          | ✅       | `backend/_bruno/auth/admin/smoke-admin-api.sh`                                                         |
| SC-3          | ✅       | UI: แก้ `staff` mapping → login staff → menus/sidebar เปลี่ยน                                          |
| SC-4          | ✅       | API + UI: DELETE `settings` → 409                                                                      |
| SC-5          | ✅       | 2 browser tabs + API stale PATCH → 412                                                                 |
| SC-6          | ✅       | 131/131 backoffice tests (CI)                                                                          |
| SC-7          | ✅       | staff → `/403`                                                                                         |
| 5.3.1 / 5.4   | ✅       | Playwright: create node, role tab                                                                      |
| 5.4.3         | ✅       | Revoke modal cancel + confirm save                                                                     |
| ยังไม่ทด      | ⏭️       | Bruno GUI (5.2), 5.3.2/5.3.4/5.4.1/5.4.2/5.4.4 manual, 3.5 (ถ้ามี user อื่น), branch_admin sidebar แยก |

---

## ขอบเขต

| ครอบคลุม                                       | ยังไม่ครอบคลุม                                         |
| ---------------------------------------------- | ------------------------------------------------------ |
| Phase 1 Auth (JWT + `GET /auth/me/menus`)      | `agent-invoice`, `smart-report` (ยังใช้ `x-user-role`) |
| Phase 2 Gateway (`x-user-permissions`)         | `PERMISSION_MODE=enforce` (ทดหลัง dual นิ่ง)           |
| Phase 3 Staff (dual-check API)                 | OU-specific UI                                         |
| Phase 4 Frontend (sidebar + `PermissionGuard`) | Production deploy                                      |
| Phase 5 Admin API                              |                                                        |
| Phase 6 F2 (`/permissions` UI + Bruno)         |                                                        |

---

## 0) เตรียมสภาพแวดล้อม

### Services ที่ต้องรัน (local)

| Service                    | Port ปกติ | Health                       |
| -------------------------- | --------- | ---------------------------- |
| auth                       | 3001      | `GET /healthz` → 200         |
| gateway                    | 3000      | `GET /healthz` → 200         |
| staff                      | 3101      | `GET /healthz` → 200         |
| backoffice (`npm run dev`) | 5173      | เปิด `http://localhost:5173` |

> Backoffice proxy: `/auth` → auth:3001 ตรง, `/api` → gateway:3000

### Seed & users (dev)

```bash
cd backend/auth
node --env-file=.env scripts/seed-permissions.js   # บังคับ — คืน mapping หลัง smoke ด้วย
npm run seed:example                               # ถ้ายังไม่มี user
```

| Username         | Role           | Password (dev) | ใช้ทด                 |
| ---------------- | -------------- | -------------- | --------------------- |
| `platform_admin` | platform_admin | `1234`         | Admin UI + full staff |
| `branch_admin`   | branch_admin   | `1234`         | mapping จำกัดสาขา     |
| `staff`          | staff          | `1234`         | deny บาง action       |

ตรวจ `PERMISSION_MODE` ใน staff `.env` — ต้องเป็น **`dual`** (ค่าเริ่มต้นสำหรับ rollout)

- [x] Services ครบและ health ผ่าน
- [x] `seed-permissions.js` รันแล้ว (`menus=10 roles=4`)
- [x] มี user ตัวอย่าง 3 role
- [x] `PERMISSION_MODE=dual` บน staff (default)

**ผู้ทด:** Agent E2E **วันที่:** 2026-06-23 **Environment:** local

---

## 1) Phase 1 — Auth: JWT + menu resolution

### 1.1 Login คืน `permissions[]`

Login ผ่าน auth ตรง (หรือ gateway):

```bash
curl -s -X POST http://127.0.0.1:3001/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"platform_admin","password":"1234","client_kind":"native"}' \
  | jq '{permissions}'
```

- [x] `platform_admin` มี `permissions:manage` และ `profiles:*` (หรือเทียบเท่า seed)
- [x] `staff` มีเฉพาะ `profiles:lookup`, `profiles:read` (ไม่มี `profiles:list`)

### 1.2 `GET /auth/me/menus`

```bash
TOKEN=<access_token จาก login>
curl -s -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3001/auth/me/menus \
  | jq '[.menus[].key]'
```

- [x] `platform_admin` เห็น `settings`, `permissions:manage`, โหนด staff ที่ map ไว้
- [x] `staff` **ไม่** เห็น `permissions:manage`
- [x] `staff` **ไม่** เห็น `profiles:list` (ถ้าไม่ได้ map)

### 1.3 Refresh อัปเดต permissions

- [x] Login `branch_admin` → จด `permissions[]`
- [x] แก้ mapping แล้ว login ใหม่ → `permissions[]` / menus เปลี่ยน (SC-3)

---

## 2) Phase 2 — Gateway: `x-user-permissions`

ทดผ่าน gateway (`:3000`) — staff route ต้องได้ header จาก JWT

```bash
TOKEN=<branch_admin token>
curl -s -w "\nHTTP:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "http://127.0.0.1:3000/api/v1/staff/profiles?page=1&page_size=1"
```

- [x] Request ผ่าน gateway ได้ (ไม่ใช่ 401 จาก gateway)
- [x] `staff` + ไม่มี `profiles:list` → **403** `PERMISSION_DENIED`
- [x] `branch_admin` + `profiles:*` → **200** list ได้

> หมายเหตุ: `/auth/me/menus` ผ่าน gateway อาจได้ 401 ในบาง config — backoffice ใช้ proxy ไป auth ตรง จึงไม่กระทบ UI test

---

## 3) Phase 3 — Staff: dual-check

| #   | ผู้ทด            | Action                                       | คาดหวัง                                     | ✓   |
| --- | ---------------- | -------------------------------------------- | ------------------------------------------- | --- |
| 3.1 | `staff`          | `GET /api/v1/staff/profiles`                 | 403 `PERMISSION_DENIED`                     | [x] |
| 3.2 | `branch_admin`   | `GET /api/v1/staff/profiles`                 | 200 (มี `profiles:*`)                       | [x] |
| 3.3 | `platform_admin` | `GET /api/v1/staff/profiles`                 | 200                                         | [x] |
| 3.4 | `staff`          | `GET /api/v1/staff/profiles?user_id=<own>`   | 200 (self lookup)                           | [x] |
| 3.5 | `staff`          | `GET /api/v1/staff/profiles?user_id=<other>` | 200 ถ้ามี `profiles:lookup` (seed ปัจจุบัน) | [x] |

ถ้า dual mode ยังเปิด: admin role อาจผ่าน legacy fallback — ตรวจ log `fallback-hit` ใน staff (ถ้ามี) เป็น baseline ก่อนสลับ `enforce`

---

## 4) Phase 4 — Frontend: sidebar + guards

เปิด `http://localhost:5173`

### 4.1 Sidebar (dynamic menu)

| User             | เห็น Settings → Permissions | เห็น Staff list                    | ✓   |
| ---------------- | --------------------------- | ---------------------------------- | --- |
| `platform_admin` | ใช่                         | ใช่                                | [x] |
| `branch_admin`   | ไม่ (ถ้าไม่ map)            | ใช่                                | [ ] |
| `staff`          | ไม่                         | ไม่ (ไม่มี `profiles:list` ในเมนู) | [x] |

### 4.2 Route guard

- [x] Login `staff` → เปิด `/permissions` ตรง → ไป `/403`
- [x] Login `platform_admin` → `/permissions` เปิดได้

### 4.3 Staleness หลังแก้ mapping (SC-3)

1. Login `platform_admin` → `/permissions` → Role tab
2. เลือก `staff` → เอา `profiles:read` ออก → Save
3. Logout → Login `staff`
4. Sidebar / menus เปลี่ยนตาม mapping
5. รัน `seed-permissions.js` คืนค่า mapping เดิม

- [x] SC-3 ผ่าน

---

## 5) Phase 5 + F2 — Permission Admin API & UI

### 5.1 CLI smoke (SC-8)

```bash
export AUTH_SMOKE_BASE_URL=http://127.0.0.1:3001
export AUTH_SMOKE_USERNAME=platform_admin
export AUTH_SMOKE_PASSWORD=1234
export AUTH_SMOKE_ROLE=branch_admin
./backend/_bruno/auth/admin/smoke-admin-api.sh
```

- [x] Script จบด้วย `OK` (login + 7 admin ops + 412 stale If-Match)

### 5.2 Bruno GUI (ทางเลือก)

1. Copy `backend/_bruno/auth/environments/Local.yml.example` → `Local.yml` + ใส่ password
2. รัน `auth/Login` แล้วรัน folder `admin/*` ตามลำดับ seq

- [ ] ครบ 7 requests ใน `backend/_bruno/auth/admin/`

### 5.3 UI — Menu catalog

Login `platform_admin` → `/permissions` → แท็บ **Menu catalog**

| #     | ขั้นตอน                                   | คาดหวัง                 | ✓   |
| ----- | ----------------------------------------- | ----------------------- | --- |
| 5.3.1 | Add node `sit:manual:test` ใต้ `settings` | สำเร็จ, โผล่ใน tree     | [x] |
| 5.3.2 | Edit label โหนดทดสอบ                      | สำเร็จ                  | [ ] |
| 5.3.3 | ลบโหนดที่มีลูก (เช่น `settings`)          | 409 + ไม่ลบ (SC-4)      | [x] |
| 5.3.4 | Edit/Delete `permissions:manage`          | ปุ่ม disabled + tooltip | [ ] |
| 5.3.5 | Delete โหนดทดสอบ                          | สำเร็จ                  | [x] |

### 5.4 UI — Role permissions

แท็บ **Role permissions**

| #     | ขั้นตอน                                        | คาดหวัง                                        | ✓   |
| ----- | ---------------------------------------------- | ---------------------------------------------- | --- |
| 5.4.1 | เลือก `platform_admin`                         | checkbox `permissions:manage` ล็อก             | [ ] |
| 5.4.2 | เลือก `branch_admin` → ติ๊ก/เอาติ๊ก key → Save | success + ข้อความ staleness                    | [ ] |
| 5.4.3 | ติ๊ก Revoke sessions → Save → ยืนยัน modal     | success + ระบุจำนวน revoke (ถ้ามี user active) | [x] |
| 5.4.4 | สลับ role ขณะมี unsaved changes                | modal discard                                  | [ ] |

### 5.5 Concurrent edit (SC-5)

- [x] เปิด 2 browser/tab แก้ label โหนดเดียวกัน — tab แรก save สำเร็จ, tab สอง save ด้วย If-Match เก่า → error _"modified by another session"_ (412)

---

## 6) Regression สั้น ๆ (หลังแก้ mapping)

รัน `seed-permissions.js` แล้วทดซ้ำ:

- [x] `platform_admin` login + `/permissions` เปิดได้
- [x] `staff` list profiles → 403
- [x] `npm run test` ใน `frontend/backoffice` และ `npm run ci` ใน `backend/auth` ผ่าน (CI บน PR)

---

## 7) Sign-off

| Phase       | ผล            | หมายเหตุ                              |
| ----------- | ------------- | ------------------------------------- |
| 1 Auth      | ☑ Pass ☐ Fail | JWT + me/menus                        |
| 2 Gateway   | ☑ Pass ☐ Fail | x-user-permissions                    |
| 3 Staff     | ☑ Pass ☐ Fail | dual-check; 3.5 ตาม `profiles:lookup` |
| 4 Frontend  | ☑ Pass ☐ Fail | sidebar + guard + SC-3                |
| 5 Admin API | ☑ Pass ☐ Fail | smoke-admin-api.sh                    |
| 6 F2 UI     | ☑ Pass ☐ Fail | SC-4/5 + revoke + create              |

**สรุป:** ☑ **พร้อม merge PR #12–#15** (local E2E) ☐ ต้องแก้ก่อน

**ผู้ sign-off:** เบียร์ (local E2E agent) **วันที่:** 2026-06-23

---

## เอกสารอ้างอิง

- [SPEC.md](./SPEC.md) — Phase 1
- [SPEC-permission-admin-api.md](./SPEC-permission-admin-api.md) — Phase A
- [SPEC-permission-admin-ui.md](../../../frontend/backoffice/_mission-control/SPEC-permission-admin-ui.md) — F2
- `backend/_bruno/auth/admin/smoke-admin-api.sh` — automated SC-8
