# คู่มือ QA Code Audit — Frontend

> **สถานะ:** คู่มือ (draft) — ยังไม่ได้สร้าง agent skill หรือ slash command
> **อ่านคู่กับ:** [Common (SoT, workflow, playbook, report)](./qa-code-audit-common.md) · [Backend checklist](./qa-code-audit-backend.md)

อ้างอิง **spec + design standard** — ไม่ใช่แค่ "render ได้"

**เครื่องมือ:** Vitest + RTL, Playwright, DevTools MCP / browser audit

อ่านเพิ่ม: `coding-standard/software-testing/01-unit-testing/`, `08-e2e-testing/`

---

## 1. Unit testing

formatters, hooks, utils — empty list, null data, error mapping, branch-scoped helpers, stale cache

**Bug-hunt:** snapshot ใหญ่โดยไม่รู้ behavior; mock return ค่า "สวย" ไม่ใช่ API จริง

## 2. Component testing

| ตรวจ | |
|------|--|
| Loading / empty / error | ทุก data-fetching component |
| Submit disabled | ป้องกัน double-click |
| Form validation | ตรง spec |
| Table | sort/filter/pagination → query ถูก |
| Destructive action | confirm modal |
| Permission-based render | element ที่ user ไม่มีสิทธิ์ **ถูกซ่อนจริง** ไม่ใช่แค่ disable (เช็ค DOM ไม่ leak action/data) |

**Bug-hunt:** success toast ทั้งที่ API fail; optimistic UI ไม่ rollback; ขาด `await` async; optimistic update สำเร็จ แต่ refetch ที่มาช้ากว่ามา overwrite state ที่ user เพิ่งเห็น

## 3. API integration layer

| ตรวจ | |
|------|--|
| URL, method, body | ตรง OpenAPI |
| Auth | ผ่าน gateway ถูกต้อง |
| Error envelope | parse `success: false`, `code` |
| Duplicate fetch | ดู network checklist |
| Payload size | threshold จาก audit baseline |
| Network resilience | timeout / slow response / retry — UI ไม่ค้างหรือ error เงียบ |

**ต้นแบบ:** `frontend/backoffice-next/docs/NETWORK-VERIFY-CHECKLIST.md`

**Bug-hunt:** Strict Mode double-fetch ใน dev (ดู env ใน checklist); `useEffect` refetch loop; endpoint ที่ deprecate แล้ว

## 4. E2E testing

- Login → navigate → core action
- CRUD round-trip: create → list → edit → refresh ค่าตรง → delete
- Branch switcher เปลี่ยน scope
- Bulk actions partial failure
- Deep link / refresh บน protected route
- Multi-tab: logout tab หนึ่ง → tab อื่นต้องไม่ mutate ด้วย token/state เก่าได้อีก

## 5. Browser audit (manual / MCP)

- Console errors/warnings
- Network 4xx/5xx ที่ UI กลืน
- Responsive layout break
- Focus trap ใน modal
- Payload ใหญ่ผิดปกติ

## 6. Cross-layer verification

จาก `docs/intent/backoffice-feature-parity-audit.md`:

1. **UI round-trip** — save → refresh → ค่าตรง
2. **DB direct** — query Mongo หลัง save เปรียบกับ UI

UI ถูกแต่ DB ผิด = defect ร้ายแรง

## 7. Design alignment (backoffice-next)

- Pattern จาก `coding-standard/frontend/backoffice/reference/studio-admin`
- ไม่ copy `frontend/backoffice` (archive) โดยไม่ตั้งใจ

---

## Coverage gap ที่ต้องเพิ่ม

จาก gap analysis 2026-07-09 — รายการนี้ **ไม่เคยถูกตรวจ** โดย checklist เดิม (1–7 ด้านบน)
ต้อง probe เพิ่มก่อนปิด audit ที่แตะ area เสี่ยง

| หมวด | ทำไมสำคัญ | วิธี probe |
|------|-----------|------------|
| **Accessibility (a11y)** | ไม่มี item ตรวจใน checklist เดิมเลย — keyboard nav / ARIA / focus order นอกเหนือจาก "focus trap ใน modal" | รัน skill `fixing-accessibility` แยก หรืออย่างน้อย tab-through หน้าหลักด้วย keyboard, ตรวจ screen-reader label ของ form/table หลัก |
| **i18n / locale** | ถ้า backoffice-next รองรับหลาย locale — format ตัวเลข/วันที่/currency ต่าง locale ไม่เคยถูกตรวจ | สลับ locale (ถ้ามี) เช็ค format ตัวเลข/วันที่/ข้อความยาวไม่ overflow |
| **Multi-tab / stale session** | มีแค่ "tab stale" 1 บรรทัดเดิม ไม่ลึกพอ | logout ใน tab หนึ่ง เช็ค tab อื่นเรียก mutation แล้วต้อง reject/redirect ไม่ใช่ silent fail |
| **Optimistic update race (success path)** | checklist เดิมเช็คแค่กรณี fail-rollback ไม่เช็คกรณี success ที่ refetch ทับ state ใหม่ | กด action เร็ว ๆ ต่อกัน 2 ครั้ง เช็คว่า final UI ตรงกับ server state ไม่ใช่ state ค้างจาก optimistic ตัวแรก |
| **Permission-based UI hide vs disable** | component checklist เดิมเช็คแค่ "submit disabled" ไม่เช็คว่า unauthorized element ถูกซ่อนจริง | login เป็น role ต่ำสุด เช็ค DOM ไม่มี element/action ที่ role นั้นไม่ควรเห็น (ไม่ใช่แค่ disabled attribute) |
| **Network resilience** | มีแค่ duplicate fetch / payload size ไม่มีเรื่อง timeout/retry | throttle network (DevTools MCP) เช็คว่า UI แสดง error ชัดเจน ไม่ค้างเงียบ |

---

## Frontend severity

| Severity | ตัวอย่าง |
|----------|----------|
| **Critical** | แสดงข้อมูลคนอื่น, save ไม่ persist, silent data loss, unauthorized element ไม่ถูกซ่อน (permission leak) |
| **High** | Action หลักพัง, wrong scope, API error ไม่แจ้ง user, multi-tab stale session ให้ mutate ได้หลัง logout |
| **Medium** | Edge UI state, duplicate fetch มีผล performance, optimistic-race ที่กระทบเฉพาะ UI ชั่วคราว |
| **Low** | Copy/text, spacing (เว้นแต่ spec กำหนด), a11y ระดับ cosmetic |

---

## ต้นแบบ ใน repo

| เอกสาร | ใช้เป็นแนว |
|--------|------------|
| `docs/intent/backoffice-feature-parity-audit.md` | parity + CRUD + DB verify |
| `frontend/backoffice-next/docs/NETWORK-VERIFY-CHECKLIST.md` | duplicate API, payload threshold |
