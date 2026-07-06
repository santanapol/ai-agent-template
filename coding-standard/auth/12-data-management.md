# 6. Data Management

มาตรฐานสำหรับการจัดการข้อมูลในระดับ Database (Domain Level) เพื่อความปลอดภัยและสามารถตรวจสอบย้อนหลังได้

## 🛡️ Data Scoping (Tenant Isolation)

**กฎเหล็ก:** ทุก Query (Read/Write) **บังคับระบุ** `ou_id` และ `branch_id` เสมอ เพื่อป้องกัน Data Leakage ข้ามสาขา (Tenant)

```javascript
// ✅ Correct Example
const products = await db.collection('products').find({
    ou_id: new ObjectId(ou_id),
    branch_id: new ObjectId(branch_id),
    status: 'active'
}).toArray();
```

## 📝 Audit Fields (ประวัติการเปลี่ยนแปลง)

ทุก Collection ที่ต้องมีการ Tracking ข้อมูล บังคับให้เก็บและอัปเดตฟิลด์ Audit ดังนี้:

| เหตุการณ์ (Event) | ฟิลด์ที่บันทึก | เงื่อนไขเพิ่มเติม |
| :--- | :--- | :--- |
| **เมื่อ Create (สร้างใหม่)** | `cr_by`, `cr_date`, `cr_prog`<br>`upd_by`, `upd_date`, `upd_prog` | ค่าชุดตัวแปร `upd_` ต้อง **เท่ากับ** ชุด `cr_` เสมอตอนสร้าง |
| **เมื่อ Update (แก้ไข)** | `upd_by`, `upd_date`, `upd_prog` | อัปเดตข้อมูลเฉพาะฝั่ง `upd_` เท่านั้น |

> 💡 **การกำหนด `_prog`:** ให้ระบุชื่อโปรแกรมหรือ Endpoint ที่ทำการบันทึกข้อมูล โดยอ้างอิงตาม Route (เช่น `/api/v1/user/profile`)

## 🔒 Optimistic Locking (ป้องกันการเซฟทับ)

ในการทำ Update **บังคับ** ให้ใช้ `upd_date` ของข้อมูลก่อนหน้า (Original Value) เป็นเงื่อนไขตรวจสอบ Version เสมอ เพื่อป้องกันปัญหา Concurrent Updates (ผู้ใช้ 2 คนเซฟทับกันในเสี้ยววินาที)

```javascript
// ✅ Correct: ห้อย upd_date เดิม (original_upd_date) มาในเงื่อนไขค้นหา
const result = await db.collection('products').updateOne(
    { 
        _id: new ObjectId(id), 
        upd_date: original_upd_date // เช็ค Version ด้วย Data เดิม
    }, 
    { $set: updatePayload }
);

// หากหาไม่เจอ แปลว่ามีคนอื่นแก้ไปก่อนหน้าแล้ว (Version ไม่ตรงกัน)
if (result.matchedCount === 0) {
    throw new Error('Data has been modified by another user. Please refresh and try again.');
}
```
