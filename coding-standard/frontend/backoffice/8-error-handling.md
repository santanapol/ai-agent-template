# 8. Error Handling

การจัดการข้อผิดพลาด (Error Handling) เพื่อให้ผู้ใช้งานไม่สับสนและมีประสบการณ์ที่ดีเสมอ

## 🚫 การแสดงผล Error (User Feedback)
- หากเกิด Error จากการบันทึกข้อมูล (Save/Submit) หรือกระทำใดๆ **[Required]** ให้แสดงข้อความแจ้งเตือนผ่าน Component `message` หรือ `notification` ของ Ant Design ทันที (เช่น `message.error('ไม่สามารถบันทึกข้อมูลได้')`)
- หาก API ส่งกลับมาในรูปแบบ RFC 7807 (`application/problem+json`) ให้แกะฟิลด์ `message` หรือ `code` ออกมาแปลงเป็นภาษาไทยที่คนทั่วไปเข้าใจได้

## 🚧 Error Boundaries
- **[Recommended]** ควรมีการใช้ Error Boundary (หรือกลไกของ React Router เช่น `errorElement`) คลุมหน้าแอปพลิเคชันเอาไว้เสมอ เผื่อกรณีที่ UI Component เกิดข้อผิดพลาดร้ายแรง หน้าจอจะไม่เป็นสีขาวโพลน แต่จะแสดงหน้า `500 Internal Error` สวยๆ แทน
