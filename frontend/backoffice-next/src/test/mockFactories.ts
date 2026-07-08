import { vi } from "vitest";

import type { AuthContextValue } from "@/contexts/AuthContext";
import type { Agent } from "@/types/agents";
import type { DecodedUser } from "@/types/auth";
import type { Invoice } from "@/types/invoice";
import type { ApiEnvelope, StaffProfile } from "@/types/staff";

export function mockAuthUser(
  role: DecodedUser["role"] = "platform_admin",
  _permissions: string[] = [],
  overrides: Partial<DecodedUser> = {},
): DecodedUser {
  return {
    sub: "user-1",
    username: "platform_admin",
    role,
    ou_id: "ou-1",
    branch_id: "branch-1",
    token_gen: 1,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

export function mockAuthContextValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: mockAuthUser(),
    permissions: [],
    menus: [],
    menuLoading: false,
    menuError: false,
    loading: false,
    branchSwitching: false,
    lastBranchSwitchAt: null,
    login: vi.fn(),
    logout: vi.fn(),
    switchBranch: vi.fn(),
    ...overrides,
  };
}

export function mockPaginatedResponse<T>(data: T[], total?: number): ApiEnvelope<T[]> {
  const resolvedTotal = total ?? data.length;
  return {
    success: true,
    code: "OK",
    message: null,
    data,
    pagination: {
      page: 1,
      limit: 10,
      total: resolvedTotal,
      totalPages: Math.max(1, Math.ceil(resolvedTotal / 10)),
    },
    requestId: "test-request-id",
  };
}

export function mockStaffProfile(overrides: Partial<StaffProfile> = {}): StaffProfile {
  return {
    id: "profile-1",
    user_id: "user-1",
    ou_id: "ou-1",
    branch_id: "branch-1",
    status: "active",
    code: "EMP-001",
    firstname: "John",
    lastname: "Doe",
    email: "john@example.com",
    tel: "+66123456789",
    user: { username: "jdoe", role: "staff" },
    ...overrides,
  };
}

export function mockInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    _id: "invoice-1",
    ou_id: "ou-1",
    branch_id: "branch-1",
    branch_name: "Branch One",
    iv_no: "INV-001",
    billing_month: "2026-07",
    due_date: "2026-07-15",
    net_win: 100,
    bet: 200,
    amount: 1234,
    status: "READY",
    cr_date: "2026-07-01",
    ...overrides,
  };
}

export function mockAgent(overrides: Partial<Agent> = {}): Agent {
  return {
    _id: "agent-1",
    ou_id: "ou-1",
    branch_id: "branch-1",
    branch_code: "B001",
    branch_name: "Branch One",
    branch_type: "MA",
    currency: "THB",
    default_fee_rate: 10,
    active: true,
    upd_date: "2026-07-01",
    ...overrides,
  };
}
