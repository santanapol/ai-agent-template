import type { ComponentProps } from "react";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import { ZERO_HQ_BRANCH } from "@/lib/branchOptions";
import type { InvoiceAgentBranch } from "@/types/invoice";

import { BranchSwitcher } from "./BranchSwitcher";

const branches: InvoiceAgentBranch[] = [
  { branch_id: "b-home", branch_code: "H01", branch_name: "Home", active: true },
  { branch_id: "b-target", branch_code: "T01", branch_name: "Target", active: true },
];

function renderSwitcher(overrides: Partial<ComponentProps<typeof BranchSwitcher>> = {}) {
  const resolvedBranches = overrides.branches ?? branches;
  return render(
    <SidebarProvider>
      <BranchSwitcher
        showBranchSwitcher
        branchDisplayLabel="H01 - Home"
        activeBranchId="b-home"
        activeBranchSelectLabel="H01 - Home"
        branches={resolvedBranches}
        branchCatalogHasMultiple={
          overrides.branchCatalogHasMultiple ?? resolvedBranches.length > 1
        }
        branchSelectLoading={false}
        viewingOtherBranch={false}
        homeBranchId="b-home"
        onBranchSwitch={vi.fn()}
        onBranchSearchQueryChange={vi.fn()}
        roleLabel="Platform Admin"
        {...overrides}
      />
    </SidebarProvider>,
  );
}

describe("BranchSwitcher search a11y (FE-REV-009)", () => {
  it("focuses the search input when the menu opens", async () => {
    const user = userEvent.setup();
    renderSwitcher();

    await user.click(screen.getByRole("button", { name: "Select active branch" }));

    await waitFor(() => {
      expect(screen.getByRole("searchbox", { name: "Search branches" })).toHaveFocus();
    });
  });

  it("keeps typed characters in the search field", async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    renderSwitcher({
      branchSearchQuery: "",
      onBranchSearchQueryChange: onSearch,
    });

    await user.click(screen.getByRole("button", { name: "Select active branch" }));
    const input = await screen.findByRole("searchbox", { name: "Search branches" });
    await user.type(input, "77");

    expect(onSearch).toHaveBeenCalled();
    expect(onSearch.mock.calls.some((call) => String(call[0]).includes("7"))).toBe(true);
  });

  it("keeps the branch dropdown trigger when search results are empty", () => {
    renderSwitcher({
      branchCatalogHasMultiple: true,
      branches: [],
      viewingOtherBranch: false,
    });

    expect(screen.getByRole("button", { name: "Select active branch" })).toBeInTheDocument();
  });

  it("announces empty search results", async () => {
    const user = userEvent.setup();
    renderSwitcher({
      branches: [],
      branchSearchLoading: false,
      viewingOtherBranch: true,
      homeBranchId: "b-home",
    });

    await user.click(screen.getByRole("button", { name: "Select active branch" }));

    expect(await screen.findByRole("status")).toHaveTextContent("No branches found");
  });

  it("hides inactive branches until All is checked", async () => {
    const user = userEvent.setup();
    renderSwitcher({
      branches: [
        { branch_id: "b-home", branch_code: "H01", branch_name: "Home", active: true },
        { branch_id: "b-off", branch_code: "X01", branch_name: "Closed", active: false },
      ],
    });

    await user.click(screen.getByRole("button", { name: "Select active branch" }));
    expect(screen.getByRole("menuitem", { name: "H01 - Home" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "X01 - Closed (inactive)" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: /show all branches/i }));
    expect(screen.getByRole("menuitem", { name: "X01 - Closed (inactive)" })).toBeInTheDocument();
  });

  it("resets to Zero HQ from the Home button and keeps HQ out of the menu", async () => {
    const user = userEvent.setup();
    const onBranchSwitch = vi.fn();
    renderSwitcher({
      branches: [
        { branch_id: "b-target", branch_code: "T01", branch_name: "Target", active: true },
        ZERO_HQ_BRANCH,
        { branch_id: "b-home", branch_code: "H01", branch_name: "Home", active: true },
      ],
      onBranchSwitch,
    });

    expect(screen.getByRole("button", { name: "Reset to Zero HQ" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Select active branch" }));
    expect(screen.queryByText("Platform")).not.toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "ZERO - Zero HQ" })).not.toBeInTheDocument();
    expect(screen.getByText("Branches")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Reset to Zero HQ" }));
    expect(onBranchSwitch).toHaveBeenCalledWith(ZERO_HQ_BRANCH.branch_id);
  });

  it("disables Home when already on Zero HQ", () => {
    renderSwitcher({
      activeBranchId: ZERO_HQ_BRANCH.branch_id,
      activeBranchSelectLabel: "ZERO - Zero HQ",
      branches: [ZERO_HQ_BRANCH, ...branches],
    });

    expect(screen.getByRole("button", { name: "Reset to Zero HQ" })).toBeDisabled();
  });

  it("styles the trigger muted when the active branch is inactive", () => {
    renderSwitcher({
      activeBranchId: "b-off",
      activeBranchSelectLabel: "X01 - Closed",
      branches: [
        { branch_id: "b-home", branch_code: "H01", branch_name: "Home", active: true },
        { branch_id: "b-off", branch_code: "X01", branch_name: "Closed", active: false },
      ],
      viewingOtherBranch: true,
    });

    const trigger = screen.getByRole("button", { name: "Select active branch" });
    expect(trigger.className).toMatch(/text-muted-foreground/);
    expect(trigger.className).not.toMatch(/text-primary-foreground/);
  });
});
