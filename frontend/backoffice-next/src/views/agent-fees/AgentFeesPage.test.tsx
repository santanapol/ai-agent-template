import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route, Routes } from "@/navigation/compat";

import { renderWithRouter } from "../../test/renderWithRouter";
import { testNavigation } from "../../test/mockNavigation";
import AgentFeesPage from "./AgentFeesPage";

function renderAgentFees(initialEntry = "/agents/agent-1/fees") {
  return renderWithRouter(
    <Routes>
      <Route path="/agents/:id/fees" element={<AgentFeesPage />} />
    </Routes>,
    { initialEntries: [initialEntry] },
  );
}

const { getAgentById, fetchFees, fetchMasterData, bulkSave, updateAgent, listAgents, mockFeedback } = vi.hoisted(() => ({
  getAgentById: vi.fn(),
  fetchFees: vi.fn(),
  fetchMasterData: vi.fn(),
  bulkSave: vi.fn(),
  updateAgent: vi.fn(),
  listAgents: vi.fn().mockResolvedValue({ data: [] }),
  mockFeedback: {
    message: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn() },
    notification: { info: vi.fn() },
  },
}));

vi.mock("../agents/hooks/useAgentFees", () => ({
  useAgentFees: () => ({
    fees: [],
    companies: [
      {
        _id: "co-1",
        ou_id: "ou-1",
        name: "3OAKS",
        provider_name: { en: "3OAKS" },
      },
      {
        _id: "co-2",
        ou_id: "ou-1",
        name: "AMIGO",
        provider_name: { en: "AMIGO" },
      },
    ],
    categories: [{ _id: "cat-1", ou_id: "ou-1", name: "Slot", main_cate_name: { en: "Slot" } }],
    fetching: false,
    masterDataLoading: false,
    saving: false,
    fetchFees,
    fetchMasterData,
    bulkSave,
  }),
}));

vi.mock("@/lib/agentsApiClient", () => ({
  getAgentById: (...args: unknown[]) => getAgentById(...args),
  listAgents: (...args: unknown[]) => listAgents(...args),
  updateAgent: (...args: unknown[]) => updateAgent(...args),
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
    testNavigation.reset();
    bulkSave.mockResolvedValue(true);
    listAgents.mockResolvedValue({
      data: [
        {
          _id: "agent-2",
          ou_id: "ou-1",
          branch_id: "branch-2",
          branch_code: "B002",
          branch_name: "Branch Two",
          branch_type: "MA",
          currency: "THB",
          default_fee_rate: 8,
          active: true,
          upd_date: "2026-07-01",
          ref_fee_branch_id: null,
        },
      ],
    });
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
        ref_fee_branch_id: null,
      },
      etag: "etag-1",
    });
  });

  it("shows loading skeleton while agent loads", () => {
    getAgentById.mockImplementation(() => new Promise(() => undefined));

    renderAgentFees();

    expect(screen.getByLabelText(/loading agent fees/i)).toBeInTheDocument();
  });

  it("loads agent and fee data for route id", async () => {
    renderAgentFees();

    expect(await screen.findByRole("heading", { name: /Branch One · B001 · MA/i })).toBeInTheDocument();

    const rateInput = screen.getByRole("spinbutton", { name: /default fee rate/i });
    expect(rateInput).toHaveValue(10);

    await waitFor(() => {
      expect(getAgentById).toHaveBeenCalledWith("agent-1", expect.any(AbortSignal));
      expect(fetchFees).toHaveBeenCalled();
      expect(fetchMasterData).toHaveBeenCalled();
    });
  });

  it("shows reference fees label instead of __none__ sentinel", async () => {
    renderAgentFees();

    expect(await screen.findByText("None")).toBeInTheDocument();
    expect(screen.queryByText("__none__")).not.toBeInTheDocument();
  });

  it("disables Save changes when there are no edits", async () => {
    renderAgentFees();

    const saveButton = await screen.findByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();
  });

  it("calls updateAgent and bulkSave when default rate changes and save is clicked", async () => {
    const user = userEvent.setup();
    updateAgent.mockResolvedValue({ etag: 'W/"2026-07-02"' });

    renderAgentFees();
    await screen.findByRole("heading", { name: /Branch One · B001 · MA/i });

    const rateInput = screen.getByRole("spinbutton", { name: /default fee rate/i });
    await user.clear(rateInput);
    await user.type(rateInput, "12");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(updateAgent).toHaveBeenCalledWith("agent-1", { default_fee_rate: 12 }, "2026-07-01");
    });
    expect(bulkSave).not.toHaveBeenCalled();
  });

  it("enables Save changes when reference fees changes and saves on click", async () => {
    const user = userEvent.setup();
    updateAgent.mockResolvedValue({ etag: 'W/"2026-07-02"' });

    renderAgentFees();
    await screen.findByText("None");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).toBeDisabled();

    await user.click(screen.getByRole("combobox", { name: /reference fees/i }));
    await user.click(await screen.findByRole("option", { name: /B002 · Branch Two/i }));

    expect(saveButton).not.toBeDisabled();

    await user.click(saveButton);

    await waitFor(() => {
      expect(updateAgent).toHaveBeenCalledWith(
        "agent-1",
        { ref_fee_branch_id: "branch-2" },
        "2026-07-01",
      );
    });
    expect(bulkSave).not.toHaveBeenCalled();
  });

  it("navigates back to agents when Back is clicked", async () => {
    const user = userEvent.setup();
    renderAgentFees();
    await screen.findByRole("heading", { name: /Branch One · B001 · MA/i });

    await user.click(screen.getByRole("button", { name: /^back$/i }));

    expect(testNavigation.push).toHaveBeenCalledWith("/agents", undefined);
  });

  it("filters providers by search", async () => {
    const user = userEvent.setup();

    renderAgentFees();
    await screen.findByText("3OAKS");

    await user.type(screen.getByPlaceholderText("Search providers…"), "amigo");

    expect(screen.queryByText("3OAKS")).not.toBeInTheDocument();
    expect(screen.getByText("AMIGO")).toBeInTheDocument();
  });

  it("shows empty search copy when no providers match", async () => {
    const user = userEvent.setup();

    renderAgentFees();
    await screen.findByText("3OAKS");

    await user.type(screen.getByPlaceholderText("Search providers…"), "zzzz");

    expect(await screen.findByText("No providers match your search.")).toBeInTheDocument();
  });
});
