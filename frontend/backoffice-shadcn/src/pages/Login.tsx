import React, { useState } from 'react';
import { Lock, User } from 'lucide-react';
import axios from 'axios';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoadingButton } from '@/components/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/contexts/AuthContext';
import { useAppFeedback } from '@/hooks/useAppFeedback';

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

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      message.error('Please enter username and password');
      return;
    }
    setSubmitting(true);
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      message.error(authErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">Zero Platform</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <User className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  className="pl-9"
                  placeholder="Username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder="Password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
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
