import type React from "react";

import { Lock, User } from "lucide-react";

import { LoginCredentialField } from "@/components/auth/LoginCredentialField";
import { LoadingButton } from "@/components/LoadingButton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";

export interface LoginFormProps {
  username: string;
  password: string;
  showPassword: boolean;
  formErrors: { username?: string; password?: string; form?: string };
  submitting: boolean;
  onSubmit: (event: React.FormEvent) => void;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordToggle: () => void;
  onClearUsernameError: () => void;
  onClearPasswordError: () => void;
}

export function LoginForm({
  username,
  password,
  showPassword,
  formErrors,
  submitting,
  onSubmit,
  onUsernameChange,
  onPasswordChange,
  onShowPasswordToggle,
  onClearUsernameError,
  onClearPasswordError,
}: LoginFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          {formErrors.form ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{formErrors.form}</AlertDescription>
            </Alert>
          ) : null}
          <form onSubmit={onSubmit}>
            <FieldGroup>
              <LoginCredentialField
                id="username"
                label="Username"
                placeholder="e.g. platform_admin"
                autoComplete="username"
                icon={<User aria-hidden="true" />}
                value={username}
                error={formErrors.username}
                spellCheck={false}
                onChange={onUsernameChange}
                onClearError={onClearUsernameError}
              />
              <LoginCredentialField
                id="password"
                label="Password"
                placeholder="Enter your password"
                autoComplete="current-password"
                icon={<Lock aria-hidden="true" />}
                value={password}
                error={formErrors.password}
                showPasswordToggle
                showPassword={showPassword}
                onShowPasswordToggle={onShowPasswordToggle}
                onChange={onPasswordChange}
                onClearError={onClearPasswordError}
              />
              <Field>
                <LoadingButton type="submit" className="w-full" loading={submitting}>
                  Sign In
                </LoadingButton>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <FieldDescription className="px-6 text-center">
        Contact your platform administrator if you need access.
      </FieldDescription>
    </div>
  );
}
