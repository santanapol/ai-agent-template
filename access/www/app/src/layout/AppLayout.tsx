import { Link, Outlet } from "react-router-dom";
import { useAuth } from "../app/use-auth";
import type { UserRole } from "../app/auth-context";

const ROLES: UserRole[] = ["owner", "admin", "manager", "member", "billing"];

export function AppLayout() {
  const { session, switchRole } = useAuth();
  const base = `/ou/${session.ouId}/branches/${session.branchId}`;

  return (
    <div className="shell">
      <aside className="sidebar">
        <h1>Access Platform</h1>
        <p className="muted">Signed in as `{session.role}`</p>
        <label className="label" htmlFor="role-selector">
          Switch role
        </label>
        <select
          id="role-selector"
          value={session.role}
          onChange={(event) => switchRole(event.target.value as UserRole)}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
        <nav>
          <Link to={`${base}/dashboard`}>Dashboard</Link>
          <Link to={`${base}/items`}>Items</Link>
          <Link to={`${base}/members`}>Members</Link>
          <Link to={`${base}/billing`}>Billing</Link>
          <Link to={`${base}/reports`}>Reports</Link>
          <Link to={`/ou/${session.ouId}/settings`}>OU Settings</Link>
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
