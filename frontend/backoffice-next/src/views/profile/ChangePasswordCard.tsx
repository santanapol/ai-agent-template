import { KeyRound } from "lucide-react";

import { LoadingButton } from "@/components/LoadingButton";
import { PageContentCard } from "@/components/layout";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { fieldErrorIds } from "@/lib/fieldA11y";
import { PASSWORD_REQUIREMENTS_DESCRIPTION } from "@/lib/passwordPolicy";

interface ChangePasswordCardProps {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
  errors: Record<string, string>;
  changingPassword: boolean;
  onCurrentPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmNewPasswordChange: (value: string) => void;
  onChangePassword: () => void;
}

export function ChangePasswordCard({
  currentPassword,
  newPassword,
  confirmNewPassword,
  errors,
  changingPassword,
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
  onChangePassword,
}: ChangePasswordCardProps) {
  const currentPasswordA11y = errors.current_password ? fieldErrorIds("current_password") : undefined;
  const newPasswordErrorA11y = fieldErrorIds("new_password");
  const newPasswordHintId = "new_password-hint";
  const confirmNewPasswordA11y = errors.confirm_new_password ? fieldErrorIds("confirm_new_password") : undefined;

  return (
    <PageContentCard title="Change password" className="max-w-[720px]">
      <FieldGroup>
        <Field data-invalid={!!errors.current_password}>
          <FieldLabel htmlFor="current_password">Current password</FieldLabel>
          <Input
            id="current_password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => onCurrentPasswordChange(e.target.value)}
            aria-invalid={!!errors.current_password}
            aria-describedby={currentPasswordA11y?.describedBy}
          />
          {errors.current_password ? (
            <FieldDescription id={currentPasswordA11y?.errorId} className="text-destructive">
              {errors.current_password}
            </FieldDescription>
          ) : null}
        </Field>
        <Field data-invalid={!!errors.new_password}>
          <FieldLabel htmlFor="new_password">New password</FieldLabel>
          <Input
            id="new_password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            aria-invalid={!!errors.new_password}
            aria-describedby={errors.new_password ? newPasswordErrorA11y.describedBy : newPasswordHintId}
          />
          {errors.new_password ? (
            <FieldDescription id={newPasswordErrorA11y.errorId} className="text-destructive">
              {errors.new_password}
            </FieldDescription>
          ) : (
            <FieldDescription id={newPasswordHintId}>
              {PASSWORD_REQUIREMENTS_DESCRIPTION}
            </FieldDescription>
          )}
        </Field>
        <Field data-invalid={!!errors.confirm_new_password}>
          <FieldLabel htmlFor="confirm_new_password">Confirm new password</FieldLabel>
          <Input
            id="confirm_new_password"
            type="password"
            autoComplete="new-password"
            value={confirmNewPassword}
            onChange={(e) => onConfirmNewPasswordChange(e.target.value)}
            aria-invalid={!!errors.confirm_new_password}
            aria-describedby={confirmNewPasswordA11y?.describedBy}
          />
          {errors.confirm_new_password ? (
            <FieldDescription id={confirmNewPasswordA11y?.errorId} className="text-destructive">
              {errors.confirm_new_password}
            </FieldDescription>
          ) : null}
        </Field>
        <LoadingButton onClick={onChangePassword} loading={changingPassword}>
          <KeyRound data-icon="inline-start" />
          Change password
        </LoadingButton>
      </FieldGroup>
    </PageContentCard>
  );
}
