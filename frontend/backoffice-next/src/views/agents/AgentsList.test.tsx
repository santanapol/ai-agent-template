import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAgent } from "../../test/mockFactories";
import { testNavigation } from "../../test/mockNavigation";
import { renderWithRouter } from "../../test/renderWithRouter";
import AgentsList from "./AgentsList";

const fetchAgents = vi.fn();
const fetchUnsyncedBranches = vi.fn();
const syncData = vi.fn();
const deleteData = vi.fn();

vi.mock("./hooks/useAgents", () => ({
  useAgents: () => ({
    agents: [mockAgent()],
    unsyncedBranches: [{ branch_id: "b2", branch_code: "B2", branch_name: "Branch Two", active: true }],
    total: 1,
    loading: false,
    loadingUnsynced: false,
    fetchAgents,
    fetchUnsyncedBranches,
    syncData,
    deleteData,
  }),
}));

describe("AgentsList page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigation.reset();
    syncData.mockResolvedValue(true);
    deleteData.mockResolvedValue(true);
  });

  it("renders table with search filter", async () => {
    renderWithRouter(<AgentsList />);

    expect(screen.getByText("Agents")).toBeInTheDocument();
    expect(screen.getByLabelText(/search by branch code or name/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Branch One")).toBeInTheDocument();
    });
    expect(fetchAgents).toHaveBeenCalled();
  });

  it("renders branch status filter as inline select", async () => {
    renderWithRouter(<AgentsList />);

    expect(screen.getByRole("combobox", { name: /branches:/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/show inactive branches/i)).not.toBeInTheDocument();
  });

  it("opens sync modal and shows inline error when branch not selected", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await user.click(screen.getByRole("button", { name: /sync branch/i }));
    expect(screen.getByText("Sync Agent Branch")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^sync$/i }));
    expect(screen.getByText("Please select a branch!")).toBeInTheDocument();
    expect(syncData).not.toHaveBeenCalled();
  });

  it("confirms delete and calls deleteData", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await waitFor(() => {
      expect(screen.getByLabelText(/delete branch one/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/delete branch one/i));
    expect(screen.getByText(/delete this agent/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(deleteData).toHaveBeenCalledWith("agent-1", "2026-07-01");
  });

  it("navigates to agent fees page from settings action", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await waitFor(() => {
      expect(screen.getByLabelText(/manage fees for branch one/i)).toBeInTheDocument();
    });

    await user.click(screen.getByLabelText(/manage fees for branch one/i));
    expect(testNavigation.push).toHaveBeenCalledWith("/agents/agent-1/fees", undefined);
  });
});
