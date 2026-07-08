import type React from "react";

import { LoadingButton } from "@/components/LoadingButton";
import { StaffFormField } from "@/components/staff/StaffFormField";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { PASSWORD_MIN_LENGTH } from "@/lib/passwordPolicy";
import type { CreateProfilePayload, PatchProfilePayload } from "@/types/staff";

export type DrawerMode = "create" | "edit" | "view";

const TITLES: Record<DrawerMode, string> = {
  create: "Create Staff Profile",
  edit: "Edit Staff Profile",
  view: "View Staff Profile",
};

const DESCRIPTIONS: Record<DrawerMode, string> = {
  create: "Add a new staff member with credentials and role assignment.",
  edit: "Update profile details, role, and optional password reset.",
  view: "Review staff profile details in read-only mode.",
};

export type DrawerFormValues = CreateProfilePayload &
  PatchProfilePayload & {
    password?: string;
    confirmPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
    role?: string;
  };

interface StaffDrawerProps {
  open: boolean;
  mode: DrawerMode;
  loading: boolean;
  isSaving: boolean;
  updatingPassword: boolean;
  showAdminResetPassword: boolean;
  canAssignRole?: boolean;
  values: DrawerFormValues;
  errors: Partial<Record<keyof DrawerFormValues, string>>;
  onChange: (field: keyof DrawerFormValues, value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onSwitchToEdit: () => void;
  onUpdatePassword: () => void;
}

const ROLE_OPTIONS = [
  { value: "platform_admin", label: "Platform Admin" },
  { value: "branch_admin", label: "Branch Admin" },
  { value: "support_admin", label: "Support Admin" },
  { value: "support", label: "Support" },
  { value: "staff", label: "Staff" },
];

const StaffDrawer: React.FC<StaffDrawerProps> = ({
  open,
  mode,
  loading,
  isSaving,
  updatingPassword,
  showAdminResetPassword,
  canAssignRole = false,
  values,
  errors,
  onChange,
  onClose,
  onSave,
  onSwitchToEdit,
  onUpdatePassword,
}) => {
  const disabled = mode === "view";
  const title = TITLES[mode];
  const description = DESCRIPTIONS[mode];

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="size-8" />
            </div>
          ) : (
            <FieldGroup className="gap-4">
              <StaffFormField id="staff-code" label="Staff Code" error={errors.code}>
                <Input
                  value={values.code ?? ""}
                  disabled={disabled || mode !== "create"}
                  onChange={(e) => onChange("code", e.target.value)}
                  maxLength={32}
                  placeholder="e.g. EMP-001"
                />
              </StaffFormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <StaffFormField id="staff-firstname" label="First Name" error={errors.firstname}>
                  <Input
                    value={values.firstname ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange("firstname", e.target.value)}
                    maxLength={128}
                  />
                </StaffFormField>
                <StaffFormField id="staff-lastname" label="Last Name" error={errors.lastname}>
                  <Input
                    value={values.lastname ?? ""}
                    disabled={disabled}
                    onChange={(e) => onChange("lastname", e.target.value)}
                    maxLength={128}
                  />
                </StaffFormField>
              </div>
              <StaffFormField id="staff-email" label="Email" error={errors.email}>
                <Input
                  type="email"
                  value={values.email ?? ""}
                  disabled={disabled}
                  onChange={(e) => onChange("email", e.target.value)}
                  maxLength={254}
                />
              </StaffFormField>
              <StaffFormField id="staff-tel" label="Telephone" error={errors.tel}>
                <Input
                  value={values.tel ?? ""}
                  disabled={disabled}
                  onChange={(e) => onChange("tel", e.target.value)}
                  placeholder="e.g. 0812345678 or +66812345678"
                  maxLength={20}
                />
              </StaffFormField>
              {canAssignRole ? (
                <Field>
                  <FieldLabel>System Role</FieldLabel>
                  <Select
                    value={values.role ?? "staff"}
                    onValueChange={(v) => onChange("role", v ?? "staff")}
                    disabled={disabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              {mode === "create" ? (
                <>
                  <Separator />
                  <p className="text-muted-foreground text-sm">Minimum {PASSWORD_MIN_LENGTH} characters.</p>
                  <StaffFormField id="staff-username" label="Username" error={errors.username}>
                    <Input
                      value={values.username ?? ""}
                      disabled={disabled}
                      onChange={(e) => onChange("username", e.target.value)}
                      autoComplete="off"
                    />
                  </StaffFormField>
                  <StaffFormField id="staff-password" label="Password" error={errors.password}>
                    <Input
                      type="password"
                      value={values.password ?? ""}
                      disabled={disabled}
                      onChange={(e) => onChange("password", e.target.value)}
                      autoComplete="new-password"
                    />
                  </StaffFormField>
                  <StaffFormField id="staff-confirm-password" label="Confirm password" error={errors.confirmPassword}>
                    <Input
                      type="password"
                      value={values.confirmPassword ?? ""}
                      disabled={disabled}
                      onChange={(e) => onChange("confirmPassword", e.target.value)}
                      autoComplete="new-password"
                    />
                  </StaffFormField>
                </>
              ) : null}
              {showAdminResetPassword ? (
                <>
                  <Separator />
                  <p className="font-medium text-sm">Reset password (admin)</p>
                  <StaffFormField id="staff-new-password" label="New password" error={errors.newPassword}>
                    <Input
                      type="password"
                      value={values.newPassword ?? ""}
                      disabled={disabled}
                      onChange={(e) => onChange("newPassword", e.target.value)}
                      autoComplete="new-password"
                    />
                  </StaffFormField>
                  <StaffFormField
                    id="staff-confirm-new-password"
                    label="Confirm password"
                    error={errors.confirmNewPassword}
                  >
                    <Input
                      type="password"
                      value={values.confirmNewPassword ?? ""}
                      disabled={disabled}
                      onChange={(e) => onChange("confirmNewPassword", e.target.value)}
                      autoComplete="new-password"
                    />
                  </StaffFormField>
                  <LoadingButton loading={updatingPassword} onClick={onUpdatePassword}>
                    Update password
                  </LoadingButton>
                </>
              ) : null}
            </FieldGroup>
          )}
        </div>
        <SheetFooter className="flex-row justify-end gap-2 border-t px-4 py-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {mode !== "view" ? (
            <LoadingButton loading={isSaving} onClick={onSave}>
              {mode === "create" ? "Create Profile" : "Save Changes"}
            </LoadingButton>
          ) : (
            <Button onClick={onSwitchToEdit}>Edit Profile</Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default StaffDrawer;
