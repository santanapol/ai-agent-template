import { useCallback, useMemo, useState, type ReactNode } from "react";
import { loginNative } from "../lib/auth-client";
import { sessionFromAccessToken } from "../lib/session-from-access-token";
import { AuthContext, DEFAULT_SESSION } from "./auth-context";
import type { Session, UserRole } from "./auth-context";

/** Dev / Playwright: survive full `page.goto` reloads after `switchRole` (in-memory state only otherwise). */
const DEV_PERSISTED_ROLE_KEY = "access-platform:dev-session-role";

const KNOWN_ROLES: readonly UserRole[] = [
  "owner",
  "admin",
  "manager",
  "member",
  "billing",
];

function isUserRole(value: string): value is UserRole {
  return (KNOWN_ROLES as readonly string[]).includes(value);
}

function readInitialSession(): Session {
  if (!import.meta.env.DEV) {
    return DEFAULT_SESSION;
  }
  try {
    const raw = sessionStorage.getItem(DEV_PERSISTED_ROLE_KEY);
    if (raw && isUserRole(raw)) {
      return { ...DEFAULT_SESSION, role: raw };
    }
  } catch {
    /* ignore quota / private mode */
  }
  return DEFAULT_SESSION;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>(readInitialSession);

  const signIn = useCallback(async (username: string, password: string) => {
    const tokens = await loginNative(username, password);
    const next: Session = {
      ...sessionFromAccessToken(tokens.access_token),
      accessToken: tokens.access_token,
    };
    setSession(next);
    if (import.meta.env.DEV) {
      try {
        sessionStorage.removeItem(DEV_PERSISTED_ROLE_KEY);
      } catch {
        /* ignore */
      }
    }
    return next;
  }, []);

  const signOut = useCallback(() => {
    setSession(DEFAULT_SESSION);
    if (import.meta.env.DEV) {
      try {
        sessionStorage.removeItem(DEV_PERSISTED_ROLE_KEY);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const value = useMemo(
    () => ({
      session,
      switchRole: (role: UserRole) => {
        setSession((prev: Session) => {
          if (import.meta.env.DEV) {
            try {
              sessionStorage.setItem(DEV_PERSISTED_ROLE_KEY, role);
            } catch {
              /* ignore */
            }
          }
          return { ...prev, role };
        });
      },
      signIn,
      signOut,
    }),
    [session, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
