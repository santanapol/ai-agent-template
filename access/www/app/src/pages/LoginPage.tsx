import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../app/use-auth";

export function LoginPage() {
  const navigate = useNavigate();
  const { session, signIn, signOut } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignedIn = Boolean(session.accessToken);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const next = await signIn(username, password);
      void navigate(`/ou/${next.ouId}/branches/${next.branchId}/dashboard`, {
        replace: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2>Login</h2>
      <p className="muted">
        Uses <code>VITE_AUTH_BASE_URL</code> for <code>POST /auth/login</code>,
        then calls the app via <code>VITE_API_BASE_URL</code> (gateway) with the
        returned access token.
      </p>
      {isSignedIn ? (
        <div className="panel">
          <p>
            Signed in as <strong>{session.userId}</strong> ({session.role}) — OU{" "}
            {session.ouId}, branch {session.branchId}.
          </p>
          <button type="button" onClick={() => signOut()}>
            Sign out
          </button>
          <p>
            <Link
              to={`/ou/${session.ouId}/branches/${session.branchId}/dashboard`}
            >
              Go to dashboard
            </Link>
          </p>
        </div>
      ) : (
        <form className="panel" onSubmit={(e) => void handleSubmit(e)}>
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}
      <p>
        <Link to="/ou/ou-001/branches/bkk-01/dashboard">
          Enter app (demo session, no API token)
        </Link>
      </p>
    </section>
  );
}
