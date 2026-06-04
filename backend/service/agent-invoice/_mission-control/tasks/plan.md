# Implementation Plan: Agent Fee Management (Phase 2)

## Overview
ระบบจัดการ Agent Fees ที่รวมการทำงานทั้งฝั่ง Backend และ Frontend โดยแบ่งแผนการทำงานเป็นแบบ **Vertical Slicing** (แนวตั้ง) เพื่อให้ทุกฟีเจอร์สามารถสร้าง, ทดสอบ, และใช้งานได้ตั้งแต่หน้าจอไปจนถึงฐานข้อมูล ทีละส่วนอย่างสมบูรณ์

## Architecture Decisions
- **Database Connection:** สร้างการเชื่อมต่อ 2 ชุด (Target DB: `agent-invoice`, Source DB: `777ww-prod` แบบ Read-only)
- **Routing:** API Master Data อยู่ที่ `/api/v1/master-data/*` และ API Fee จะอยู่ที่ `/api/v1/agents/:agentId/fees`
- **Tenant Isolation:** ทุกการ Query ต้องระบุ `ou_id` และ `branch_id` เสมอ
- **Optimistic Locking:** บังคับตรวจสอบ `If-Match` ETag สำหรับอัปเดตและลบ

## Task List

### Phase 1: Read-Only Path (ปูพื้นฐานและระบบแสดงผล)
- [ ] **Task 1: Backend Setup & Master Data API** (เตรียมโครงสร้าง โฟลเดอร์, เชื่อม Database 2 แหล่ง, และทำ API ดึง Game Companies/Categories)
- [ ] **Task 2: Backend GET Agent Fees API** (สร้าง API สำหรับดึงรายการ Fee พร้อม Pagination)
- [ ] **Task 3: Frontend Agent Fees Table UI** (สร้าง API Client, ดึงข้อมูลจาก Task 1-2 มาแสดงเป็นตารางในหน้า Agent Details)

### Checkpoint: Read-Only Path
- [ ] Backend รันได้ สามารถดึง Master Data และ List ของ Fee ผ่าน API ได้
- [ ] Frontend หน้าตารางแสดงผลข้อมูลได้ถูกต้อง
- [ ] ระบบพังถ้าไม่ส่ง `ou_id` และ `branch_id` (ทดสอบเรื่อง Tenant Isolation)

### Phase 2: Create Path (ระบบเพิ่มข้อมูลและกันพลาด)
- [ ] **Task 4: Backend POST Agent Fee API** (สร้าง API บันทึกข้อมูล พร้อม Validation เช็คห้าม Branch + Company + Category ซ้ำ)
- [ ] **Task 5: Frontend Create Form Modal** (สร้างหน้าต่างเพิ่มข้อมูล, ดึง Master Data มาทำ Smart Dropdown DDL กรองตัวที่ซ้ำออก)

### Checkpoint: Create Path
- [ ] ผู้ใช้สามารถกดปุ่ม Create กรอกข้อมูล และเซฟลงตารางได้จริง
- [ ] Dropdown ไม่แสดงตัวเลือกที่เคยผูกไปแล้ว

### Phase 3: Update & Delete Path (ความปลอดภัยและ Optimistic Locking)
- [ ] **Task 6: Backend PATCH & DELETE APIs** (สร้าง API แก้ไขและลบ โดยดักเช็ค `If-Match` เสมอ ถ้าไม่ตรงตอบ `412 VERSION_CONFLICT` ถ้าไม่ส่งตอบ `428 PRECONDITION_REQUIRED`)
- [ ] **Task 7: Frontend Edit/Delete Actions** (เพิ่มปุ่มแก้ไขและลบในตาราง และดักจับ Error กรณีถูกเซฟทับ)

### Checkpoint: Complete
- [ ] การทำงาน CRUD ทำงานได้สมบูรณ์ตั้งแต่ต้นจนจบ
- [ ] ทดสอบเปิด 2 แท็บ แล้วกดเซฟพร้อมกันเพื่อตรวจสอบ Optimistic Locking ทำงานได้จริง

## Risks and Mitigations
| ความเสี่ยง | ผลกระทบ (สูง/กลาง/ต่ำ) | วิธีรับมือ |
|------|--------|------------|
| การเชื่อมต่อ Source DB `777ww-prod` ล้มเหลว | High | จัดการ Error ให้ออกมาเป็นโครงสร้าง 500 SERVICE_UNAVAILABLE ที่ปลอดภัย และไม่ทำให้ Main App พัง |
| ผู้ใช้อัปเดตข้อมูลชนกัน | Medium | ใช้งาน Optimistic Locking เต็มรูปแบบ และ Frontend ต้องแจ้งเตือนให้ผู้ใช้รีเฟรชหน้าต่าง |
