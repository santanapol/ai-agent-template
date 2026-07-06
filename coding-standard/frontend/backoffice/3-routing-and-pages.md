# 3. Routing & Pages

เราใช้ `react-router-dom` สำหรับการจัดการเส้นทางทั้งหมดในแอปพลิเคชัน 

## กฎการจัดการ Route (`App.tsx` หรือ `AppRoutes`)
- **Protected Routes:** หน้าเพจใดๆ ที่ต้องทำการล็อกอินก่อนเข้าถึง ให้ครอบด้วย Component `<ProtectedRoute>` เสมอ
- **Layout Wrapper:** ให้จับกลุ่ม Route ที่มีโครงร่างเหมือนกันไว้ภายใต้ `<Layout>` เดียวกัน (เช่น `<AdminLayout>`)
- **Error Pages:** บังคับให้มี Route สำหรับจับ Error เสมอ:
  - `path="403"` ➔ เมื่อผู้ใช้ไม่มีสิทธิ์เข้าถึง (Forbidden)
  - `path="404"` ➔ เมื่อหา URL นั้นไม่พบ (Not Found)
  - `path="*"` ➔ ให้ Redirect หรือแสดงหน้า `404`
  - `path="500"` ➔ เมื่อเกิดข้อผิดพลาดรุนแรงระดับ Server หรือ Error Boundary

## การตั้งชื่อ Component ในโฟลเดอร์ `pages/`
- ใช้ **PascalCase** เสมอ (เช่น `StaffManagement.tsx`, `MyProfile.tsx`, `Error403.tsx`)
- หลีกเลี่ยงการตั้งชื่อไฟล์ว่า `index.tsx` เพื่อให้ค้นหาไฟล์ผ่าน Editor ได้ง่าย
