# Roadmap: Dynamic Permission — ภาพรวมทุก Phase

> เอกสารแม่ของชุดงาน Dynamic Permission ทั้งระบบ — อัปเดตสถานะที่นี่เมื่อแต่ละ phase ขยับ
> อัปเดตล่าสุด: 2026-06-12 (phase 1 โค้ดเสร็จ รอ review/merge บน branch `feature/auth-dynamic-permissions`)

## Phases

| #   | Phase                                  | Codebase                | Spec                                                             | สถานะ                                        | Dependency                  |
| --- | -------------------------------------- | ----------------------- | ---------------------------------------------------------------- | -------------------------------------------- | --------------------------- |
| 1   | **Auth** — Dynamic Permission in DB    | `backend/auth`          | [SPEC.md](./SPEC.md)                                             | ✅ โค้ดเสร็จ (118/118 tests) รอ review/merge | —                           |
| 2   | **G** — Forward `x-user-permissions`   | `backend/gateway`       | [SPEC.md](../../gateway/_mission-control/SPEC.md)                | ✅ โค้ดเสร็จ (66/66 tests) รอ review/merge   | หลัง 1 merge                |
| 3   | **S** — Permission checks (dual-check) | `backend/service/staff` | [SPEC.md](../../service/staff/_mission-control/SPEC.md)          | 📋 Spec อนุมัติแล้ว พร้อม `/plan`            | **ต้องหลัง G เท่านั้น**     |
| 4   | **F** — Menu + guards                  | `frontend/backoffice`   | [SPEC.md](../../../frontend/backoffice/_mission-control/SPEC.md) | 📋 Spec อนุมัติแล้ว พร้อม `/plan`            | หลัง 1 merge — ขนาน G/S ได้ |
| 5   | **A** — Permission Admin API           | `backend/auth`          | [SPEC-permission-admin-api.md](./SPEC-permission-admin-api.md)   | 📋 Spec อนุมัติแล้ว พร้อม `/plan`            | ทำท้ายสุด (หลัง G/S/F)      |
| (6) | **F2** — หน้าจอจัดการสิทธิ์            | `frontend/backoffice`   | ยังไม่เขียน                                                      | 🔒 จองไว้                                    | หลัง A นิ่ง                 |

## Dependency Graph + ลำดับ Rollout

```
1 Auth (เสร็จ) ──┬──→ 2 G ──→ 3 S ──→ (cleanup: ถอด dual + ลบ static roles)
                 └──→ 4 F            ──→ 5 A ──→ (6) F2
```

- **Critical path**: 1 → 2 → 3 — Phase 4 วิ่งคู่ขนานได้ทันทีที่ 1 merge
- **กฎเหล็กตอน deploy แต่ละ phase**:
  - Phase 1: รัน `node --env-file=.env scripts/seed-permissions.js` บน production **ก่อน** deploy โค้ด (ไม่งั้นผู้ใช้ทุกคนได้ `permissions: []` เมนูหายทั้งระบบ)
  - Phase 3: เริ่มด้วย `PERMISSION_MODE=dual` เสมอ; สลับ `enforce` เมื่อ fallback-hit log = 0 ติดต่อกัน 7 วัน
  - Phase 4: seed catalog เมนูเต็ม (ดู Resolved Questions ใน spec F) ต้อง merge + รันก่อน deploy frontend
  - ทุก phase ถอยกลับได้อิสระ — แต่ละชั้นเป็น additive

## สัญญากลางที่ทุก Phase ต้องเคารพ (ห้ามแก้ฝ่ายเดียว)

