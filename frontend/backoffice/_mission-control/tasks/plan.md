# Implementation Plan: Bulk Invoice Export (Invoice List)

## Overview

เพิ่มความสามารถ **เลือกหลาย invoice** จากหน้า `/invoices` แล้ว **export เป็น ZIP** (PDF หรือ Excel แยกไฟล์ต่อ `iv_no`) พร้อม progress modal, cancel, และ retry รายการที่ล้มเหลว — ตาม [SPEC.md](../SPEC.md) Phase 1 (P0+P1)

**ขอบเขต:** Frontend only — ใช้ API เดิม (`GET /invoices/:id`, `GET /transactions`) ไม่แก้ backend

---

## Architecture Decisions

| การตัดสินใจ | เหตุผล |
|-------------|--------|
| แยก export logic เป็น pure functions ใน `pages/Invoices/export/` | Single source of truth — `InvoiceDetail` และ bulk export ใช้ชุดเดียวกัน |
| `runBulkExport` เป็น orchestrator แยกจาก UI | ทดสอบ concurrency / abort / partial failure ได้โดยไม่ต้อง mount React |
| Concurrency pool = 5 | ลดโอกาส rate-limit / browser hang ตาม Spec |
| `jszip` ฝั่ง client | ไม่ต้อง backend endpoint ใน Phase 1; ZIP แยกไฟล์ต่อ invoice |
| `sortInvoiceTransactions()` ใน `utils.ts` | Logic เรียง `company_name` ใช้ร่วมกันระหว่าง detail และ export |
| `triggerBlobDownload(blob, filename)` helper | ใช้ร่วมกันระหว่าง single export และ bulk ZIP download |
| Clear selection หลังปิด modal สำเร็จ | ตาม Decisions Q1 |
| Builder คืน `Blob` ด้วย `doc.output('blob')` / `XLSX.write({type:'array'})` | โค้ดเดิม `doc.save()`/`XLSX.writeFile()` download ทันที — ต้องเปลี่ยนเพื่อ reuse ใน ZIP |
| Bulk export เรียก `invoicesApiClient` ตรง ไม่ผ่าน `useInvoices` | hook เก็บ state `invoice` เดี่ยวและ reset null ทุก fetch — ไม่เหมาะกับ concurrent multi-fetch |
| ซ่อนปุ่ม export เมื่อไม่มี `usePermission('invoices:read')` | list guard แค่ `invoices:list`; bulk fetch ต้อง `invoices:read` (Decisions Q4) |

---

## Dependency Graph

```
[jszip dependency]
       │
       ├── sortInvoiceTransactions (utils.ts)
       │
       ├── buildInvoicePdf.ts ──┐
       ├── buildInvoiceXlsx.ts ─┼──► InvoiceDetail.tsx (refactor)
       │                        │
       └── bulkExport.ts ◄──────┘
                │
                ├── invoicesApiClient (existing GET APIs)
                │
                ├── BulkExportModal.tsx
                │        │
                └── BulkExportBar.tsx
                         │
                         └── index.tsx (rowSelection + wire-up)
```

ลำดับ implement: **export builders → detail refactor → bulk orchestrator → UI components → list integration → docs**

---

## Task List

### Phase 1: Export Foundation

## Task 1: เพิ่ม `jszip` และ shared download helper

**Description:** ติดตั้ง dependency และสร้าง utility สำหรับดาวน์โหลด Blob จาก browser

**Acceptance criteria:**
- [ ] `jszip` อยู่ใน `package.json` dependencies
- [ ] มี `triggerBlobDownload(blob, filename)` ใน `export/downloadBlob.ts` (หรือ `utils.ts` ถ้าเล็กมาก)
- [ ] ฟังก์ชัน trigger click บน `<a download>` แล้ว revoke object URL

**Verification:**
- [ ] `npm run build` ผ่าน
- [ ] Unit test: `downloadBlob.test.ts` — mock `URL.createObjectURL` / `revokeObjectURL`

**Dependencies:** None

**Files likely touched:**
- `package.json`, `package-lock.json`
- `src/pages/Invoices/export/downloadBlob.ts`
- `src/pages/Invoices/export/downloadBlob.test.ts`

**Estimated scope:** XS

---

## Task 2: แยก `buildInvoicePdf` + unit tests

**Description:** ย้าย logic จาก `InvoiceDetail.handleExportPDF` เป็น pure function รับ `(invoice, transactions)` คืน `Blob`

