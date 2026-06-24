# Tasks: Bulk Invoice Export

อ้างอิง: [SPEC.md](../SPEC.md) · [plan.md](./plan.md)

---

## Phase 1: Export Foundation

- [x] **Task 1:** เพิ่ม `jszip` + `triggerBlobDownload` helper  
  - **Acceptance:** dependency ติดตั้งแล้ว; download helper มี unit test  
  - **Verify:** `npm run build` · `npm test -- downloadBlob`  
  - **Files:** `package.json`, `export/downloadBlob.ts`, `export/downloadBlob.test.ts`

- [x] **Task 2:** แยก `buildInvoicePdf` + `sortInvoiceTransactions` + tests  
  - **Acceptance:** pure function คืน PDF Blob; totals/header ตรงเดิม  
  - **Verify:** `npm test -- buildInvoicePdf`  
  - **Files:** `utils.ts`, `export/buildInvoicePdf.ts`, `export/buildInvoicePdf.test.ts`

- [x] **Task 3:** แยก `buildInvoiceXlsx` + tests  
  - **Acceptance:** pure function คืน XLSX Blob; sheet structure ตรงเดิม  
  - **Verify:** `npm test -- buildInvoiceXlsx`  
  - **Files:** `export/buildInvoiceXlsx.ts`, `export/buildInvoiceXlsx.test.ts`

- [x] **Task 4:** Refactor `InvoiceDetail` ใช้ shared builders  
  - **Acceptance:** export PDF/Excel จาก detail ยังทำงาน; ไม่มี duplicate logic  
  - **Verify:** `npm test` · `npm run build` · manual export บน detail page  
  - **Files:** `InvoiceDetail.tsx`

### Checkpoint: Export Foundation

- [x] Builder unit tests ผ่าน
- [x] Detail export ทำงานหลัง refactor
- [x] `npm run lint` + `npm run build` ผ่าน

---

## Phase 2: Bulk Export Engine

- [x] **Task 5:** `runBulkExport` — concurrency, ZIP, abort, partial failure  
  - **Acceptance:** ครบ behavior ตาม SPEC §3–5; tests mock API  
  - **Verify:** `npm test -- bulkExport`  
  - **Files:** `export/bulkExport.ts`, `export/bulkExport.test.ts`, `export/types.ts` (optional)

### Checkpoint: Bulk Engine

- [x] `bulkExport.test.ts` ผ่าน (concurrency, abort, partial failure, empty)

---

## Phase 3: UI Integration

- [x] **Task 6:** `BulkExportModal` — progress, cancel, retry, close + clear selection  
  - **Acceptance:** progress UI; abort; retry failed only; auto-download ZIP  
  - **Verify:** `npm test -- BulkExportModal`  
  - **Files:** `components/BulkExportModal.tsx`, `components/BulkExportModal.test.tsx`

- [x] **Task 7:** Row selection (max 50, cap select-all) + `BulkExportBar` + permission gate + wire-up `index.tsx`  
  - **Acceptance:** เลือกหลายแถวข้าม pagination; ซ่อนปุ่ม export เมื่อไม่มี `invoices:read`; bar เปิด modal  
  - **Verify:** manual 5 ขั้นตอนใน SPEC · `npm run build`  
  - **Files:** `components/BulkExportBar.tsx`, `index.tsx`

### Checkpoint: Core Features

- [ ] E2E manual: เลือกหลาย invoice → PDF ZIP
- [ ] E2E manual: Excel ZIP
- [ ] Partial failure + retry
- [ ] Cancel กลางทาง

---

## Phase 4: Polish

- [x] **Task 8:** อัปเดต `docs/sitemap-and-flows.md`  
  - **Acceptance:** flow bulk export ครบ  
  - **Verify:** อ่านเอกสารเทียบ UI  
  - **Files:** `docs/sitemap-and-flows.md`

- [x] **Task 9:** Final verification  
  - **Acceptance:** SPEC Success Criteria ครบ 8 ข้อ  
  - **Verify:** `npm test` · `npm run lint` · `npm run build`  
  - **Files:** —

### Checkpoint: Complete

- [x] พร้อม PR / `/code-build`

---

## Phase 5: Bulk Status Actions (P3)

- [x] **Task 10:** `runBulkStatusUpdate` — concurrency, abort, partial failure, etag  
  - **Acceptance:** ครบ behavior ตาม detail page rules; tests mock API  
  - **Verify:** `npm test -- bulkStatusUpdate`  
  - **Files:** `status/bulkStatusUpdate.ts`, `status/utils.ts`, `status/types.ts`, tests

- [x] **Task 11:** `BulkStatusModal` + action bar buttons + permission gate + wire-up  
  - **Acceptance:** Mark PAID / Cancel จาก list; ซ่อนปุ่มเมื่อไม่มี `invoices:write`; confirm ก่อนรัน  
  - **Verify:** `npm test -- BulkStatusModal` · manual  
  - **Files:** `components/BulkStatusModal.tsx`, `components/BulkExportBar.tsx`, `index.tsx`

- [x] **Task 12:** อัปเดต docs flow 2.9  
  - **Files:** `docs/sitemap-and-flows.md`, `SPEC.md`

### Checkpoint: P3

- [ ] E2E manual: bulk Mark PAID (READY only)
- [ ] E2E manual: bulk Cancel
- [ ] Partial failure + retry
- [ ] User `invoices:list` only — status buttons hidden
