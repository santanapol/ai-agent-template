# Plan: Add Username Field to Create Staff Profile

## 1. Dependency Graph
- `src/types/staff.ts` (Base types for Payload)
  - `src/components/staff/StaffDrawer.tsx` (UI Component utilizing the Payload type)
  - `src/pages/StaffManagement.tsx` (Page Component orchestrating API calls with Payload type)

## 2. Vertical Slices
Since this is a small change, there is only one vertical slice:
**Slice 1: Frontend Staff Profile Provisioning Update**
- Update types, UI form, and page orchestration all together to enable passing the `username` field.

## 3. Tasks & Acceptance Criteria

### Task 1: Update Type Definitions
- **Action:** Add `username?: string;` to `CreateProfilePayload` in `src/types/staff.ts`.
- **Acceptance Criteria:** `CreateProfilePayload` accepts `username`.

### Task 2: Update Staff Drawer UI
- **Action:** Modify `src/components/staff/StaffDrawer.tsx`. Remove the text "Username = Staff Code". Add an `<Input>` wrapped in `<Form.Item name="username" label="Username">`.
- **Acceptance Criteria:** The UI displays a required Username input in `create` mode, and the hardcoded text is gone.

### Task 3: Update Page Orchestration
- **Action:** Modify `src/pages/StaffManagement.tsx`. Add `'username'` to the `fieldNames` array in `handleSave`. Extract `username: values.username!` into the `staffApi.createProfile` payload.
- **Acceptance Criteria:** Submitting the form correctly bundles the `username` into the API request without compilation errors.

## 4. Checkpoints
- **Checkpoint 1:** After Task 3, run `npx tsc --noEmit` to verify type safety before manual testing.
- **Checkpoint 2:** Perform manual UI testing to confirm the 400 API error is resolved.
