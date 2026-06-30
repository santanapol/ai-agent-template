# Deploy checklist — Script Compiler, Validate & Test Run

> อ้างอิง [PLAN](./PLAN-script-compiler-validation.md) · [VERIFY-phase5](./VERIFY-phase5.md)

## Pre-deploy (local / CI)

```bash
# smart-report
cd backend/service/smart-report && npm test && npm run lint

# backoffice (frontend)
cd frontend/backoffice && npm test && npm run lint && npm run build

# gateway (after timeout routes)
cd backend/gateway && npm test && npm run lint
```

**Commits ใน release นี้ (6 commits บน `main`):**

| Commit | สรุป |
|--------|------|
| `afaf47c` | Phase 1.1 — withReport + 120s timeout |
| `af94ade` | Phase 1.2 — AST compiler + validator |
| `489cd4c` | Phase 2 — validate/test-run APIs + save gate |
| `d0317dc` | Phase 3 — frontend UI + GET /:id |
| `f3535ba` | Phase 4 — migrate-report-scripts |
| `d9614cf` | Phase 5 — ลบ legacy regex / compile-on-read |

---

## 1. Push & deploy services

```bash
git push origin main
```

Deploy ตาม pipeline ปกติของทีม:

| Service | Port | หมายเหตุ |
|---------|------|----------|
| **smart-report** | 3103 | ตั้ง `REPORT_SCRIPT_TIMEOUT_MS=120000`, `MONGODB_URI_READ`, `TEST_RUN_TOKEN_SECRET` |
| **gateway** | 3000 | อัปเดต `routes.json` / `ROUTES_FILE` — smart-reports timeouts (ดูด้านล่าง) |
| **backoffice** | — | build ใหม่หลัง Phase 3 UI |

### Gateway routes (production)

ต้องมี 3 entries สำหรับ smart-report (longest prefix ชนะ):

```json
{ "prefix": "/api/v1/smart-reports/test-run", "upstream": "http://<smart-report>:3103", "stripPrefix": false, "timeoutMs": 130000 },
{ "prefix": "/api/v1/smart-reports/validate", "upstream": "http://<smart-report>:3103", "stripPrefix": false, "timeoutMs": 10000 },
{ "prefix": "/api/v1/smart-reports", "upstream": "http://<smart-report>:3103", "stripPrefix": false, "timeoutMs": 130000 }
```

`UPSTREAM_TIMEOUT_MS` ทั่วไปยังเป็น 30s ได้ — route เฉพาะ override สำหรับ smart-reports

---

## 2. Migrate prod reports

รันจาก host ที่เข้า MongoDB primary + read replica ได้:

```bash
cd backend/service/smart-report

# ดูผล compile ก่อน
npm run migrate:scripts -- --dry-run

# migrate + test-run จริง
npm run migrate:scripts -- --test-run --fail-on-error
```

**ผ่านเมื่อ:**

- ≥12 reports `updated` (compile + test-run สำเร็จ)
- P1 `Rolling Commission 777WW [New] P1` → `disabled-p1` (`enabled: false`)
- exit code 0

---

## 3. Restart scheduler

```bash
# restart smart-report process (หรือ rolling deploy)
# scheduler โหลด compiledScript ใหม่จาก DB อัตโนมัติ
```

---

## 4. Manual verify (staging → prod)

ตาม [VERIFY-phase5.md](./VERIFY-phase5.md):

- [ ] **Staff Login History** — Manual Run → `recordCount > 0`, ไฟล์ไม่ว่าง
- [ ] **WWL Monthly** — Test Run ใน UI ตรงกับ Manual Run
- [ ] **P1** — `enabled: false` ใน list
- [ ] **Report ใหม่** — Validate → Test Run → Save ผ่าน UI
- [ ] **Scheduler** — report ที่ enabled + schedule รันสำเร็จ (`download_history`)

---

## 5. Rollback (ถ้าจำเป็น)

1. Revert deploy smart-report + gateway + backoffice ไป commit ก่อน `afaf47c`
2. Reports ใน DB ยังมี `script` เดิม — `compiledScript` ไม่ทำให้เก่าพัง แต่ scheduler ต้องการ `compiledScript` หลัง Phase 5
3. ถ้า rollback หลัง migrate: reports ยังมี `compiledScript` อยู่ — ปลอดภัยกว่า rollback ก่อน migrate

---

## Sign-off

| บทบาท | ชื่อ | วันที่ |
|--------|------|--------|
| Dev | | |
| QA / Ops | | |
