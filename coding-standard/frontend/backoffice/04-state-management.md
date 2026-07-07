# 4. State Management

สำหรับโปรเจกต์ขนาดกลางถึงใหญ่ เรายึดหลักความเรียบง่ายและ Native เป็นหลัก

## 🌍 Global State (Context API)
- ใช้ **React Context API** สำหรับข้อมูลที่ต้องแชร์ข้ามหลายๆ ส่วนประกอบ เช่น:
  - `AuthContext`: เก็บข้อมูลของผู้ใช้ (`user`), สถานะล็อกอิน (`loading`), และฟังก์ชัน `login`/`logout`
  - `ThemeContext`: (ถ้ามี) สำหรับเปลี่ยนโหมดสี
- **ข้อห้าม:** ไม่ควรใช้ Context API ในการเก็บข้อมูลที่มีการอัปเดตถี่มากๆ (High-frequency updates) เพราะจะทำให้เกิดปัญหา Re-render ทั้งแอปพลิเคชัน

## 🏠 Local State
- ใช้ `useState` หรือ `useReducer` ปกติสำหรับข้อมูลที่ใช้เฉพาะใน Component หรือ Page นั้นๆ (เช่น Form inputs, Modal visibility)

## 📡 Data Fetching State
- เมื่อทำการเรียก API จะต้องมีสถานะ `loading` หรือ `isFetching` เสมอ เพื่อแสดง Skeleton หรือ Spinner ป้องกันการสับสนของผู้ใช้
