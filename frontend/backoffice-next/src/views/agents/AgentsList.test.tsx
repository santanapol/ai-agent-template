import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAgent } from "../../test/mockFactories";
import { testNavigation } from "../../test/mockNavigation";
import { renderWithRouter } from "../../test/renderWithRouter";

const fetchAgents = vi.fn();
const fetchUnsyncedBranches = vi.fn();
const syncData = vi.fn();
const deleteData = vi.fn();
const usePermission = vi.fn(() => true);

function mockAgentsHook(overrides: Record<string, unknown> = {}) {
  return {
    agents: [mockAgent()],
    unsyncedBranches: [{ branch_id: "b2", branch_code: "B2", branch_name: "Branch Two", active: true }],
    total: 1,
    loading: false,
    loadingUnsynced: false,
    fetchAgents,
    fetchUnsyncedBranches,
    syncData,
    deleteData,
    ...overrides,
  };
}

vi.mock("@/hooks/usePermission", () => ({
  usePermission: (key: string) => usePermission(key),
}));

vi.mock("./hooks/useAgents", () => ({
  useAgents: vi.fn(() => mockAgentsHook()),
}));

import AgentsList from "./AgentsList";
import { useAgents } from "./hooks/useAgents";

const mockedUseAgents = vi.mocked(useAgents);

describe("AgentsList page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigation.reset();
    usePermission.mockReturnValue(true);
    mockedUseAgents.mockReturnValue(mockAgentsHook());
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

  it("renders branch status filter for the agents table", () => {
    renderWithRouter(<AgentsList />);

    expect(screen.getByRole("combobox", { name: /branches:/i })).toBeInTheDocument();
  });

  it("sends includeInactive to fetchAgents when list filter is Active + inactive", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await waitFor(() => expect(fetchAgents).toHaveBeenCalled());

    const filter = screen.getByRole("combobox", { name: /branches:/i });
    await user.click(filter);
    await user.click(await screen.findByRole("option", { name: /active \+ inactive/i }));

    await waitFor(() => {
      expect(fetchAgents).toHaveBeenCalledWith(expect.objectContaining({ includeInactive: true }));
    });
    expect(fetchUnsyncedBranches).not.toHaveBeenCalled();
  });

  it("opens sync modal with branch picker and inactive filter", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await user.click(screen.getByRole("button", { name: /sync branch/i }));
    expect(screen.getByText("Sync Agent Branch")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /include inactive branches/i })).not.toBeChecked();
    expect(fetchUnsyncedBranches).toHaveBeenCalledWith(false);
    expect(screen.getByLabelText(/^branch$/i)).toHaveTextContent(/select a branch to sync/i);
  });

  it("shows searchable branch picker sorted by branch code", async () => {
    mockedUseAgents.mockReturnValue(
      mockAgentsHook({
        unsyncedBranches: [
          { branch_id: "b3", branch_code: "C3", branch_name: "Charlie", active: true },
          { branch_id: "b2", branch_code: "B2", branch_name: "Branch Two", active: true },
        ],
      }),
    );
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await user.click(screen.getByRole("button", { name: /sync branch/i }));
    await user.click(screen.getByLabelText(/^branch$/i));

    expect(screen.getByLabelText(/select a branch to sync search/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "B2 - Branch Two",
        "C3 - Charlie",
      ]);
    });
  });

  it("loads inactive unsynced branches when inactive filter is checked without changing list filter", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await user.click(screen.getByRole("button", { name: /sync branch/i }));
    fetchUnsyncedBranches.mockClear();

    await user.click(screen.getByRole("checkbox", { name: /include inactive branches/i }));

    expect(fetchUnsyncedBranches).toHaveBeenCalledWith(true);
    expect(fetchAgents).not.toHaveBeenCalledWith(expect.objectContaining({ includeInactive: true }));
  });

  it("shows inline error when branch not selected on sync", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AgentsList />);

    await user.click(screen.getByRole("button", { name: /sync branch/i }));
    await user.click(screen.getByRole("button", { name: /^sync$/i }));
    expect(screen.getByText("Please select a branch!")).toBeInTheDocument();
    expect(syncData).not.toHaveBeenCalled();
  });

  it("hides sync and delete actions without agents:write", async () => {
    usePermission.mockImplementation((key: string) => key !== "agents:write");
    renderWithRouter(<AgentsList />);

    expect(screen.queryByRole("button", { name: /sync branch/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delete branch one/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/manage fees for branch one/i)).toBeInTheDocument();
  });

  it("uses primary Sync button when agents exist", () => {
    renderWithRouter(<AgentsList />);

    const syncButton = screen.getByRole("button", { name: /sync branch/i });
    expect(syncButton.className).toMatch(/bg-primary/);
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
