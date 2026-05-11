import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { RoleGuard, ScopeGuard } from "./guards";
import type { UserRole } from "./auth-context";

const mockUseAuth = vi.fn();

vi.mock("./use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

function mockSession(role: UserRole, ouId = "ou-001", branchId = "bkk-01") {
  return {
    session: {
      userId: "user-001",
      ouId,
      branchId,
      role,
      accessToken: null,
    },
    switchRole: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  };
}

function renderWithRouter(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: "/ou/:ouId/branches/:branchId",
        element: <ScopeGuard />,
        children: [
          {
            element: <RoleGuard allow={["owner", "admin"]} />,
            children: [{ path: "settings", element: <div>Allowed</div> }],
          },
          { path: "dashboard", element: <div>Dashboard</div> },
        ],
      },
      { path: "/forbidden", element: <div>Forbidden</div> },
    ],
    { initialEntries: [initialPath] },
  );
  return render(<RouterProvider router={router} />);
}

describe("route guards", () => {
  it("allows manager in own branch scope", async () => {
    mockUseAuth.mockReturnValue(mockSession("manager"));
    renderWithRouter("/ou/ou-001/branches/bkk-01/dashboard");
    expect(await screen.findByText("Dashboard")).toBeInTheDocument();
  });

  it("blocks manager in different branch scope", async () => {
    mockUseAuth.mockReturnValue(mockSession("manager"));
    renderWithRouter("/ou/ou-001/branches/cnx-01/dashboard");
    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });

  it("blocks manager from owner-admin route", async () => {
    mockUseAuth.mockReturnValue(mockSession("manager"));
    renderWithRouter("/ou/ou-001/branches/bkk-01/settings");
    expect(await screen.findByText("Forbidden")).toBeInTheDocument();
  });

  it("allows owner on owner-admin route", async () => {
    mockUseAuth.mockReturnValue(mockSession("owner"));
    renderWithRouter("/ou/ou-001/branches/bkk-01/settings");
    expect(await screen.findByText("Allowed")).toBeInTheDocument();
  });
});
