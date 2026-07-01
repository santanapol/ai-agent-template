import React from 'react';
import { LoadingButton } from '@/components/loading-button';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { fieldErrorIds } from '@/lib/fieldA11y';
import { PASSWORD_MIN_LENGTH } from '@/lib/passwordPolicy';
import type { CreateProfilePayload, PatchProfilePayload } from '@/types/staff';

export type DrawerMode = 'create' | 'edit' | 'view';

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
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'branch_admin', label: 'Branch Admin' },
  { value: 'support_admin', label: 'Support Admin' },
  { value: 'support', label: 'Support' },
  { value: 'staff', label: 'Staff' },
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
  const disabled = mode === 'view';
  const title =
    mode === 'create' ? 'Create Staff Profile' : mode === 'edit' ? 'Edit Staff Profile' : 'View Staff Profile';
  const getFieldA11y = (name: string, error?: string) => (error ? fieldErrorIds(name) : undefined);
  const codeA11y = getFieldA11y('staff-code', errors.code);
  const firstnameA11y = getFieldA11y('staff-firstname', errors.firstname);
  const lastnameA11y = getFieldA11y('staff-lastname', errors.lastname);
  const emailA11y = getFieldA11y('staff-email', errors.email);
  const telA11y = getFieldA11y('staff-tel', errors.tel);
  const usernameA11y = getFieldA11y('staff-username', errors.username);
  const passwordA11y = getFieldA11y('staff-password', errors.password);
  const confirmPasswordA11y = getFieldA11y('staff-confirm-password', errors.confirmPassword);
  const newPasswordA11y = getFieldA11y('staff-new-password', errors.newPassword);
  const confirmNewPasswordA11y = getFieldA11y('staff-confirm-new-password', errors.confirmNewPassword);

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner className="size-8" />
            </div>
          ) : (
            <FieldGroup className="gap-4">
              <Field data-invalid={!!errors.code}>
                <FieldLabel htmlFor="staff-code">Staff Code</FieldLabel>
                <Input
                  id="staff-code"
                  value={values.code ?? ''}
                  disabled={disabled || mode !== 'create'}
                  onChange={(e) => onChange('code', e.target.value)}
                  maxLength={32}
                  placeholder="e.g. EMP-001"
                  aria-invalid={codeA11y?.ariaInvalid}
                  aria-describedby={codeA11y?.describedBy}
                />
                {errors.code ? (
                  <FieldDescription id={codeA11y?.errorId} className="text-destructive">
                    {errors.code}
                  </FieldDescription>
                ) : null}
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.firstname}>
                  <FieldLabel htmlFor="staff-firstname">First Name</FieldLabel>
                  <Input
                    id="staff-firstname"
                    value={values.firstname ?? ''}
                    disabled={disabled}
                    onChange={(e) => onChange('firstname', e.target.value)}
                    maxLength={128}
                    aria-invalid={firstnameA11y?.ariaInvalid}
                    aria-describedby={firstnameA11y?.describedBy}
                  />
                  {errors.firstname ? (
                    <FieldDescription id={firstnameA11y?.errorId} className="text-destructive">
                      {errors.firstname}
                    </FieldDescription>
                  ) : null}
                </Field>
                <Field data-invalid={!!errors.lastname}>
                  <FieldLabel htmlFor="staff-lastname">Last Name</FieldLabel>
                  <Input
                    id="staff-lastname"
                    value={values.lastname ?? ''}
                    disabled={disabled}
                    onChange={(e) => onChange('lastname', e.target.value)}
                    maxLength={128}
                    aria-invalid={lastnameA11y?.ariaInvalid}
                    aria-describedby={lastnameA11y?.describedBy}
                  />
                  {errors.lastname ? (
                    <FieldDescription id={lastnameA11y?.errorId} className="text-destructive">
                      {errors.lastname}
                    </FieldDescription>
                  ) : null}
                </Field>
              </div>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="staff-email">Email</FieldLabel>
                <Input
                  id="staff-email"
                  type="email"
                  value={values.email ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange('email', e.target.value)}
                  maxLength={254}
                  aria-invalid={emailA11y?.ariaInvalid}
                  aria-describedby={emailA11y?.describedBy}
                />
                {errors.email ? (
                  <FieldDescription id={emailA11y?.errorId} className="text-destructive">
                    {errors.email}
                  </FieldDescription>
                ) : null}
              </Field>
              <Field data-invalid={!!errors.tel}>
                <FieldLabel htmlFor="staff-tel">Telephone</FieldLabel>
                <Input
                  id="staff-tel"
                  value={values.tel ?? ''}
                  disabled={disabled}
                  onChange={(e) => onChange('tel', e.target.value)}
                  placeholder="e.g. 0812345678 or +66812345678"
                  maxLength={20}
                  aria-invalid={telA11y?.ariaInvalid}
                  aria-describedby={telA11y?.describedBy}
                />
                {errors.tel ? (
                  <FieldDescription id={telA11y?.errorId} className="text-destructive">
                    {errors.tel}
                  </FieldDescription>
                ) : null}
              </Field>
              {canAssignRole ? (
                <Field>
                  <FieldLabel>System Role</FieldLabel>
                  <Select
                    value={values.role ?? 'staff'}
                    onValueChange={(v) => onChange('role', v ?? 'staff')}
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
              {mode === 'create' ? (
                <>
                  <Separator />
                  <p className="text-sm text-muted-foreground">Minimum {PASSWORD_MIN_LENGTH} characters.</p>
                  <Field data-invalid={!!errors.username}>
                    <FieldLabel htmlFor="staff-username">Username</FieldLabel>
                    <Input
                      id="staff-username"
                      value={values.username ?? ''}
                      disabled={disabled}
                      onChange={(e) => onChange('username', e.target.value)}
                      autoComplete="off"
                    aria-invalid={usernameA11y?.ariaInvalid}
                    aria-describedby={usernameA11y?.describedBy}
                    />
                  {errors.username ? (
                    <FieldDescription id={usernameA11y?.errorId} className="text-destructive">
                      {errors.username}
                    </FieldDescription>
                  ) : null}
                  </Field>
                  <Field data-invalid={!!errors.password}>
                    <FieldLabel htmlFor="staff-password">Password</FieldLabel>
                    <Input
                      id="staff-password"
                      type="password"
                      value={values.password ?? ''}
                      disabled={disabled}
                      onChange={(e) => onChange('password', e.target.value)}
                      autoComplete="new-password"
                    aria-invalid={passwordA11y?.ariaInvalid}
                    aria-describedby={passwordA11y?.describedBy}
                    />
                  {errors.password ? (
                    <FieldDescription id={passwordA11y?.errorId} className="text-destructive">
                      {errors.password}
                    </FieldDescription>
                  ) : null}
                  </Field>
                  <Field data-invalid={!!errors.confirmPassword}>
                    <FieldLabel htmlFor="staff-confirm-password">Confirm password</FieldLabel>
                    <Input
                      id="staff-confirm-password"
                      type="password"
                      value={values.confirmPassword ?? ''}
                      disabled={disabled}
                      onChange={(e) => onChange('confirmPassword', e.target.value)}
                      autoComplete="new-password"
                    aria-invalid={confirmPasswordA11y?.ariaInvalid}
                    aria-describedby={confirmPasswordA11y?.describedBy}
                    />
                  {errors.confirmPassword ? (
                    <FieldDescription id={confirmPasswordA11y?.errorId} className="text-destructive">
                      {errors.confirmPassword}
                    </FieldDescription>
                  ) : null}
                  </Field>
                </>
              ) : null}
              {showAdminResetPassword ? (
                <>
                  <Separator />
                  <p className="text-sm font-medium">Reset password (admin)</p>
                  <Field>
                    <FieldLabel htmlFor="staff-new-password">New password</FieldLabel>
                    <Input
                      id="staff-new-password"
                      type="password"
                      value={values.newPassword ?? ''}
                      disabled={disabled}
                      onChange={(e) => onChange('newPassword', e.target.value)}
                      autoComplete="new-password"
                    aria-invalid={newPasswordA11y?.ariaInvalid}
                    aria-describedby={newPasswordA11y?.describedBy}
                    />
                  {errors.newPassword ? (
                    <FieldDescription id={newPasswordA11y?.errorId} className="text-destructive">
                      {errors.newPassword}
                    </FieldDescription>
                  ) : null}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="staff-confirm-new-password">Confirm password</FieldLabel>
                    <Input
                      id="staff-confirm-new-password"
                      type="password"
                      value={values.confirmNewPassword ?? ''}
                      disabled={disabled}
                      onChange={(e) => onChange('confirmNewPassword', e.target.value)}
                      autoComplete="new-password"
                    aria-invalid={confirmNewPasswordA11y?.ariaInvalid}
                    aria-describedby={confirmNewPasswordA11y?.describedBy}
                    />
                  {errors.confirmNewPassword ? (
                    <FieldDescription id={confirmNewPasswordA11y?.errorId} className="text-destructive">
                      {errors.confirmNewPassword}
                    </FieldDescription>
                  ) : null}
                  </Field>
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
          {mode !== 'view' ? (
            <LoadingButton loading={isSaving} onClick={onSave}>
              {mode === 'create' ? 'Create Profile' : 'Save Changes'}
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
