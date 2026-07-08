import React, { useState } from 'react';
import { Store } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoginForm } from '@/components/auth/LoginForm';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { loginErrorMessage } from '@/lib/authErrors';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
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
      setFormErrors({ password: errorMessage });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Store className="size-4" aria-hidden="true" />
          </div>
          Zero Platform
        </div>
        <LoginForm
          username={username}
          password={password}
          showPassword={showPassword}
          formErrors={formErrors}
          submitting={submitting}
          onSubmit={onSubmit}
          onUsernameChange={setUsername}
          onPasswordChange={setPassword}
          onShowPasswordToggle={() => setShowPassword((prev) => !prev)}
          onClearUsernameError={() => setFormErrors((prev) => ({ ...prev, username: undefined }))}
          onClearPasswordError={() => setFormErrors((prev) => ({ ...prev, password: undefined }))}
        />
      </div>
    </div>
  );
};

export default Login;
