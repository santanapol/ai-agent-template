# Tasks: BMI Calculator

> อ้างอิง `_mission-control/tasks/plan.md` · **Implementation เสร็จ** (2026-06-10)

## Phase 1: Foundation

- [x] **Task 1:** Project scaffold (Vite + React + TS + Ant Design + Vitest)
  - **Acceptance:** `npm ci && npm run dev` ที่ port 5174 · `npm run lint` ผ่าน · โครงสร้างตรง Spec
  - **Verify:** `npm ci && npm run dev` · `npm run lint`
  - **Deps:** None
  - **Files:** `package.json`, `vite.config.ts`, `vitest.config.ts`, `eslint.config.js`, `tsconfig*.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/setupTests.ts`
  - **Scope:** M

### Checkpoint: Foundation

- [x] Dev server port 5174
- [x] Lint ผ่าน
- [x] โฟลเดอร์ `src/lib/`, `src/pages/` พร้อม

---

## Phase 2: Core Features

- [x] **Task 2:** BMI domain logic + unit tests (TDD)
  - **Acceptance:** `calculateBmi`, `getBmiCategory`, boundary 18.5/25/30 · format 1 ทศนิยม · tests ผ่าน
  - **Verify:** `npm run test -- src/lib/bmi.test.ts`
  - **Deps:** Task 1
  - **Files:** `src/lib/bmi.ts`, `src/lib/bmi.test.ts`
  - **Scope:** S

- [x] **Task 3:** UI — BmiCalculator page + App shell
  - **Acceptance:** Form ไทย · validation 50–300 / 1–500 · กดปุ่มคำนวณ · 170/70 → ~24.2 "ปกติ" · ไม่มี API
  - **Verify:** manual `npm run dev` · Network tab
  - **Deps:** Task 2
  - **Files:** `src/App.tsx`, `src/pages/BmiCalculator.tsx`
  - **Scope:** M

### Checkpoint: Core Features

- [x] Core flow end-to-end บน browser
- [x] SC-2, SC-3, SC-4 (manual)
- [x] Unit tests ยังผ่าน

- [x] **Task 4:** Component smoke test (1 case)
  - **Acceptance:** กรอก 170/70 → กดคำนวณ → assert BMI + "ปกติ"
  - **Verify:** `npm run test`
  - **Deps:** Task 3
  - **Files:** `src/pages/BmiCalculator.test.tsx`
  - **Scope:** S

---

## Phase 3: Polish

- [x] **Task 5:** README + build gate
  - **Acceptance:** README วิธีรัน · `lint && test && build` ผ่าน · SC-1–SC-6 ครบ
  - **Verify:** `npm run lint && npm run test && npm run build`
  - **Deps:** Task 4
  - **Files:** `README.md`
  - **Scope:** XS

### Checkpoint: Complete

- [x] Success Criteria SC-1 – SC-6 ครบ
- [x] พร้อม review / ship demo

---

## Progress summary

| Phase | Tasks | Status |
| :--- | :--- | :--- |
| Foundation | 1 | ✅ Done |
| Core | 2, 3, 4 | ✅ Done |
| Polish | 5 | ✅ Done |
