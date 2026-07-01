import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User } from 'lucide-react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoadingButton } from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { fieldErrorIds } from '@/lib/fieldA11y';

function authErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const code = err.response?.data?.code as string | undefined;
    if (code === 'LOGIN_INVALID_CREDENTIALS') return 'Invalid username or password';
    if (code === 'LOGIN_ACCOUNT_LOCKED') return 'Account is locked due to too many failed attempts';
    if (code === 'AUTH_TOO_MANY_ATTEMPTS') return 'Too many attempts. Please try again later.';
    const detail = err.response?.data?.detail as string | undefined;
    if (detail) return detail;
  }
  return 'Login failed. Please try again.';
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { message } = useAppFeedback();
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { username?: string; password?: string } = {};
    if (!username.trim() || !password) {
      if (!username.trim()) nextErrors.username = 'Please enter username';
      if (!password) nextErrors.password = 'Please enter password';
      setFormErrors(nextErrors);
      message.error('Please enter username and password');
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const errorMessage = authErrorMessage(err);
      setFormErrors((prev) => ({
        ...prev,
        password: errorMessage,
      }));
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Zero Platform</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <FieldGroup className="gap-4">
              <Field data-invalid={!!formErrors.username}>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <div className="relative">
                  <User aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    className="pl-9"
                    placeholder="Username"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      if (formErrors.username) setFormErrors((prev) => ({ ...prev, username: undefined }));
                    }}
                    aria-invalid={!!formErrors.username}
                    aria-describedby={formErrors.username ? fieldErrorIds('username').describedBy : undefined}
                  />
                </div>
                {formErrors.username ? (
                  <FieldDescription id={fieldErrorIds('username').errorId} className="text-destructive" role="alert">
                    {formErrors.username}
                  </FieldDescription>
                ) : null}
              </Field>
              <Field data-invalid={!!formErrors.password}>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Lock aria-hidden="true" className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pr-12 pl-9"
                    placeholder="Password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (formErrors.password) setFormErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    aria-invalid={!!formErrors.password}
                    aria-describedby={formErrors.password ? fieldErrorIds('password').describedBy : undefined}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="absolute inset-y-1 right-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? (
                      <EyeOff data-icon="inline-start" aria-hidden="true" />
                    ) : (
                      <Eye data-icon="inline-start" aria-hidden="true" />
                    )}
                  </Button>
                </div>
                {formErrors.password ? (
                  <FieldDescription id={fieldErrorIds('password').errorId} className="text-destructive" role="alert">
                    {formErrors.password}
                  </FieldDescription>
                ) : null}
              </Field>
            </FieldGroup>
            <LoadingButton type="submit" className="w-full" loading={submitting}>
              Sign In
            </LoadingButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