**Acceptance criteria:**
- [ ] `buildInvoicePdf(invoice, transactions)` คืน PDF `Blob` ขนาด > 0 ผ่าน `doc.output('blob')` (ไม่ใช่ `doc.save`)
- [ ] เรียง transactions ด้วย `sortInvoiceTransactions()` ก่อนสร้างตาราง
- [ ] มีแถว Total และ header fields ตรงกับ behavior เดิม (iv_no, billing_month, branch_name, due_date)
- [ ] Unit test ครอบคลุม empty transactions และ totals

**Verification:**
- [ ] `npm test -- src/pages/Invoices/export/buildInvoicePdf.test.ts`
- [ ] `npm run lint` ผ่าน

**Dependencies:** Task 1 (optional — ไม่ block แต่ Task 4 ต้องการ)

**Files likely touched:**
- `src/pages/Invoices/utils.ts` — เพิ่ม `sortInvoiceTransactions`
- `src/pages/Invoices/export/buildInvoicePdf.ts`
- `src/pages/Invoices/export/buildInvoicePdf.test.ts`

**Estimated scope:** M

---

## Task 3: แยก `buildInvoiceXlsx` + unit tests

**Description:** ย้าย logic จาก `InvoiceDetail.handleExportExcel` เป็น pure function คืน `Blob`

**Acceptance criteria:**
- [ ] `buildInvoiceXlsx(invoice, transactions)` คืน XLSX `Blob` ผ่าน `XLSX.write(wb, { bookType: 'xlsx', type: 'array' })` แล้ว wrap `Blob` (ไม่ใช่ `XLSX.writeFile`)
- [ ] โครงสร้าง sheet (header rows, column headers, totals row) ตรง behavior เดิม
- [ ] Unit test ตรวจจำนวนแถวและค่า totals

**Verification:**
- [ ] `npm test -- src/pages/Invoices/export/buildInvoiceXlsx.test.ts`

**Dependencies:** Task 2 (`sortInvoiceTransactions` ใน utils)

**Files likely touched:**
- `src/pages/Invoices/export/buildInvoiceXlsx.ts`
- `src/pages/Invoices/export/buildInvoiceXlsx.test.ts`

**Estimated scope:** S

---

## Task 4: Refactor `InvoiceDetail` ใช้ shared export builders

**Description:** ลบ inline jsPDF/XLSX logic จาก `InvoiceDetail.tsx` เรียก builders + `triggerBlobDownload` แทน

**Acceptance criteria:**
- [ ] ปุ่ม Export PDF / Excel ยังทำงานเหมือนเดิม (manual หรือ test)
- [ ] ไม่มี duplicate export logic ใน `InvoiceDetail.tsx`
- [ ] Toast success ยังแสดงหลัง export

**Verification:**
- [ ] `npm test` (existing `useInvoices` tests ยังผ่าน)
- [ ] `npm run build` ผ่าน
- [ ] Manual: เปิด `/invoices/:id` → export PDF และ Excel ได้ไฟล์ถูกต้อง

**Dependencies:** Task 2, Task 3, Task 1

**Files likely touched:**
- `src/pages/Invoices/InvoiceDetail.tsx`

**Estimated scope:** S

### Checkpoint: Export Foundation

- [ ] Export builders มี unit tests ผ่าน
- [ ] `InvoiceDetail` export ทำงานหลัง refactor
- [ ] `npm run lint` และ `npm run build` ผ่าน
- [ ] มนุษย์รีวิวก่อนเริ่ม bulk orchestration (optional แต่แนะนำ)

---

### Phase 2: Bulk Export Engine

## Task 5: `runBulkExport` — fetch, build, ZIP, abort

**Description:** Orchestrator ดึง detail + transactions ต่อ invoice (concurrency ≤ 5), สร้างไฟล์, รวม ZIP, รองรับ `AbortSignal` และ partial failure

**Acceptance criteria:**
- [ ] `runBulkExport({ invoiceIds, format, onProgress, signal })` คืน `Blob | null`
- [ ] คืน `null` เมื่อไม่มีรายการสำเร็จเลย
- [ ] `onProgress` เรียกหลังแต่ละ invoice (done, total, currentIvNo, results[] พร้อม status `success`/`failed`/`cancelled`)
- [ ] Abort หยุด queue ที่เหลือ; ZIP จากรายการที่สำเร็จแล้ว (ถ้ามี)
- [ ] รายการที่ถูก abort ขณะ in-flight → status `cancelled` (แยกจาก `failed`)
- [ ] ส่ง `signal` ต่อไปยัง `getInvoiceById`/`listInvoiceTransactions` (รองรับอยู่แล้ว)
- [ ] ชื่อไฟล์ใน ZIP: `invoice_{iv_no}.pdf` หรือ `.xlsx`
- [ ] ZIP filename pattern: `invoices_export_YYYYMMDD_HHmm.zip`
- [ ] API error ต่อรายการ → บันทึก `failed` แล้วดำเนินการต่อ

