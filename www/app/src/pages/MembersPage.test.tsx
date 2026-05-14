import { render, screen } from "@testing-library/react";
import { MembersPage } from "./MembersPage";
import type { UserRole } from "../app/auth-context";

const mockUseAuth = vi.fn();
const mockUseMembers = vi.fn();

vi.mock("../app/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../features/members/useMembers", () => ({
  useMembers: () => mockUseMembers(),
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

function mockMembersResult() {
  return {
    members: [
      {
        userId: "user-123",
        username: "member01",
        displayName: "Member One",
        email: "member@example.com",
        role: "member",
        status: "active",
      },
    ],
    loading: false,
    error: null,
    fetchMembers: vi.fn(),
    createMember: vi.fn(),
    patchMember: vi.fn(),
    removeMember: vi.fn(),
  };
}

describe("MembersPage role permissions", () => {
  beforeEach(() => {
    mockUseMembers.mockReturnValue(mockMembersResult());
  });

  it("hides direct-management actions for member role", () => {
    mockUseAuth.mockReturnValue(mockSession("member"));
    render(<MembersPage />);

    expect(
      screen.queryByRole("button", { name: "Add member" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Remove" }),
    ).not.toBeInTheDocument();
  });

  it("shows direct-management actions for manager role", () => {
    mockUseAuth.mockReturnValue(mockSession("manager"));
    render(<MembersPage />);

    expect(
      screen.getByRole("button", { name: "Add member" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove" })).toBeInTheDocument();
  });
});
