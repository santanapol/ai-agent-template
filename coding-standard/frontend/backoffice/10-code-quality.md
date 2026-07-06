# 10. Code Quality & Formatting

มาตรฐานการรักษาความสะอาดและรูปแบบโค้ด (Linting)

## 🧹 ESLint & TypeScript
- บังคับใช้ **ESLint v10+** ร่วมกับ `typescript-eslint` 
- เปิดใช้งานปลั๊กอิน `eslint-plugin-react-hooks` เพื่อบังคับกฎเรื่อง Dependency Array ของ `useEffect` และ `useCallback` อย่างเคร่งครัด
- **TypeScript Rules:** บังคับให้ใช้ Strict Mode เสมอ ห้ามใช้ `any` พร่ำเพรื่อเด็ดขาด ให้ระบุ Type ให้ชัดเจน (เช่น `DecodedUser`, `TokenResponse`)

## 🎨 Prettier
- ใช้สำหรับการทำ Formatting ให้ตรงกันทั้งทีม
- กฎพื้นฐาน:
  - ใช้ Single Quote (`'`) แทน Double Quote (`"`) ในโค้ด TS/JS
  - ใช้ Double Quote (`"`) ปกติสำหรับการส่ง Props ใน JSX (`<div className="flex" />`)
  - เว้นวรรคแบบ 2 เคาะ (2 Spaces)
  - จบบรรทัดด้วย Semicolon เสมอ (`;`)
