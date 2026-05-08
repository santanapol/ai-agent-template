import { useMemo, useState, type ReactNode } from "react";
import { AuthContext, DEFAULT_SESSION } from "./auth-context";
import type { Session, UserRole } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);

  const value = useMemo(
    () => ({
      session,
      switchRole: (role: UserRole) => {
        setSession((prev: Session) => ({ ...prev, role }));
      },
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
