import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route, Routes } from "@/navigation/compat";

import { renderWithRouter } from "../../test/renderWithRouter";
import AgentFeesPage from "./AgentFeesPage";

function renderAgentFees(initialEntry = "/agents/agent-1/fees") {
  return renderWithRouter(
    <Routes>
      <Route path="/agents/:id/fees" element={<AgentFeesPage />} />
    </Routes>,
    { initialEntries: [initialEntry] },
  );
}

const { getAgentById, fetchFees, fetchMasterData, mockFeedback } = vi.hoisted(() => ({
  getAgentById: vi.fn(),
  fetchFees: vi.fn(),
  fetchMasterData: vi.fn(),
  mockFeedback: {
    message: { success: vi.fn(), error: vi.fn() },
    notification: { info: vi.fn() },
  },
}));

vi.mock("../agents/hooks/useAgentFees", () => ({
  useAgentFees: () => ({
    fees: [],
    companies: [],
    categories: [],
    loading: false,
    fetchFees,
    fetchMasterData,
    bulkSave: vi.fn(),
  }),
}));

vi.mock("@/lib/agentsApiClient", () => ({
  getAgentById: (...args: unknown[]) => getAgentById(...args),
  listAgents: vi.fn().mockResolvedValue({ data: [] }),
  updateAgent: vi.fn(),
}));

vi.mock("@/lib/agentFeesApiClient", () => ({
  listAgentFees: vi.fn().mockResolvedValue([]),
  deleteAgentFee: vi.fn(),
}));

vi.mock("@/hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

vi.mock("@/hooks/useConfirmDialog", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useConfirmDialog")>();
  return {
    ...actual,
    useConfirmDialog: () => ({ confirm: vi.fn() }),
  };
});

describe("AgentFeesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAgentById.mockResolvedValue({
      agent: {
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
      },
      etag: "etag-1",
    });
  });

  it("shows loading skeleton while agent loads", () => {
    getAgentById.mockImplementation(() => new Promise(() => {}));

    renderAgentFees();

    expect(screen.getByLabelText(/loading agent fees/i)).toBeInTheDocument();
  });

  it("loads agent and fee data for route id", async () => {
    renderAgentFees();

    expect(await screen.findByText("Branch One")).toBeInTheDocument();

    await waitFor(() => {
      expect(getAgentById).toHaveBeenCalledWith("agent-1", expect.any(AbortSignal));
      expect(fetchFees).toHaveBeenCalled();
      expect(fetchMasterData).toHaveBeenCalled();
    });

    expect(screen.getByRole("button", { name: /edit default fee rate/i })).toBeInTheDocument();
    expect(screen.getByText("10%")).toBeInTheDocument();
  });
});
