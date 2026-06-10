# Spec: BMI Calculator (zero-platform demo)

> สถานะ: **อนุมัติแล้ว** (2026-06-10) · Implementation เสร็จ (2026-06-10) · อ้างอิง intent จาก `docs/raw-requrement.md`

## Assumptions (ข้อสมมติฐานที่ตั้งไว้)

โปรดแก้ไขทันทีหากไม่ถูกต้อง — มิเช่นนั้นจะดำเนินการตามนี้:

1. **ภาษา UI เป็นไทย** — ใช้ `antd/locale/th_TH` เหมือน backoffice
2. **หมวดหมู่ BMI ใช้เกณฑ์ WHO สำหรับผู้ใหญ่** (ไม่แยกเพศ/อายุ):
   - น้ำหนักน้อย: BMI < 18.5
   - ปกติ: 18.5 – 24.9
   - น้ำหนักเกิน: 25.0 – 29.9
   - อ้วน: ≥ 30.0
3. **คำนวณเมื่อกดปุ่ม "คำนวณ"** — ไม่คำนวณ real-time ทุก keystroke
4. **ไม่ใช้ `react-router-dom`** — หน้าเดียว ไม่มี routing (ลด complexity ของ demo)
5. **ไม่ใช้ `axios`** — ไม่มี API call
6. **Dev server port `5174`** — หลีกเลี่ยงชนกับ backoffice (default `5173`)
7. **รองรับเบราว์เซอร์ยุคใหม่เท่านั้น** — ไม่รองรับ IE11
8. **แสดง BMI ทศนิยม 1 ตำแหน่ง** (เช่น `22.5`)

---

## Objective

### เราสร้างอะไร

Demo app **BMI Calculator** — pure frontend ใน `frontend/bmi-cal` ที่รับส่วนสูง (cm) และน้ำหนัก (kg) แล้วแสดง **ตัวเลข BMI + หมวดหมู่** บนหน้าเดียว

### ทำไม

เป็นส่วนหนึ่งของ **zero-platform demo** สำหรับทีม / workflow agent-skill — ไม่ใช่ production health product

### ผู้ใช้

คนที่รัน demo local (developer, reviewer)

### User stories

| # | Story | Acceptance |
| :--- | :--- | :--- |
| US-1 | ในฐานะผู้ใช้ demo ฉันต้องการกรอกส่วนสูง (cm) และน้ำหนัก (kg) | Form มี input 2 ช่อง พร้อม label และหน่วยชัดเจน |
| US-2 | ฉันต้องการกดปุ่มเพื่อคำนวณ BMI | มีปุ่ม "คำนวณ" — กดแล้วแสดงผล |
| US-3 | ฉันต้องการเห็นตัวเลข BMI และหมวดหมู่ | แสดงค่า BMI (1 ทศนิยม) + ข้อความหมวดหมู่ภาษาไทย |
| US-4 | ฉันต้องการรู้เมื่อกรอกข้อมูลไม่ถูกต้อง | แสดง validation message ก่อนคำนวณ (Ant Design Form rules) |
| US-5 | ฉันต้องการเปิดใช้งานได้ทันทีโดยไม่ login | ไม่มี auth flow, ไม่ redirect ไป login |

---

## Tech Stack

| Layer | Technology | หมายเหตุ |
| :--- | :--- | :--- |
| Framework | React 19 | สอดคล้อง backoffice |
| Build | Vite 8 | |
| Language | TypeScript (strict) | |
| UI | Ant Design 6 + `@ant-design/icons` | ConfigProvider + locale `th_TH` |
| Testing | Vitest + `@testing-library/react` | co-located ใน `src/` |
| Lint | ESLint 10 + typescript-eslint | flat config เหมือน backoffice |

**ไม่ใช้ใน demo นี้:** react-router-dom, axios, backend/gateway, auth

---

## Commands

