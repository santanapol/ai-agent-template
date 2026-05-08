import { createContext } from "react";

export type UserRole = "owner" | "admin" | "manager" | "member" | "billing";

export type Session = {
  userId: string;
  ouId: string;
  branchId: string;
  role: UserRole;
};

export type AuthContextValue = {
  session: Session;
  switchRole: (role: UserRole) => void;
};

export const DEFAULT_SESSION: Session = {
  userId: "user-001",
  ouId: "ou-001",
  branchId: "bkk-01",
  role: "manager",
};

export const AuthContext = createContext<AuthContextValue | null>(null);