1. **Permission Matching Contract**: exact key หรือ wildcard `domain:*` เท่านั้น — implement แล้วที่ `backend/auth/src/lib/permission-match.js` + contract tests; ฝั่ง staff (JS) และ frontend (TS) ต้อง port พร้อม test ชุดเดียวกัน
2. **Header contract**: `x-user-permissions` = comma-separated ค่าดิบไม่ expand; ว่าง = ไม่มีสิทธิ์ (deny by default)
3. **`key` คือ identifier ถาวร** — ห้าม rename (ฝังใน JWT/โค้ด/data); ย้ายเมนูผ่าน `parent_key` เท่านั้น
4. **Escalating action ห้ามอยู่ใน wildcard domain** — เช่น `roles:assign`, `permissions:manage` อยู่ domain ของตัวเอง ไม่อยู่ใต้ `profiles:*`

## ผลกระทบในอนาคต (นอกเหนือ 6 phases)

### Services ที่ยังไม่กระทบแต่จะตามมา

- **`agent-invoice`** และ **`smart-report`** ยังเช็คสิทธิ์จาก `x-user-role` แบบ static — เมื่อต้องการคุมราย action ให้ทำซ้ำ **pattern ของ Phase S** ทั้งชุด (dual-check, fallback log, contract test) โดยไม่ต้องแตะ gateway อีก เพราะหลัง Phase G header `x-user-permissions` ถูกส่งให้**ทุก upstream** อยู่แล้ว
- Action keys ของสอง service นี้ (`invoices:*`, `agents:*`, `reports:*`) ถูก seed เข้า registry บางส่วนตั้งแต่ Phase F (ใช้คุมเมนู) — ตอน service มา enforce จริงให้รีวิว/เพิ่ม key ระดับ action ให้ครบก่อน (เช่น `invoices:cancel`, `reports:export`)

### Checklist เมื่อเพิ่ม service/feature ใหม่เข้าระบบสิทธิ์

1. นิยาม action keys (`domain:action`) + โหนดเมนู → เพิ่มใน `scripts/seed-data/permissions.js` (ฝั่ง auth) → รัน seed
2. Map keys ให้ role ที่เกี่ยวข้องใน `auth_role_permissions` (หรือผ่าน Admin API หลัง Phase A)
3. Service เช็ค `x-user-permissions` ตาม Matching Contract (copy contract tests ไปด้วยเสมอ)
4. Frontend เพิ่ม key → `MENU_UI` map (icon/route)
5. ห้ามตั้ง escalating action ใต้ domain ที่แจกเป็น wildcard

### หนี้ทางเทคนิคที่วางแผนไว้แล้ว (ต้องกลับมาเก็บ)

- **ถอด dual-check + ลบ `isAdminRole`/`ADMIN_ROLES`** ใน staff หลัง `enforce` นิ่ง (เกณฑ์อยู่ใน spec S — Resolved 2)
- **ขนาด JWT**: เฝ้า warning `access JWT exceeds soft size limit` ใน log — เมื่อ permissions ต่อ role โตขึ้น แก้ที่ข้อมูล (ยุบเป็น wildcard) ไม่ใช่ขยาย `ACCESS_JWT_SOFT_LIMIT_BYTES`; ทางหนีสุดท้ายถ้า key เยอะมากจริง: ถอดเคลมออกจาก JWT แล้วให้ gateway resolve จาก DB/cache (ดีไซน์ปัจจุบันเปิดทางไว้แล้ว — frontend ใช้ permissions จาก response body ไม่ได้พึ่งการ decode JWT)
- **OU-specific permissions**: data model รองรับแล้ว (fallback ต่อคู่ `(ou_id, role)`) แต่ Admin API phase A จำกัด Global — ปลดล็อคเมื่อมี use case จริงโดย URL ไม่เปลี่ยน
- **Label เมนูภาษาไทย**: เปลี่ยนได้ทาง data ล้วน ๆ (ไม่ต้อง deploy) หลังระบบนิ่ง
- **Staleness**: การแก้สิทธิ์มีผลเมื่อ refresh token (≤ `ACCESS_TOKEN_TTL_SECONDS`) — เคสเร่งด่วนใช้ `revoke_sessions` (Phase A) หรือ `revokeSessionsByUser` เดิม; ถ้าอนาคตต้องการ real-time ค่อยพิจารณา push invalidation (ยังไม่มีแผน)