```bash
# ติดตั้ง dependencies (ครั้งแรก)
npm ci

# Dev server — http://localhost:5174
npm run dev

# Production build
npm run build

# Preview build
npm run preview

# Unit tests
npm run test

# Lint
npm run lint
```

---

## Project Structure

```text
frontend/bmi-cal/
├── _mission-control/
│   └── SPEC.md              # เอกสาร spec นี้
├── docs/
│   └── raw-requrement.md    # intent ที่ยืนยันแล้ว
├── public/
│   └── favicon.svg          # (optional) icon ง่ายๆ
├── src/
│   ├── lib/
│   │   ├── bmi.ts           # calculateBmi, getBmiCategory, validation helpers
│   │   └── bmi.test.ts      # unit tests สำหรับ logic
│   ├── pages/
│   │   └── BmiCalculator.tsx # หน้าหลัก — form + ผลลัพธ์
│   ├── App.tsx              # ConfigProvider + AntApp wrapper
│   ├── main.tsx             # React root
│   ├── index.css            # minimal global reset (ถ้าจำเป็น)
│   └── setupTests.ts        # vitest setup (@testing-library/jest-dom)
├── index.html
├── package.json
├── vite.config.ts           # port 5174
├── vitest.config.ts
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
└── eslint.config.js
```

### โครงสร้างที่ตั้งใจไม่สร้าง

- `src/contexts/` — ไม่มี global state ที่ซับซ้อน
- `src/layouts/` — หน้าเดียว ไม่ต้อง layout แยก
- `src/components/` — สร้างเมื่อมี reusable component จริง (YAGNI)

---

## Code Style

ยึดมาตรฐาน `coding-standard/frontend/backoffice/` ที่เกี่ยวข้อง:

### Naming

| ประเภท | รูปแบบ | ตัวอย่าง |
| :--- | :--- | :--- |
| Page component | PascalCase ใน `pages/` | `BmiCalculator.tsx` |
| Utility / pure fn | camelCase ใน `lib/` | `calculateBmi`, `getBmiCategory` |
| Types | PascalCase | `BmiCategory`, `BmiResult` |

### ตัวอย่าง pure function (เป้าหมาย)

```typescript
// src/lib/bmi.ts
export type BmiCategory = 'underweight' | 'normal' | 'overweight' | 'obese';

export interface BmiResult {
  value: number;
  category: BmiCategory;
  labelTh: string;
}

export function calculateBmi(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBmiCategory(bmi: number): BmiResult {
  // map to category + labelTh
}
```

### UI rules

- ใช้ Ant Design Form, InputNumber, Button, Card, Typography
- Theme ผ่าน `ConfigProvider` ใน `App.tsx` — token เดียวกับ backoffice (`colorPrimary: '#2563EB'`, font `'Inter', 'Sarabun'`)
- หลีกเลี่ยง custom CSS — ใช้ `<Flex>`, `<Space>`, `<Row>`, `<Col>` สำหรับ layout
- Single quotes ใน TS/JS, semicolon, 2 spaces (Prettier/ESLint)

### Import direction

- `pages/` → import จาก `lib/` ได้
- `lib/` → **ห้าม** import จาก `pages/`

---

## Domain Logic

### สูตร

```
BMI = weight (kg) / (height (m))²
height (m) = height (cm) / 100
```

### Validation rules

| Field | กฎ | ข้อความ error (ไทย) |
| :--- | :--- | :--- |
| ส่วนสูง (cm) | required, number, > 0, 50–300 | "กรุณากรอกส่วนสูง 50–300 ซม." |
| น้ำหนัก (kg) | required, number, > 0, 1–500 | "กรุณากรอกน้ำหนัก 1–500 กก." |

### Category labels (ไทย)

| Category key | ช่วง BMI | labelTh |
| :--- | :--- | :--- |
| `underweight` | < 18.5 | น้ำหนักน้อย |
| `normal` | 18.5 – 24.9 | ปกติ |
| `overweight` | 25.0 – 29.9 | น้ำหนักเกิน |
| `obese` | ≥ 30.0 | อ้วน |

