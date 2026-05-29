# Todo: Add Username Field

- [x] **Task 1: Update Type Definitions**
  - Add `username?: string;` to `CreateProfilePayload` in `src/types/staff.ts`.
- [x] **Task 2: Update Staff Drawer UI**
  - Edit `src/components/staff/StaffDrawer.tsx`.
  - Remove "Username = Staff Code".
  - Add `<Form.Item name="username" label="Username">`.
- [x] **Task 3: Update Page Orchestration**
  - Edit `src/pages/StaffManagement.tsx`.
  - Add `'username'` to `fieldNames`.
  - Map `username: values.username!` into payload.
- [x] **Checkpoint 1:** Run `npx tsc --noEmit` and ensure it passes.
- [ ] **Checkpoint 2:** Manual UI testing to verify profile creation works successfully.
