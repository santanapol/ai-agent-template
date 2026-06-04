# 📄 Invoice Management - Data Schema

**วัตถุประสงค์:** ข้อมูลสำหรับพัฒนา "หน้าจอค้นหา และดูรายละเอียด Invoice"
ข้อมูลชุดนี้ประกอบไปด้วย 2 Collection หลักที่ทำงานร่วมกัน คือ `agent_invoice` (เก็บข้อมูลบิลหลัก) และ `agent_invoice_transaction` (เก็บรายละเอียดรายการย่อยในบิลนั้น ๆ)

## 1. Collection: `agent_invoice`

**การนำไปใช้งาน:**

- ใช้สำหรับ **หน้าจอค้นหา (Search Screen)** แสดงรายการ Invoice ทั้งหมด หรือค้นหาตามเงื่อนไข (เช่น ค้นหาตาม `iv_no`, `status`)
- ใช้แสดงเป็น Header Data ในหน้า **ดูรายละเอียด (Detail Screen)**

| Field Name | Data Type | Description (รายละเอียด) | Example |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | รหัส Primary Key ของใบแจ้งหนี้ | `ObjectId("6a193d76...")` |
| `ou_id` | ObjectId | รหัส Organizational Unit (OU) | `ObjectId("5f4fb5bb...")` |
| `branch_id` | ObjectId | รหัสสาขา (Branch) | `ObjectId("5f4f9d57...")` |
| `iv_no` | String | หมายเลขใบแจ้งหนี้ | `"7W-202604-01"` |
| `billing_month` | String | รอบบิลประจำเดือน (YYYY-MM) | `"2026-04"` |
| `due_date` | Date (ISODate) | วันครบกำหนดชำระเงิน | `2026-05-05T00:00:00.000Z` |
| `net_win` | Number | ยอด Net Win รวมของบิลนี้ | `369.25` |
| `amount` | Number | จำนวนเงินสุทธิ (อาจเป็นยอดติดลบตามการคำนวณ) | `-39.4834...` |
| `status` | String | สถานะของใบแจ้งหนี้ (ใช้เป็นเงื่อนไขค้นหา/ฟิลเตอร์ได้) | `"READY"` |
| `cr_by` | String | ผู้ที่สร้างรายการนี้ | `"wellington"` |
| `cr_prog` | String | โปรแกรม/กระบวนการที่สร้าง | `"sum-netwin"` |
| `cr_date` | Date (ISODate) | วันที่และเวลาที่สร้างข้อมูล | `2026-05-29T14:17:10...` |
| `upd_by` | String | ผู้ที่อัปเดตข้อมูลล่าสุด | `"wellington"` |
| `upd_prog` | String | โปรแกรม/กระบวนการที่อัปเดต | `"calculate-fee"` |
| `upd_date` | Date (ISODate) | วันที่และเวลาที่อัปเดตข้อมูลล่าสุด | `2026-05-29T14:17:10...` |

---

## 2. Collection: `agent_invoice_transaction`

**การนำไปใช้งาน:**

- ใช้สำหรับแสดงเป็นตารางรายการย่อย (Transactions List) ในหน้า **ดูรายละเอียด (Detail Screen)** โดยคิวรีตาม `ref_iv_id`

| Field Name | Data Type | Description (รายละเอียด) | Example |
| :--- | :--- | :--- | :--- |
| `_id` | ObjectId | รหัส Primary Key ของ Transaction | `ObjectId("6a193f93...")` |
| `ref_iv_id` | ObjectId | รหัสอ้างอิงไปยังใบแจ้งหนี้หลัก `agent_invoice._id` | `ObjectId("6a193f93...")` |
| `ou_id` | ObjectId | รหัส Organizational Unit (OU) | `ObjectId("5f4fb5bb...")` |
| `branch_id` | ObjectId | รหัสสาขา (Branch) | `ObjectId("5f4f9d57...")` |
| `company_id` | ObjectId | รหัสค่ายเกม (Game Provider / Company) | `ObjectId("5f27e0e8...")` |
| `main_category_id`| ObjectId | รหัสประเภทเกม (Game Category เช่น Slot) | `ObjectId("5f157dd4...")` |
| `net_win` | Number | ยอด Net Win เฉพาะรายการนี้ | `300` |
| `fee` | Number | ค่าธรรมเนียม (Fee) | `7` |
| `amount` | Number | จำนวนเงินของรายการนี้ (ผ่านการหัก/คำนวณแล้ว) | `-42.8571...` |
| `cr_by` | String | ผู้ที่สร้างรายการนี้ | `"wellington"` |
| `cr_prog` | String | โปรแกรม/กระบวนการที่สร้าง | `"sum-netwin"` |
| `cr_date` | Date (ISODate) | วันที่และเวลาที่สร้างข้อมูล | `2026-05-29T14:26:11...` |
| `upd_by` | String | ผู้ที่อัปเดตข้อมูลล่าสุด | `"wellington"` |
| `upd_prog` | String | โปรแกรม/กระบวนการที่อัปเดต | `"calculate-fee"` |
| `upd_date` | Date (ISODate) | วันที่และเวลาที่อัปเดตข้อมูลล่าสุด | `2026-05-29T14:26:11...` |

