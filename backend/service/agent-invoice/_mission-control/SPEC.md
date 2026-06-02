# Specification: Agent Fee CRUD (Backend)

## 🎯 1. Objective and Target Users
- **Objective:** พัฒนาระบบ Backend สำหรับจัดการตั้งค่าค่าธรรมเนียม (Fee Rate) แยกตามค่ายเกมและหมวดหมู่ (Company + Category) สำหรับ Agent แต่ละราย
- **Target Users:** Admin หรือผู้ดูแลระบบที่ต้องการกำหนดค่าธรรมเนียมเฉพาะเจาะจงให้แต่ละ Agent

## 🚀 2. Core Features & Acceptance Criteria
1. **List Agent Fees:** ดึงรายการค่าธรรมเนียม (Overrides) ทั้งหมดของ Agent 1 ราย 
2. **Create Agent Fee:** สร้างรายการ Override ค่าธรรมเนียมใหม่ บังคับตรวจสอบไม่ให้ข้อมูลซ้ำซ้อน (Unique `agent_id, company_id, main_cate_id`)
3. **Update Agent Fee:** แก้ไข `fee_rate` ของรายการเดิม พร้อมระบบป้องกันการเซฟทับ (Optimistic Locking ด้วย `upd_date`)
4. **Delete Agent Fee:** ลบรายการ Override ค่าธรรมเนียมของ Agent ออกจากระบบ

## 🛠 3. Tech Stack & Standards
- **Node.js:** v24 LTS (ESM)
- **Database:** MongoDB v8.0.x
- **Framework:** Fastify v5 (อ้างอิง `1-tech-stack.md`)
- **Architecture:** Modular / Feature-based (Vertical Slicing) (อ้างอิง `2-folder-structure.md`)
- **Data Management:** (อ้างอิง `12-data-management.md`)
  - **Audit Fields:** ต้องอัปเดตชุด `cr_*` และ `upd_*` เสมอ
  - **Optimistic Locking:** บังคับใช้ `upd_date` ตรวจสอบ Version ในการทำ Update

## 📂 4. Project Structure (เฉพาะส่วนที่เกี่ยวข้อง)
```text
agent-invoice/
├── _mission-control/
│   └── SPEC.md
└── src/
    └── modules/
        └── agent-fees/
            ├── agent-fees.route.js
            ├── agent-fees.controller.js
            ├── agent-fees.schema.js
            ├── agent-fees.service.js
            └── agent-fees.repository.js
```

## 🔗 5. API Routing (RESTful)
ใช้ Noun พหูพจน์ และระบุ Version ชัดเจนตามมาตรฐาน `3-api-routing.md`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/agents/:agentId/fees` | ดูรายการค่าธรรมเนียมทั้งหมดของ Agent นั้น |
| `POST` | `/api/v1/agents/:agentId/fees` | เพิ่มการตั้งค่าค่าธรรมเนียมใหม่ให้ Agent |
| `PATCH` | `/api/v1/agents/:agentId/fees/:feeId` | แก้ไขค่า `fee_rate` ของรายการเดิม |
| `DELETE` | `/api/v1/agents/:agentId/fees/:feeId` | ลบการตั้งค่าค่าธรรมเนียมทิ้ง |

## 🚧 6. Boundaries & Decisions
- **In-Scope:** พัฒนาเฉพาะ Backend Service สำหรับระบบ CRUD `agent_category_fees` (เส้น API และการคุยกับ Database)
- **Out-of-Scope:** ไม่รวมหน้า Frontend และยังไม่รวมส่วนการสร้าง Invoice
- **Decisions Made:**
  - **Delete:** ใช้การลบข้อมูลจริง (Hard Delete) สำหรับ Agent Fee
  - **Tenant Isolation:** ข้ามการเช็ค Tenant (`ou_id` / `branch_id`) สำหรับตาราง Fee นี้