**Verification:**
- [ ] `npm test -- src/pages/Invoices/export/bulkExport.test.ts`
  - concurrency จำกัดจริง
  - partial failure
  - abort กลางทาง
  - empty `invoiceIds` → null
- [ ] Mock `invoicesApiClient` — ไม่ยิง API จริง

**Dependencies:** Task 2, Task 3, Task 1

**Files likely touched:**
- `src/pages/Invoices/export/bulkExport.ts`
- `src/pages/Invoices/export/bulkExport.test.ts`
- `src/pages/Invoices/export/types.ts` (optional — `BulkExportFormat`, progress types)

**Estimated scope:** M

### Checkpoint: Bulk Engine

- [ ] `bulkExport.test.ts` ผ่านทุก case ตาม Spec error handling
- [ ] สามารถเรียก `runBulkExport` จาก console/test ได้ ZIP จริง (integration smoke ใน test)

---

### Phase 3: UI Integration

## Task 6: `BulkExportModal` — progress, cancel, retry, close

**Description:** Modal แสดง progress bar, รายการผลลัพธ์, ปุ่ม Cancel (abort), Retry failed, Close (clear selection เมื่อสำเร็จ)

**Acceptance criteria:**
- [ ] แสดง `done/total` และ `iv_no` ปัจจุบัน
- [ ] รายการ ✓/✗ พร้อม error message สั้นๆ
- [ ] Cancel ส่ง `AbortSignal` ไป `runBulkExport`
- [ ] Retry เรียก export เฉพาะ ids ที่ status `failed`/`cancelled` → สร้าง ZIP ชุดใหม่ (ไม่ merge เดิม)
- [ ] ปิด modal หลังสำเร็จ → callback `onComplete` สำหรับ clear selection
- [ ] ดาวน์โหลด ZIP อัตโนมัติเมื่อมี blob

**Verification:**
- [ ] `npm test -- src/pages/Invoices/components/BulkExportModal.test.tsx`
- [ ] Manual: mock ช้าๆ ดู progress อัปเดต

**Dependencies:** Task 5

**Files likely touched:**
- `src/pages/Invoices/components/BulkExportModal.tsx`
- `src/pages/Invoices/components/BulkExportModal.test.tsx`

**Estimated scope:** M

---

## Task 7: Row selection + `BulkExportBar` + wire-up ใน `index.tsx`

**Description:** เพิ่ม checkbox selection (max 50, preserve across pages), floating action bar, เชื่อม modal, gate ด้วย permission

**Acceptance criteria:**
- [ ] `rowSelection` บน Table พร้อม `preserveSelectedRowKeys: true`
- [ ] เลือกเกิน 50 → warning + block เพิ่ม (ใช้ `getCheckboxProps` disable แถวที่ยังไม่เลือกเมื่อครบ 50)
- [ ] Header select-all cap ที่ 50 รายการแรก แม้ pageSize > 50 (Decisions Q7)
- [ ] Action bar แสดงเมื่อเลือก ≥ 1: Export PDF, Export Excel, ยกเลิก (clear selection)
- [ ] ซ่อนปุ่ม Export ใน action bar เมื่อ `usePermission('invoices:read')` เป็น false (Decisions Q4)
- [ ] ปุ่ม export เปิด `BulkExportModal` พร้อม ids + format
- [ ] ปิด modal สำเร็จ → clear `selectedRowKeys`
- [ ] ปุ่ม disabled ขณะ export กำลังทำงาน

**Verification:**
- [ ] Manual ตาม Success Criteria ใน SPEC (5 ขั้นตอน)
- [ ] `npm run build` ผ่าน

**Dependencies:** Task 6

**Files likely touched:**
- `src/pages/Invoices/components/BulkExportBar.tsx`
- `src/pages/Invoices/index.tsx`

**Estimated scope:** M

### Checkpoint: Core Features

