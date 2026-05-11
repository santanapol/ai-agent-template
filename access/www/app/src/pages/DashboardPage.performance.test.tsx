import { render } from "@testing-library/react";
import { DashboardPage } from "./DashboardPage";

const mockUseAuth = vi.fn();
const mockUseDashboard = vi.fn();

vi.mock("../app/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../features/dashboard/useDashboard", () => ({
  useDashboard: () => mockUseDashboard(),
}));

function percentile(values: number[], p: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

describe("DashboardPage render performance", () => {
  it("keeps p95 render duration below 80ms in test environment", () => {
    mockUseAuth.mockReturnValue({
      session: {
        userId: "user-001",
        ouId: "ou-001",
        branchId: "bkk-01",
        role: "billing",
        accessToken: null,
      },
      switchRole: vi.fn(),
      signIn: vi.fn(),
      signOut: vi.fn(),
    });
    mockUseDashboard.mockReturnValue({
      summary: {
        visibility: "full",
        refreshedAt: "2026-05-11T00:00:00.000Z",
        widgets: { items: { total: 5 } },
      },
      loading: false,
      error: null,
      load: vi.fn(),
    });

    const samples: number[] = [];
    for (let i = 0; i < 30; i += 1) {
      const start = performance.now();
      const { unmount } = render(<DashboardPage />);
      const elapsed = performance.now() - start;
      samples.push(elapsed);
      unmount();
    }

    const p95 = percentile(samples, 95);
    expect(p95).toBeLessThan(80);
  });
});
