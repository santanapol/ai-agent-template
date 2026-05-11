import { useCallback, useMemo, useState, type ReactNode } from "react";
import { loginNative } from "../lib/auth-client";
import { sessionFromAccessToken } from "../lib/session-from-access-token";
import { AuthContext, DEFAULT_SESSION } from "./auth-context";
import type { Session, UserRole } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(DEFAULT_SESSION);

  const signIn = useCallback(async (username: string, password: string) => {
    const tokens = await loginNative(username, password);
    const next: Session = {
      ...sessionFromAccessToken(tokens.access_token),
      accessToken: tokens.access_token,
    };
    setSession(next);
    return next;
  }, []);

  const signOut = useCallback(() => {
    setSession(DEFAULT_SESSION);
  }, []);

  const value = useMemo(
    () => ({
      session,
      switchRole: (role: UserRole) => {
        setSession((prev: Session) => ({ ...prev, role }));
      },
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
