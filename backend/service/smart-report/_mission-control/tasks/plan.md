# Implementation Plan: Smart Report Service

## Overview
เราต้องการพัฒนา Backend Service ใหม่ชื่อ `smart-report` รันบนพอร์ต `3103` เพื่อรองรับการตั้งเวลา สั่งรัน JavaScript Query Script และดาวน์โหลดไฟล์รายงานแบบ CSV/Excel ที่เก็บบน Local Server อย่างถาวร โดยระบบจะรันผ่าน VM sandbox ภายใต้ Database Connection แบบ Read-only เสมอ

## Architecture Decisions
- **Fastify & MongoDB:** ใช้ Fastify เป็น Framework และใช้ MongoDB driver ของ Node.js โดยตรงเพื่อให้สอดคล้องกับตัวอย่างสคริปต์
- **VM Sandbox:** ใช้ Node.js built-in `vm` module สำหรับประเมินผลสคริปต์โดยดักจับ (wrapper) ตัวแปรคอลเลกชันเพื่อให้รัน MongoDB queries แบบ async ได้อย่างปลอดภัย
- **Retention & Local Storage:** จัดเก็บไฟล์บน Local Disk path ที่กำหนด และไม่มีนโยบายการลบข้อมูลโดยอัตโนมัติ

## Task List

### Phase 1: Foundation (การสร้างรากฐาน)
- [x] **Task 1:** Initialize Backend `smart-report` Service
- [ ] **Task 2:** Database Model & Connection Setup (Primary & Secondary Read-only)

### Checkpoint: Foundation
- [ ] โครงสร้างโปรเจกต์ `smart-report` พร้อมใช้งาน ลิงก์ Linter/Prettier ผ่าน
- [ ] เชื่อมต่อฐานข้อมูลสำเร็จทั้ง 2 รูปแบบ (Read/Write และ Read-only)

### Phase 2: Sandbox & Utility Services (ฟีเจอร์หลัก)
- [ ] **Task 3:** VM Sandbox Runner Implementation (`sandboxRunner.js`)
- [ ] **Task 4:** File Exporter Implementation (`fileExporter.js` - CSV/Excel)

### Checkpoint: Sandbox & Utility
- [ ] Unit tests สำหรับ Sandbox Runner และ File Exporter ทำงานผ่าน 100%
- [ ] สามารถประเมินผลคำสั่ง aggregate/find และจัดเก็บเป็นไฟล์ลงดิสก์ได้สมบูรณ์

### Phase 3: Scheduler & API Endpoints (ฟีเจอร์ตั้งเวลาและติดต่อภายนอก)
- [ ] **Task 5:** Scheduler Implementation (`scheduler.js` - node-cron)
- [ ] **Task 6:** CRUD and Execution Routes (`reports.js`)

### Checkpoint: Scheduler & API
- [ ] Scheduler สามารถสแกนและรันรายงานตามช่วงเวลาโดยใช้การแทนที่ตัวแปรได้ถูกต้อง
- [ ] API Endpoints ทำงานได้ถูกต้องตามหลัก REST API

### Phase 4: Integration (เชื่อมต่อ Gateway และ Frontend)
- [ ] **Task 7:** Gateway Routing Integration
- [ ] **Task 8:** Frontend API Integration

### Checkpoint: Complete
- [ ] บรรลุ Acceptance criteria ทั้งหมด
- [ ] การเชื่อมต่อแบบ Full-stack (UI → Gateway → Smart Report Service → DB) ทำงานร่วมกันได้สมบูรณ์แบบ

## Risks and Mitigations
| ความเสี่ยง | ผลกระทบ | วิธีรับมือ |
|------|--------|------------|
| Script ใช้เวลานาน/Infinite Loop ใน VM | สูง | ตั้งค่า Timeout ใน VM options (เช่น 30000ms) และระบบฆ่า Thread/Callback |
| การโจมตีผ่าน JavaScript Injection | สูง | ใช้ VM sandbox ปิดกั้นโมดูลทั้งหมด (`fs`, `http`, `process`) และใช้ db user ที่มีสิทธิ์จำกัดในระดับ database driver |