---

## 🎨 UI/UX Guidelines (แนวทางการออกแบบหน้าจอ)

แนะนำให้แบ่งการทำงานเป็น **2 หน้าจอหลัก** ดังนี้:

### 🖥️ 1. หน้าค้นหาและแสดงรายการใบแจ้งหนี้ (Invoice List & Search Screen)

**เป้าหมาย:** เพื่อให้ User เห็นภาพรวม ค้นหาบิลที่ต้องการได้รวดเร็ว
**ข้อมูลที่ใช้:** `agent_invoice` (ดึงข้อมูลแบบ Pagination)

**UI/UX Layout:**

- **Top Section (ส่วนค้นหาและกรองข้อมูล):**
  - **Search Box:** ค้นหาด้วยหมายเลขใบแจ้งหนี้ (`iv_no`)
  - **Filters:** Dropdown สำหรับกรองตาม `status` และ Date Picker สำหรับกรองช่วงเวลา (`cr_date`)
- **Middle Section (ตารางแสดงข้อมูล):**
  - **Columns:** Invoice No, Branch Name, Status, Net Win, Amount, Created Date
  - **Status Badge:** ใช้สีแยกสถานะให้ชัดเจน เช่น สีเหลือง/ส้ม สำหรับ `READY`, สีเขียวสำหรับ `PAID`
  - *UX Tip:* ตารางควรสามารถ Sort ตามวันที่หรือจำนวนเงินได้
- **Action (การกระทำ):**
  - มีปุ่ม **"+ Create Invoice"** ด้านบนตาราง (เปิด Modal สำหรับเลือกเดือนและสาขาที่ต้องการสร้างบิล)
  - มีปุ่ม **"ดูรายละเอียด (View Details)"** ในแต่ละแถว เพื่อเปิดเข้าไปดูรายการย่อย

### 📄 2. หน้าดูรายละเอียดใบแจ้งหนี้ (Invoice Detail Screen)

**เป้าหมาย:** เพื่อดูแจกแจงที่มาของยอดเงินใน Invoice นั้น ๆ และจัดการบิล
**ข้อมูลที่ใช้:** `agent_invoice` (ส่วนหัว) + `agent_invoice_transaction` (รายการตาราง)

**UI/UX Layout:**

- **Top Bar:**
  - ปุ่ม **"<- กลับหน้าค้นหา" (Back Button)**
  - ปุ่ม Action หลัก เช่น **"Export PDF"**, **"Export Excel"**, **"อัปเดตสถานะบิล"**
- **Header Card (สรุปข้อมูลบิล):**
  - แสดงข้อมูลจาก `agent_invoice` ไฮไลท์ตัวเลขสำคัญ: `iv_no`, `status` (Badge), **Total Net Win**, **Total Amount** รวมถึงชื่อสาขา (`branch_name`)
- **Details Table (ตารางแจกแจงรายการย่อย):**
  - แสดงข้อมูลจาก `agent_invoice_transaction` ที่ `ref_iv_id` ตรงกับบิลนี้
  - **Columns:** ประเภทเกม (Game Category), ค่ายเกม (Game Provider), Net Win, Fee (ค่าธรรมเนียม), Amount (ยอดหลังหัก)
  - *UX Tip:* ด้านล่างสุดของตารางควรมีแถว **Total (รวมยอด)** เพื่อตรวจสอบตัวเลขกับ Header ว่าตรงกัน

---

## 🔌 Expected API Endpoints (รายละเอียด API ที่คาดหวัง)

เพื่อให้สามารถแสดงผลหน้าจอ UI/UX ข้างต้นได้สมบูรณ์ ระบบควรมี API ดังต่อไปนี้รองรับ:
*(หมายเหตุ: Response ของ API มีการเพิ่มฟิลด์ `_name` เข้ามาคู่กับ `_id` ต่าง ๆ เพื่อให้ Frontend สามารถนำไปแสดงผลได้ทันที โดยไม่ต้องไปคิวรีเพิ่ม)*

### 1. GET `/api/v1/invoices`

**หน้าที่:** ดึงข้อมูลรายการใบแจ้งหนี้สำหรับ "หน้าค้นหา" พร้อมรองรับ Pagination และ Filter

