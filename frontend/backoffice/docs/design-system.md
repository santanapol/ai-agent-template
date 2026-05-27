# Zero Platform - Frontend Design System

เอกสารนี้ระบุมาตรฐาน Design System สำหรับส่วน Frontend ของ Zero Platform (Back-office / Admin Dashboard) อิงตามมาตรฐานองค์กร [`_coding-standards/frontend-bo/`](../../../../../_coding-standards/frontend-bo/README.md)

## 1. Core Principles
- **Framework & UI Library:** ใช้ Vite + React ร่วมกับ **Ant Design (AntD)** เป็นหลัก
- **Clean & Professional:** เน้นความเรียบง่าย สะอาดตา เหมาะสำหรับการทำงานที่ต้องใช้สมาธิ
- **Data-Dense but Readable:** ตารางข้อมูลและแบบฟอร์มต้องแสดงข้อมูลได้เยอะแต่ยังอ่านง่าย (ใช้ Whitespace อย่างเหมาะสม)
- **Clear Call-to-Action (CTA):** ปุ่มและ Action ที่สำคัญต้องเห็นชัดเจน เพื่อลด Cognitive Load ของผู้ใช้งาน

## 2. Color Palette (Ant Design Tokens)

แทนที่จะเขียน Custom CSS ให้เรา Config ค่า Token เหล่านี้ใน `ConfigProvider` ของ Ant Design
- **Primary Color (`colorPrimary`):** `#2563EB` (Blue)
- **Success Color (`colorSuccess`):** `#10B981` (Green)
- **Error Color (`colorError`):** `#EF4444` (Red)
- **Warning Color (`colorWarning`):** `#F59E0B` (Yellow)
- **Info Color (`colorInfo`):** `#3B82F6` (Blue)

## 3. Typography
ใช้ฟอนต์ **Inter** หรือ **Sarabun** (สำหรับภาษาไทย) เพื่อความทันสมัยและอ่านง่าย
- Config ผ่าน Ant Design Token: `fontFamily: 'Inter, Sarabun, sans-serif'`
- **Base Font Size (`fontSize`):** `14px` (Default ของ AntD เหมาะสมแล้ว)
- **Heading:** ใช้ Component `<Typography.Title>` ของ AntD
- **Text:** ใช้ Component `<Typography.Text>` ของ AntD

## 4. Components (อิงจาก Ant Design)

### 4.1 Buttons
- **Primary Action:** `<Button type="primary">` (เช่น `[+ Add New Staff]`)
- **Secondary/Outline:** `<Button>` (Default)
- **Destructive Action:** `<Button danger>` (เช่น `[ Archive ]`)

### 4.2 Forms & Inputs
- ใช้ `<Form>`, `<Form.Item>`, และ `<Input>` ของ Ant Design
- Ant Design มีระบบ Validation ในตัว (เช่น `rules={[{ required: true }]}`)
- เลย์เอาต์: แนะนำให้ใช้ `layout="vertical"` เพื่อให้ Label อยู่ด้านบน Input เสมอ

### 4.3 Data Table
- ใช้ Component `<Table>` ของ Ant Design
- รองรับ Pagination, Sorting, และ Empty States (No Data) ในตัว
- การแสดงผลข้อมูลจำนวนมาก ควรตั้งค่า `size="middle"` หรือ `size="small"` เพื่อให้หน้าจอไม่โล่งเกินไป

### 4.4 Status Badges
- ใช้ `<Badge>` ของ Ant Design
- **Active:** `<Badge status="success" text="Active" />`
- **Archived:** `<Badge status="error" text="Archived" />`

### 4.5 Modals & Slide-over Panels
- **Slide-over Panel (Drawer):** ใช้ `<Drawer>` สำหรับ Form สร้าง/แก้ไข (Create/Edit) กำหนด `width={500}`
- **Modal Dialog:** ใช้ `<Modal>` สำหรับ Confirmation แจ้งเตือนก่อนทำ Action สำคัญ

## 5. Spacing & Layout
- การเว้นระยะห่างให้ใช้ Component `<Space>` หรือ `<Flex>` ของ Ant Design
- หลีกเลี่ยงการเขียน `margin` หรือ `padding` เองถ้าไม่จำเป็น