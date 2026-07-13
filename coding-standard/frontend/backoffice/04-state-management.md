# 4. State Management

แบ่งตามลักษณะ state — ไม่ใช้ library เดียวสำหรับทุกกรณี

## 🔐 Session / domain state (React Context)

- `AuthContext` (`src/contexts/AuthContext.tsx`) เก็บ `user`, `permissions`, `menus`, `loading`, `branchSwitching` และ action (`login`, `logout`, `switchBranch`)
- ใช้ Context เฉพาะข้อมูลที่เปลี่ยนไม่บ่อย (session, permission set) — **ห้าม** ใช้ Context เก็บ state ที่อัปเดตถี่ (จะทำให้ re-render ทั้งแอป)

## 🎛️ UI / preferences state (Zustand)

- ใช้ `zustand/vanilla` + provider pattern สำหรับ state ที่ persist ข้าม navigation เช่น theme mode (`src/stores/preferences/`)
- สร้างผ่าน factory (`createPreferencesStore`) แล้ว hydrate ค่าเริ่มต้นจาก provider — ไม่เรียก store แบบ global singleton ตรงๆ ใน Server Component
- `ThemeContext` / `useTheme` เป็น compat layer ที่อ่านจาก preferences store (ดู 06) — ไม่เก็บ theme state ซ้ำใน Context

## 🏠 Local state

- ใช้ `useState`/`useReducer` ปกติสำหรับข้อมูลเฉพาะ component (form input, modal visibility)
- Form ที่ซับซ้อน (validation, multi-field) ให้ใช้ `react-hook-form` + `zod` schema แทนการเขียน validation state มือ

## 📡 Data fetching state

- ทุกการเรียก API ต้องมี `loading`/`isFetching` เสมอ เพื่อแสดง skeleton/spinner กันผู้ใช้สับสน
