---
status: active
created: 2026-07-10
updated: 2026-07-10
services: [backoffice-next]
source-review: /review five-axis on PR #54 (api-network-audit-fixes)
parent-audit: frontend/backoffice-next/docs/API-NETWORK-AUDIT-2026-07-09.md
parent-plan: docs/exec-plans/completed/api-network-audit-frontend-2026-07-09.md
---

# Plan: FE network-audit review follow-ups (backoffice-next)

## Objective

บันทึกผลการรีวิวห้าแกน (`/review`) หลัง merge PR #54 — งาน NET/PAY ผ่าน verify แล้ว แต่มี correctness/architecture ที่ต้องแก้ก่อนถือว่าปิดสนิท  
**ยังไม่ลงมือแก้ในรอบนี้** — รวมแก้ทีเดียวตาม tasks ด้านล่าง

## Progress log

- 2026-07-10: บันทึก findings จาก five-axis review ของ `frontend/backoffice-next` (scope PR #54 / merge `5123b2e`); verdict = **Request changes**; รอ batch fix
- 2026-07-10: branch `fix/fe-network-audit-review-followups-2026-07-10` — แก้ FE-REV-001…007 + เทส; รอ CI / PR
- 2026-07-10: แก้ FE-REV-008 (peek cache ก่อน loading) + FE-REV-009 (branch search a11y) + เทส

## Decision log

- 2026-07-10: เก็บเป็น active exec plan + tech-debt rows แทนการแก้ทันที — ผู้ใช้ขอ “บันทึกก่อน แก้ทีเดียว”
- 2026-07-10: ไม่รัน Bugbot / Security Review เพิ่มในรอบนี้ (ยังไม่เลือก)

## Context

| Item | Value |
|------|-------|
| Scope | `frontend/backoffice-next` — API Network Audit fixes |
| Merge | PR #54 → `5123b2e` |
| Verify | [`NETWORK-VERIFY-CHECKLIST.md`](../../../frontend/backoffice-next/docs/NETWORK-VERIFY-CHECKLIST.md) PASS on `:3006` (2026-07-09) |
| Verdict | **Request changes** — NET/PAY goals OK; แก้ Critical/Important ก่อน Approve |

## Findings (ordered by severity)

### Critical — ต้องแก้ก่อน merge รอบถัดไป / ก่อนถือว่าปิด

#### FE-REV-001 — Truncated switcher list ปน invoice branch cache

| | |
|--|--|
| **Severity** | Critical |
| **Axis** | Correctness + Architecture |
| **Files** | `src/layouts/AdminLayout.tsx` (~272–287), `src/views/invoices/InvoiceList.tsx` (~186–189), `src/lib/branchOptions.ts` (`setCachedInvoiceAgentBranches` / `getCachedInvoiceAgentBranches`) |
| **Problem** | Branch switcher โหลด `listMyBranches({ limit: 20 })` แล้วเขียนลง `setCachedInvoiceAgentBranches`. Invoice filter อ่าน cache เดียวกัน → org ที่มีสาขา >20 อาจเห็นตัวกรองไม่ครบ |
| **Fix** | อย่าเขียนผลที่จำกัดจำนวนลง invoice/agent shared cache; แยก cache key ของ switcher (`auth:ouId:q:limit`) กับ catalog เต็ม (`auth:ouId` / `invoice-agent:ouId`); หรือรวมเป็น `branchCatalogCache` เดียวแล้วไม่ใช้ legacy slot สำหรับ limited results |
| **Test gap** | ยังไม่มีเทสว่า switcher `limit:20` ต้องไม่ poison invoice cache |
| **Tech debt** | TD-023 |

#### FE-REV-002 — `invoiceAgentsRequestedRef` บล็อก refetch เมื่อ auth เปลี่ยน

| | |
|--|--|
| **Severity** | Critical |
| **Axis** | Correctness |
| **Files** | `src/views/invoices/InvoiceList.tsx` (~175–179), `src/views/invoices/hooks/useInvoices.ts` (`fetchInvoiceAgents` deps: `user?.ou_id`, `user?.role`) |
| **Problem** | Ref ตั้ง `true` หลังเรียกครั้งแรก — ถ้า `ou_id`/`role` เปลี่ยนขณะหน้ายัง mount จะข้าม `fetchInvoiceAgents` → สาขาค้างเก่า |
| **Fix** | ผูก ref กับ `ou_id`+`role` หรือเลิกใช้ ref แล้วพึ่ง `invoiceAgentsInflight` + `branchCatalogCache` |
| **Test gap** | ยังไม่มีเทส refetch เมื่อ `ou_id`/`role` เปลี่ยน |
| **Tech debt** | TD-024 |

### Important — ควรแก้ใน batch เดียวกัน

#### FE-REV-003 — `StaffManagement` fetch-key guard ทิ้ง reload ที่จำเป็น

| | |
|--|--|
| **Severity** | Important |
| **Axis** | Correctness |
| **Files** | `src/views/StaffManagement.tsx` (~118–148) |
| **Problem** | ถ้า effect รันซ้ำด้วย `fetchKey` เดิมขณะ request เก่ายังค้าง effect ใหม่ return; request เก่าจบแบบ `cancelled` → ตารางว่าง/ค้างได้ |
| **Fix** | ใช้ `AbortController` หรือเคลียร์ `listFetchKeyRef` ใน cleanup — อย่าใช้ “key เดิม = ข้าม” ข้ามรอบที่ถูก cancel |
| **Test gap** | race นี้ยังไม่มีเทส |
| **Tech debt** | TD-025 |

#### FE-REV-004 — สองระบบ cache สาขาซ้อนกัน

| | |
|--|--|
| **Severity** | Important (structural; ผูกกับ FE-REV-001) |
| **Axis** | Architecture / Readability |
| **Files** | `src/lib/branchCatalogCache.ts`, `src/lib/branchOptions.ts` |
| **Problem** | Session catalog (keyed + single-flight) กับ legacy OU slot (`cachedBranchesByOu`) ทำให้ ownership ไม่ชัด และเป็นต้นเหตุของ FE-REV-001 |
| **Fix** | รวมเป็น catalog เดียว หรือเอกสาร ownership ชัด + ห้าม limited results เข้า legacy slot |
| **Tech debt** | รวมใน TD-023 |

### Optional / Nit — ทำได้ใน batch หรือรอบถัดไป

| ID | Severity | Summary | Suggested fix |
|----|----------|---------|---------------|
| FE-REV-005 | Optional | `invalidateBranchCatalog` ใช้ `key.includes(\`:${ouId}\`)` อาจ false-match | parse key ให้ตรง (`startsWith` + exact ou segment) |
| FE-REV-006 | Nit | `ChannelPerformancePage` มี `useEffect` ว่าง | ลบ effect; lazy load ผ่าน `handleInviteLinksOpen` พอ |
| FE-REV-007 | Nit | `void reloadKey` / `void refreshToken` เป็น lint workaround | ใส่ dependency จริง หรือ biome-ignore พร้อมเหตุผล |
| FE-REV-008 | Consider | AdminLayout ไม่ paint จาก cache เก่า → switcher อาจกระพริบ | อ่าน cache ก่อน set loading (ถ้าไม่ใช่ limited poison path) |
| FE-REV-009 | Optional | Branch search ใน `DropdownMenu` | ตรวจ keyboard/focus a11y |

## What already looks good (do not regress)

- SmartReport: enrichment history ×1 ตอน mount; pagination ไม่ refetch enrichment
- Permissions: ยก menu catalog ขึ้น parent — สลับแท็บไม่ยิง `/auth/admin/menus` ซ้ำ
- Dashboard: `profiles/count` แทน list `limit:1`
- Agent fees: `fields=matrix`
- Channel performance: invite-links lazy + `limit:20`
- Branch switcher typeahead + `limit:20` (เป้าหมาย PAY-001 ถูก — ปัญหาคือการเขียนลง shared cache)
- Tests อัปเดต + checklist verify PASS

## Tasks (batch fix — ทำทีเดียว)

- [x] **FE-REV-001 / TD-023:** แยก limited switcher results ออกจาก invoice shared cache; ปรับ `AdminLayout` + readers
- [x] **FE-REV-002 / TD-024:** แก้ `invoiceAgentsRequestedRef` ให้ refetch เมื่อ `ou_id`/`role` เปลี่ยน (หรือลบ ref)
- [x] **FE-REV-003 / TD-025:** แก้ StaffManagement fetch-key / abort cleanup
- [x] **FE-REV-004:** รวมหรือเอกสาร dual branch caches (ทำคู่กับ 001)
- [x] เพิ่มเทส: switcher ไม่ poison invoice cache; InvoiceList refetch on auth change; StaffManagement cancel race
- [x] (Optional) FE-REV-005, FE-REV-006, FE-REV-007
- [x] (Consider/Optional) FE-REV-008: paint switcher จาก `peekBranchCatalog` ก่อน fetch; loading เฉพาะเมื่อไม่มี cache
- [x] (Optional) FE-REV-009: focus search on open, `<search>`, empty/loading status, keyboard stopPropagation
- [ ] อัปเดต `NETWORK-VERIFY-CHECKLIST.md` ถ้าพฤติกรรม network เปลี่ยน — ไม่เปลี่ยน network shape; skip
- [ ] ปิด TD-023/024/025 + ย้ายแผนนี้ไป `completed/` — หลัง merge

## Risks

- แก้ cache โดยไม่ระวังอาจทำให้ NET-004 / PAY-001 กลับมา duplicate — ต้อง re-verify checklist หลังแก้
- รวม cache สองระบบอาจกระทบ `InvoiceList` filter และ BranchSwitcher พร้อมกัน — ควรมีเทสก่อน refactor ใหญ่

## Related

- Audit report: [`frontend/backoffice-next/docs/API-NETWORK-AUDIT-2026-07-09.md`](../../../frontend/backoffice-next/docs/API-NETWORK-AUDIT-2026-07-09.md)
- Verify checklist: [`frontend/backoffice-next/docs/NETWORK-VERIFY-CHECKLIST.md`](../../../frontend/backoffice-next/docs/NETWORK-VERIFY-CHECKLIST.md)
- Completed FE plan: [`../completed/api-network-audit-frontend-2026-07-09.md`](../completed/api-network-audit-frontend-2026-07-09.md)
- Tech debt: [`../tech-debt-tracker.md`](../tech-debt-tracker.md) (TD-023 … TD-025)
