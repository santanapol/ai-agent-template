import type React from "react";

import { LoadingButton } from "@/components/LoadingButton";
import { StaffFormField } from "@/components/staff/StaffFormField";
import { Field, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { PASSWORD_REQUIREMENTS_DESCRIPTION } from "@/lib/passwordPolicy";
import type { StaffProfileFormValues, StaffProfilePageMode } from "@/lib/staffProfileForm";

const ROLE_OPTIONS = [
  { value: "platform_admin", label: "Platform Admin" },
  { value: "branch_admin", label: "Branch Admin" },
  { value: "support_admin", label: "Support Admin" },
  { value: "support", label: "Support" },
  { value: "staff", label: "Staff" },
];

interface StaffProfileFormProps {
  mode: StaffProfilePageMode;
  loading: boolean;
  updatingPassword: boolean;
  showAdminResetPassword: boolean;
  canAssignRole?: boolean;
  values: StaffProfileFormValues;
  errors: Partial<Record<keyof StaffProfileFormValues, string>>;
  onChange: (field: keyof StaffProfileFormValues, value: string) => void;
  onUpdatePassword: () => void;
}

const StaffProfileForm: React.FC<StaffProfileFormProps> = ({
  mode,
  loading,
  updatingPassword,
  showAdminResetPassword,
  canAssignRole = false,
  values,
  errors,
  onChange,
  onUpdatePassword,
}) => {
  const disabled = mode === "view";

  if (loading) {
    return (
      <div className="flex justify-center py-12" role="status" aria-busy="true" aria-label="Loading staff profile">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
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
      <StaffFormField id="staff-email" label="Email" error={errors.email} description="Optional">
        <Input
          type="email"
          value={values.email ?? ""}
          disabled={disabled}
          onChange={(e) => onChange("email", e.target.value)}
          maxLength={254}
        />
      </StaffFormField>
      <StaffFormField id="staff-tel" label="Telephone" error={errors.tel} description="Optional">
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
          <FieldLabel htmlFor="staff-role">System Role</FieldLabel>
          <Select
            value={values.role ?? "staff"}
            onValueChange={(v) => onChange("role", v ?? "staff")}
            disabled={disabled}
          >
            <SelectTrigger id="staff-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      ) : null}
      {mode === "create" ? (
        <>
          <Separator />
          <StaffFormField id="staff-username" label="Username" error={errors.username}>
            <Input
              value={values.username ?? ""}
              disabled={disabled}
              onChange={(e) => onChange("username", e.target.value)}
              autoComplete="off"
            />
          </StaffFormField>
          <StaffFormField
            id="staff-password"
            label="Password"
            error={errors.password}
            description={PASSWORD_REQUIREMENTS_DESCRIPTION}
          >
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
          <FieldTitle>Reset password (admin)</FieldTitle>
          <StaffFormField
            id="staff-new-password"
            label="New password"
            error={errors.newPassword}
            description={PASSWORD_REQUIREMENTS_DESCRIPTION}
          >
            <Input
              type="password"
              value={values.newPassword ?? ""}
              disabled={disabled}
              onChange={(e) => onChange("newPassword", e.target.value)}
              autoComplete="new-password"
            />
          </StaffFormField>
          <StaffFormField id="staff-confirm-new-password" label="Confirm password" error={errors.confirmNewPassword}>
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
  );
};

export default StaffProfileForm;