---

## Testing Strategy

| ระดับ | Framework | ครอบคลุม | ตำแหน่งไฟล์ |
| :--- | :--- | :--- | :--- |
| Unit | Vitest | `calculateBmi`, `getBmiCategory`, edge cases (boundary values) | `src/lib/bmi.test.ts` |
| Component | `@testing-library/react` | smoke test 1 case — form submit แสดงผลถูกต้อง | `src/pages/BmiCalculator.test.tsx` |

### Test cases ขั้นต่ำ (unit)

- BMI ปกติ: 170 cm, 70 kg → ~24.2, category `normal`
- Boundary: BMI = 18.5 → `normal`, BMI = 24.9 → `normal`
- Boundary: BMI = 25.0 → `overweight`
- Boundary: BMI = 30.0 → `obese`
- Invalid input → validation ไม่ผ่าน (component level)

### Coverage expectation

- **`src/lib/bmi.ts`**: 100% branch coverage เป็นเป้าหมาย
- UI component: smoke test พอสำหรับ demo

### Verify ก่อน merge

```bash
npm run lint && npm run test && npm run build
```

---

## Boundaries

### Always do

- คำนวณ BMI ใน browser — ไม่เรียก API
- ใช้ metric (cm, kg) เท่านั้น
- ใช้ Ant Design components เป็นหลัก
- แยก business logic ออกจาก UI ใน `src/lib/`
- รัน `npm run lint && npm run test` ก่อนส่งงาน

### Ask first

- เพิ่ม dependency ใหม่ (นอกจาก stack ที่ระบุ)
- เพิ่ม routing หรือหลายหน้า
- เปลี่ยนเกณฑ์ BMI category จาก WHO standard
- เพิ่ม i18n / สลับภาษา
- เชื่อม backend หรือ zero-platform gateway
- เปลี่ยน dev port จาก 5174

### Never do

- Login / authentication
- เก็บ history หรือ persist ข้อมูล (localStorage, backend)
- Imperial units (ft, lb)
- คำแนะนำสุขภาพ / medical advice
- Deploy configuration ใน scope demo นี้
- ใช้ `any` โดยไม่จำเป็น
- Override Ant Design ด้วย custom CSS ถ้าปรับผ่าน token ได้

---

## Success Criteria

| # | เกณฑ์ | วิธีตรวจ |
| :--- | :--- | :--- |
| SC-1 | `npm ci && npm run dev` เปิด `http://localhost:5174` ได้ | รัน local |
| SC-2 | กรอก 170 cm, 70 kg → แสดง BMI ~24.2 และหมวด "ปกติ" | manual / component test |
| SC-3 | กรอกค่าว่างหรือ out-of-range → แสดง validation error | manual |
| SC-4 | ไม่มีหน้า login หรือ API call | ตรวจ code + Network tab |
| SC-5 | `npm run test` ผ่าน | CI/local |
| SC-6 | `npm run build` ผ่าน | CI/local |

---

## Resolved Decisions (ตอบแล้ว — 2026-06-10)

| # | คำถาม | คำตอบที่ยืนยัน |
| :--- | :--- | :--- |
| OQ-1 | UI ภาษาไทยทั้งหมด หรือมี EN ด้วย? | **ไทยทั้งหมด** |
| OQ-2 | คำนวณเมื่อกดปุ่ม หรือ real-time? | **กดปุ่ม** |
| OQ-3 | ต้องมี component test สำหรับหน้า BmiCalculator ไหม? | **มี smoke test 1 case** |

---

## Approval

- [x] เบียร์อนุมัติ Spec นี้ (2026-06-10)
- [x] ข้อสมมติฐาน (Assumptions) ถูกต้อง — OQ-1/OQ-2/OQ-3 ยืนยันตามตารางด้านบน

**ขั้นถัดไป:** `/test` หรือ manual verify · deploy อยู่นอก scope
