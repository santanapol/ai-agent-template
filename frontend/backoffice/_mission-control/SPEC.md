# Spec: Add Username Field to Create Staff Profile

## 1. Objective and Target Users
- **Objective**: Align the frontend implementation of the "Create Staff Profile" form with the original UX/UI design documents (`docs/ui-ux-design.md`) and the backend API requirements. Specifically, add a dedicated `Username` input field for provisioning a new user, rather than implicitly using the staff code.
- **Target Users**: `platform_admin` and `branch_admin` who use the backoffice to manage staff profiles.

## 2. Core Features and Acceptance Criteria
- **Feature**: Add `Username` field to the `StaffDrawer` component when in `create` mode.
- **Acceptance Criteria**:
  - The "Create Staff Profile" slide-over contains a required `Username` input field.
  - The helper text "Username = Staff Code" is removed.
  - The API payload (`CreateProfilePayload`) correctly includes the `username` field.
  - The `staffApi.createProfile` request succeeds without throwing a `400 INVALID_PARAM` error from the backend.
  - The `Username` field is not displayed or editable in `edit` mode (consistent with existing business rules).

## 3. Tech Stack Requirements and Constraints
- **Stack**: React, TypeScript, Ant Design (`antd`), Axios.
- **Constraints**:
  - `username` must be a string (minLength 1, maxLength 128) based on backend schema.
  - Follow existing Ant Design Form validation patterns.

## 4. Project Structure (Files to Modify)
1. **`src/types/staff.ts`**
   - Update `CreateProfilePayload` interface to include `username?: string` (or required string, depending on frontend strictness).
2. **`src/components/staff/StaffDrawer.tsx`**
   - Add `<Form.Item label="Username" name="username" rules={[{ required: true, message: 'Please enter username' }]}>` with an `<Input />`.
   - Update `DrawerFormValues` type to include `username`.
   - Remove the outdated `Typography.Paragraph` that says "Username = Staff Code".
3. **`src/pages/StaffManagement.tsx`**
   - In `handleSave`, add `'username'` to the `fieldNames` array for form validation in `create` mode.
   - Pass `username: values.username!` to `staffApi.createProfile`.

## 5. Testing Strategy
- **Manual Verification**: 
  - Open the "Add New Staff" drawer.
  - Verify the `Username` field is present and required.
  - Fill out the form and submit.
  - Verify a successful API request is made (201 Created) and the new staff appears in the table.
  - Open the "Edit Profile" drawer and ensure `Username` cannot be edited.

## 6. Boundaries
- **In Scope**: Modifying the frontend staff creation form to explicitly collect and send the `username`.
- **Out of Scope**: Modifying backend validation logic. Changing how user authentication/login works.
