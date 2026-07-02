import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoginCredentialField } from '@/components/auth/LoginCredentialField';
import { LoadingButton } from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldGroup } from '@/components/ui/field';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';
import { loginErrorMessage } from '@/lib/authErrors';

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
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      const errorMessage = loginErrorMessage(err);
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
              <LoginCredentialField
                id="username"
                label="Username"
                placeholder="Username"
                autoComplete="username"
                icon={<User aria-hidden="true" className="size-4" />}
                value={username}
                error={formErrors.username}
                onChange={setUsername}
                onClearError={() => setFormErrors((prev) => ({ ...prev, username: undefined }))}
              />
              <LoginCredentialField
                id="password"
                label="Password"
                placeholder="Password"
                autoComplete="current-password"
                icon={<Lock aria-hidden="true" className="size-4" />}
                value={password}
                error={formErrors.password}
                showPasswordToggle
                showPassword={showPassword}
                onShowPasswordToggle={() => setShowPassword((prev) => !prev)}
                onChange={setPassword}
                onClearError={() => setFormErrors((prev) => ({ ...prev, password: undefined }))}
              />
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
