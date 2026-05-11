import { render, screen } from "@testing-library/react";
import { BillingPage } from "./BillingPage";
import type { UserRole } from "../app/auth-context";

const mockUseAuth = vi.fn();
const mockUseBilling = vi.fn();

vi.mock("../app/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../features/billing/useBilling", () => ({
  useBilling: () => mockUseBilling(),
}));

function mockSession(role: UserRole) {
  return {
    session: {
      userId: "user-001",
      ouId: "ou-001",
      branchId: "bkk-01",
      role,
      accessToken: null,
    },
    switchRole: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
}

function mockBillingData() {
  return {
    plan: {
      planCode: "starter",
      status: "active",
      updatedAt: "2026-05-11T00:00:00.000Z",
    },
    invoices: [],
    loading: false,
    error: null,
    load: vi.fn(),
    updatePlan: vi.fn(),
  };
}

describe("BillingPage role permissions", () => {
  beforeEach(() => {
    mockUseBilling.mockReturnValue(mockBillingData());
  });

  it("shows update plan button for admin role", () => {
    mockUseAuth.mockReturnValue(mockSession("admin"));
    render(<BillingPage />);
    expect(
      screen.getByRole("button", { name: "Update plan" }),
    ).toBeInTheDocument();
  });

  it("hides update plan button for billing role", () => {
    mockUseAuth.mockReturnValue(mockSession("billing"));
    render(<BillingPage />);
    expect(
      screen.queryByRole("button", { name: "Update plan" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Read-only for this role.")).toBeInTheDocument();
  });
});
