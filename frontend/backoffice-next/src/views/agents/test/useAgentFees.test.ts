import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../../../lib/agentFeesApiClient";
import type { AgentFee, GameCategory, GameCompany } from "../../../types/agentFees";
import { useAgentFees } from "../hooks/useAgentFees";

vi.mock("../../../lib/agentFeesApiClient");
vi.mock("../../../hooks/useAppFeedback", () => ({
  useAppFeedback: () => ({ message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }),
}));

describe("useAgentFees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sets fetching while fetchFees is in flight", async () => {
    let resolveFees!: (value: Awaited<ReturnType<typeof api.listAgentFees>>) => void;
    const pending = new Promise<Awaited<ReturnType<typeof api.listAgentFees>>>((resolve) => {
      resolveFees = resolve;
    });
    vi.mocked(api.listAgentFees).mockReturnValueOnce(pending);

    const { result } = renderHook(() => useAgentFees("agent123"));

    act(() => {
      void result.current.fetchFees();
    });
    expect(result.current.fetching).toBe(true);
    expect(result.current.saving).toBe(false);

    await act(async () => {
      resolveFees({ data: [], total: 0 });
      await pending;
    });

    expect(result.current.fetching).toBe(false);
  });

  it("should fetch fees and update state", async () => {
    const mockFees = [
      { _id: "1", gcomp_cost: 6, agent_known_fee: 10, agent_fee: 10, game_company_id: "C1", game_main_cate_id: "M1" },
    ];
    vi.mocked(api.listAgentFees).mockResolvedValueOnce({
      data: mockFees as unknown as AgentFee[],
      total: 1,
    });

    const { result } = renderHook(() => useAgentFees("agent123"));

    await act(async () => {
      await result.current.fetchFees();
    });

    expect(result.current.fetching).toBe(false);
    expect(result.current.fees).toEqual(mockFees);
    expect(result.current.total).toBe(1);
    expect(api.listAgentFees).toHaveBeenCalledWith("agent123", { page: 1, limit: 100 }, undefined);
  });

  it("sets masterDataLoading while fetchMasterData is in flight", async () => {
    let resolveCompanies!: (value: GameCompany[]) => void;
    const companiesPending = new Promise<GameCompany[]>((resolve) => {
      resolveCompanies = resolve;
    });
    vi.mocked(api.getGameCompanies).mockReturnValueOnce(companiesPending);
    vi.mocked(api.getGameCategories).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useAgentFees("agent123"));

    act(() => {
      void result.current.fetchMasterData("ou-1");
    });
    expect(result.current.masterDataLoading).toBe(true);

    await act(async () => {
      resolveCompanies([]);
      await companiesPending;
    });

    expect(result.current.masterDataLoading).toBe(false);
  });

  it("should fetch master data", async () => {
    const mockCompanies = [{ _id: "c1", name: "Comp 1" }];
    const mockCategories = [{ _id: "cat1", name: "Cat 1" }];

    vi.mocked(api.getGameCompanies).mockResolvedValueOnce(mockCompanies as unknown as GameCompany[]);
    vi.mocked(api.getGameCategories).mockResolvedValueOnce(mockCategories as unknown as GameCategory[]);

    const { result } = renderHook(() => useAgentFees("agent123"));

    await act(async () => {
      await result.current.fetchMasterData();
    });

    expect(result.current.companies).toEqual(mockCompanies);
    expect(result.current.categories).toEqual(mockCategories);
  });

  it("sets saving during bulkSave", async () => {
    let resolveCreate!: (value: unknown) => void;
    const pending = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    vi.mocked(api.createAgentFee).mockReturnValueOnce(pending as never);

    const { result } = renderHook(() => useAgentFees("agent123"));

    act(() => {
      void result.current.bulkSave(
        [
          {
            game_company_id: "c1",
            game_main_cate_id: "cat1",
            gcomp_cost: 1,
            agent_known_fee: 1,
            agent_fee: 1,
          },
        ],
        [],
        [],
      );
    });

    expect(result.current.saving).toBe(true);

    await act(async () => {
      resolveCreate({});
      await pending;
    });

    expect(result.current.saving).toBe(false);
  });
});
