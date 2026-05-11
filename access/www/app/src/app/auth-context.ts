import { createContext } from "react";

export type UserRole = "owner" | "admin" | "manager" | "member" | "billing";

export type Session = {
  userId: string;
  ouId: string;
  branchId: string;
  role: UserRole;
  /** Access JWT from Auth service; sent to Gateway as Bearer when calling APIs. */
  accessToken: string | null;
};

export type AuthContextValue = {
  session: Session;
  switchRole: (role: UserRole) => void;
  signIn: (username: string, password: string) => Promise<Session>;
  signOut: () => void;
};

export const DEFAULT_SESSION: Session = {
  userId: "user-001",
  ouId: "ou-001",
  branchId: "bkk-01",
  role: "manager",
  accessToken: null,
};

export const AuthContext = createContext<AuthContextValue | null>(null);
