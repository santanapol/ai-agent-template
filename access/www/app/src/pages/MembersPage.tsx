import { useEffect, useState } from "react";
import { useAuth } from "../app/use-auth";
import { useMembers, type Member } from "../features/members/useMembers";

const EMPTY_FORM = {
  username: "",
  password: "",
  displayName: "",
  email: "",
  role: "member" as Member["role"],
  status: "active" as Member["status"],
};

export function MembersPage() {
  const { session } = useAuth();
  const canManageMembers =
    session.role === "owner" || session.role === "admin" || session.role === "manager";
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const {
    members,
    loading,
    error,
    fetchMembers,
    createMember,
    patchMember,
    removeMember,
  } = useMembers({
      ouId: session.ouId,
      branchId: session.branchId,
      headers: {
        userId: session.userId,
        ouId: session.ouId,
        branchId: session.branchId,
        role: session.role,
      },
    });

  useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  async function submitCreate() {
    await createMember(form);
    setForm(EMPTY_FORM);
  }

  async function submitPatch(member: Member) {
    await patchMember(member.userId, {
      displayName: member.displayName,
      role: member.role,
      status: member.status,
      email: member.email || "",
    });
    setEditingId(null);
  }

  return (
    <section>
      <h2>Members</h2>
      <p>Direct management flow: add, edit, remove (no invite/signup).</p>
      {error ? <p className="error">{error}</p> : null}
      {canManageMembers ? (
        <div className="panel">
          <h3>Add member</h3>
          <div className="grid">
            <input
              placeholder="username"
              value={form.username}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, username: event.target.value }))
              }
            />
            <input
              placeholder="password"
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
            />
            <input
              placeholder="display name"
              value={form.displayName}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, displayName: event.target.value }))
              }
            />
            <input
              placeholder="email"
              value={form.email}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, email: event.target.value }))
              }
            />
            <select
              value={form.role}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  role: event.target.value as Member["role"],
                }))
              }
            >
              <option value="manager">manager</option>
              <option value="member">member</option>
              <option value="billing">billing</option>
            </select>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void submitCreate()}
            >
              Add member
            </button>
          </div>
        </div>
      ) : (
        <div className="panel">
          <p className="muted">Read-only for this role.</p>
        </div>
      )}

      <div className="panel">
        <h3>Branch members</h3>
        {loading ? <p>Loading members...</p> : null}
        {members.length === 0 && !loading ? <p>No members found.</p> : null}
        {members.map((member) => (
          <div className="member-row" key={member.userId}>
            <div>
              <strong>{member.displayName}</strong>
              <p className="muted">
                {member.username} ({member.role})
              </p>
            </div>
            {canManageMembers ? (
              <>
                {editingId === member.userId ? (
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => void submitPatch(member)}
                  >
                    Save
                  </button>
                ) : (
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setEditingId(member.userId)}
                  >
                    Edit
                  </button>
                )}
                <button
                  className="btn btn-destructive"
                  type="button"
                  onClick={() => void removeMember(member.userId)}
                >
                  Remove
                </button>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
