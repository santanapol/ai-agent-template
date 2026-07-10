# 10. Code Quality & Formatting

## Biome (lint + format ในเครื่องมือเดียว)

- ใช้ **Biome** (`@biomejs/biome`) แทน ESLint + Prettier — คำสั่งหลักใน `frontend/backoffice-next`:
  - `npm run lint` → `biome lint`
  - `npm run check` → `biome check`
- Import ต้องเรียงตามกลุ่มที่ตั้งค่าไว้ใน `biome.json` (`assist.actions.source.organizeImports`): `react` → `next/**` → package ภายนอก → alias (`@/...`) → relative path — ให้ `biome check --write` จัดให้ ไม่เรียงมือ
- **TypeScript rules:** Strict mode เสมอ ห้ามใช้ `any` พร่ำเพรื่อ ระบุ type ให้ชัดเจน (เช่น `DecodedUser`, `TokenResponse`)

ไม่มีสคริปต์ `check:fix` / `generate:presets` ใน production `package.json` — อย่าอ้างใน AGENTS หรือ CI ของแอปนี้

## Format

- Double quotes, semicolon, 2-space indent, บรรทัดยาวไม่เกิน 120 ตัวอักษร — ตามค่า default ของ Biome ใน `biome.json` (ไม่ตั้งซ้ำมือ)
- `eslint-disable`/`biome-ignore` ต้องมี comment อธิบายเหตุผลกำกับเสมอ (ดูตัวอย่างใน `AuthContext.tsx` — `biome-ignore lint/correctness/useExhaustiveDependencies`)

## Testing

- `vitest run` (script `npm test`) — environment `jsdom`, setup ที่ `src/setupTests.ts` (mock `next/navigation`, `matchMedia`, `ResizeObserver`)
- Test อยู่ co-located กับไฟล์ที่ทดสอบ (`Foo.tsx` คู่กับ `Foo.test.tsx`) เป็นหลัก — บาง feature เก็บชุดทดสอบย่อยที่ `views/<feature>/test/`
- ไม่แยกโฟลเดอร์ `__tests__/` เป็นค่าเริ่มต้น
- Mock ที่ใช้ร่วมหลาย suite (เช่น font mock, geist mock) เก็บที่ `src/test/mocks/`