- **Query Parameters:** `?page=1&limit=20&search=7W-202604-01&status=READY`
- **Response (Expected):**

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "_id": "6a193d7665ca24eaa8fefcc3",
        "ou_id": "5f4fb5bb3156af7a2db9e5a0",
        "ou_name": "Bangkok Headquarter",
        "branch_id": "5f4f9d57266ed249e45ecef5",
        "branch_name": "Sukhumvit Branch",
        "iv_no": "7W-202604-01",
        "billing_month": "2026-04",
        "due_date": "2026-05-05T00:00:00.000Z",
        "net_win": 369.25,
        "amount": -39.48,
        "status": "READY",
        "cr_date": "2026-05-29T14:17:10.231Z"
      }
    ],
    "pagination": {
      "total": 1,
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### 2. GET `/api/v1/invoices/:id`

**หน้าที่:** ดึงข้อมูลรายละเอียดของใบแจ้งหนี้ (Header Data) สำหรับ "หน้าดูรายละเอียด"

- **Path Parameters:** `id`: `_id` ของใบแจ้งหนี้
- **Response (Expected):**

```json
{
  "status": "success",
  "data": {
    "_id": "6a193d7665ca24eaa8fefcc3",
    "ou_id": "5f4fb5bb3156af7a2db9e5a0",
    "ou_name": "Bangkok Headquarter",
    "branch_id": "5f4f9d57266ed249e45ecef5",
    "branch_name": "Sukhumvit Branch",
    "iv_no": "7W-202604-01",
    "billing_month": "2026-04",
    "due_date": "2026-05-05T00:00:00.000Z",
    "net_win": 369.25,
    "amount": -39.48,
    "status": "READY",
    "cr_by": "wellington",
    "cr_prog": "sum-netwin",
    "cr_date": "2026-05-29T14:17:10.231Z",
    "upd_by": "wellington",
    "upd_prog": "calculate-fee",
    "upd_date": "2026-05-29T14:17:10.289Z"
  }
}
```

### 3. GET `/api/v1/invoices/:id/transactions`

**หน้าที่:** ดึงข้อมูลรายการย่อยในใบแจ้งหนี้นั้น สำหรับแสดงในตารางบน "หน้าดูรายละเอียด"

- **Path Parameters:** `id`: `_id` ของใบแจ้งหนี้ (เทียบกับ `ref_iv_id`)
- **Response (Expected):**

```json
{
  "status": "success",
  "data": [
    {
      "_id": "6a193f9365ca24eaa8fefcd2",
      "ref_iv_id": "6a193f9365ca24eaa8fefccb",
      "ou_id": "5f4fb5bb3156af7a2db9e5a0",
      "ou_name": "Bangkok Headquarter",
      "branch_id": "5f4f9d57266ed249e45ecef5",
      "branch_name": "Sukhumvit Branch",
      "company_id": "5f27e0e88eab0d2e1451893c",
      "company_name": "PG Soft",
      "main_category_id": "5f157dd40cd3be22cc236a6e",
      "main_category_name": "Slot",
      "net_win": 300,
      "fee": 7,
      "amount": -42.85,
      "cr_date": "2026-05-29T14:26:11.313Z"
    }
  ]
}
```

### 4. PUT `/api/v1/invoices/:id/status` (Optional)

**หน้าที่:** อัปเดตสถานะของบิล (สำหรับปุ่มเปลี่ยนสถานะ)

- **Request Body:**

```json
{
  "status": "PAID"
}
```

- **Response (Expected):**

```json
{
  "status": "success",
  "message": "Invoice status updated successfully",
  "data": {
    "_id": "6a193d7665ca24eaa8fefcc3",
    "status": "PAID",
    "upd_date": "2026-06-02T10:00:00.000Z",
    "upd_by": "admin_user"
  }
}
```

### 5. GET `/api/v1/invoices/:id/export/pdf`

**หน้าที่:** สำหรับปุ่ม "Export PDF"

- **Response (Expected):** File Stream (`application/pdf`) หรือ URL สำหรับดาวน์โหลด

### 6. GET `/api/v1/invoices/:id/export/excel`

**หน้าที่:** สำหรับปุ่ม "Export Excel"

- **Response (Expected):** File Stream (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`) หรือ URL สำหรับดาวน์โหลด

### 7. POST `/api/v1/invoices/generate`

**หน้าที่:** สร้างใบแจ้งหนี้ใหม่ประจำเดือน (สามารถเลือกสร้างเฉพาะสาขา หรือทุกสาขาพร้อมกัน)

- **Request Body:**

```json
{
  "month": "2026-06",
  "branch_id": "5f4f9d57266ed249e45ecef5" // Optional: หากไม่ส่งหมายถึงสร้างทุกสาขา
}
```

- **Response (Expected):**

```json
{
  "status": "success",
  "message": "Invoices generated successfully",
  "data": {
    "generated_count": 1
  }
}
```
