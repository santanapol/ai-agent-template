import type React from "react";
import { useState } from "react";

import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/contexts/AuthContext";
import { loginFieldErrors } from "@/lib/authErrors";
import { Navigate, useNavigate } from "@/navigation/compat";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading, login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ username?: string; password?: string; form?: string }>({});
  const [showPassword, setShowPassword] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
        <Spinner className="size-8" role="status" aria-label="Loading session" />
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors: { username?: string; password?: string } = {};
    if (!username.trim() || !password) {
      if (!username.trim()) nextErrors.username = "Please enter username";
      if (!password) nextErrors.password = "Please enter password";
      setFormErrors(nextErrors);
      return;
    }
    setFormErrors({});
    setSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setFormErrors(loginFieldErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout>
      <div className="flex w-full max-w-sm flex-col gap-6">
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
          onClearUsernameError={() => setFormErrors((prev) => ({ ...prev, username: undefined, form: undefined }))}
          onClearPasswordError={() => setFormErrors((prev) => ({ ...prev, password: undefined, form: undefined }))}
        />
      </div>
    </AuthSplitLayout>
  );
};

export default Login;