- [ ] End-to-end: เลือก 2–3 invoice → Export PDF → ได้ ZIP เปิดได้
- [ ] End-to-end: Export Excel → ZIP มี `.xlsx` แยกไฟล์
- [ ] Pagination ไม่เคลียร์ selection
- [ ] Partial failure + retry ทำงาน

---

### Phase 4: Polish & Documentation

## Task 8: อัปเดตเอกสาร user flow

**Description:** เพิ่ม flow bulk export ใน `docs/sitemap-and-flows.md`

**Acceptance criteria:**
- [ ] มี section 2.x อธิบาย flow เลือกหลาย invoice → export ZIP
- [ ] ระบุ permission `invoices:list` + `invoices:read`

**Verification:**
- [ ] อ่านเอกสารแล้วสอดคล้องกับ UI จริง

**Dependencies:** Task 7

**Files likely touched:**
- `docs/sitemap-and-flows.md`

**Estimated scope:** XS

---

## Task 9: Final verification & lint

**Description:** รัน test suite ทั้งหมด, lint, build — ยืนยัน Success Criteria ครบ

**Acceptance criteria:**
- [ ] ครบทุก checkbox ใน SPEC § Success Criteria
- [ ] `npm test`, `npm run lint`, `npm run build` ผ่าน

**Verification:**
- [ ] รันคำสั่งทั้งสามใน `frontend/backoffice`
- [ ] Manual smoke บน `/invoices` (ถ้ามี env เชื่อม API)

**Dependencies:** Task 7, Task 8

**Files likely touched:** (none หรือแก้เล็กน้อยจาก lint)

**Estimated scope:** XS

### Checkpoint: Complete

- [ ] SPEC Success Criteria ครบ 8 ข้อ
- [ ] พร้อม `/code-build` หรือ PR review

---

## Risks and Mitigations

| ความเสี่ยง | ผลกระทบ | วิธีรับมือ |
|-----------|---------|-----------|
| Export refactor ทำให้ detail export พัง | สูง | Task 4 + manual verify ก่อน bulk; unit tests บน builders |
| Browser OOM เมื่อ export 50 ใบ | กลาง | จำกัด 50; สร้าง ZIP ทีละไฟล์; ไม่เก็บ blob ทั้งหมดใน memory นานเกินไป |
| `jspdf`/`xlsx` ใน test environment | ต่ำ | Mock หรือ assert blob size/type แทน parse เนื้อหา |
| Ant Design `rowSelection` + controlled pagination | ต่ำ | ใช้ `preserveSelectedRowKeys`; test manual ข้ามหน้า |
| ไม่มี `@types/jszip` | ต่ำ | `jszip` ship types เอง — ไม่ต้องเพิ่ม `@types` |
| User มี `invoices:list` แต่ไม่มี `invoices:read` | สูง | ซ่อนปุ่ม export ด้วย `usePermission('invoices:read')` (Task 7) |
| `doc.save`/`XLSX.writeFile` download ทันที ไม่คืน Blob | สูง | Builder ใช้ `doc.output('blob')` + `XLSX.write({type:'array'})` (Task 2/3) |
| `xlsx@0.18.5` มี known advisory (prototype pollution/ReDoS) ยังไม่มี fix บน npm | ต่ำ | dependency เดิม ไม่ขยาย attack surface (สร้างไฟล์ ไม่ parse input ภายนอก); ติดตามแยก |

---

## Parallelization Opportunities

| ทำขนานได้ (หลัง Task 2) | ต้องทำตามลำดับ |
|------------------------|----------------|
| Task 3 (xlsx) ขนานกับ Task 2 ถ้าแยกคน — แต่ share `sortInvoiceTransactions` ควรทำ Task 2 ก่อน | Task 1 → 2 → 3 → 4 → 5 → 6 → 7 |
| Task 8 (docs) ขนานกับ Task 9 บางส่วน | Task 6 ต้องรอ Task 5 |

---

## Out of Scope (Phase 1)

- P2: Multi-month generate + async job
- P3: Bulk Mark PAID / Cancel
- Select all matching filter across pages
- Backend export endpoint
- Permission `invoices:export` ใหม่

---

## Approval

| Role | Status | Date |
|------|--------|------|
| Product / User | ⏳ รออนุมัติ Plan | |
| Engineering | ⏳ รออนุมัติ Plan | |

**ขั้นถัดไปหลังอนุมัติ:** `/code-build` — ทำทีละ Task ตาม `todo.md`
