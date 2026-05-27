# Frontend Mockups

โฟลเดอร์นี้ใช้สำหรับเก็บไฟล์ภาพ Mockup (Wireframes/High-Fidelity) หรือ Code Snippets ชั่วคราวสำหรับการทำ Interactive Mockup ก่อนที่จะนำไปต่อ API จริง

## แนวทางการทำ Mockup สำหรับ Zero Platform
เนื่องจากเรามี Design System ที่ชัดเจนและเลือกใช้ **Ant Design** แล้ว การทำ Mockup ในโปรเจกต์นี้จะใช้วิธีสร้าง **Code Mockup (Interactive Prototype)** ด้วย React แทนการวาดภาพนิ่ง เพื่อให้สามารถกดโต้ตอบได้จริง (เช่น เปิด Drawer, กรอก Form, สลับ Tab)

### สิ่งที่ควรมีใน Code Mockup
1. **Mock Data:** ข้อมูลจำลองสำหรับแสดงในตาราง (Data Table)
2. **UI Components:** การจัดวาง Layout, Button, Form, Modal
3. **States:** การจำลองสถานะ Loading, Empty State, Success/Error Toast