import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";
import type { InvoiceAgentBranch } from "@/types/invoice";

import { BranchSwitcher } from "./BranchSwitcher";

const branches: InvoiceAgentBranch[] = [
  { branch_id: "b-home", branch_code: "H01", branch_name: "Home", active: true },
  { branch_id: "b-target", branch_code: "T01", branch_name: "Target", active: true },
];

function renderSwitcher(overrides: Partial<ComponentProps<typeof BranchSwitcher>> = {}) {
  return render(
    <SidebarProvider>
      <BranchSwitcher
        showBranchSwitcher
        branchDisplayLabel="H01 - Home"
        activeBranchId="b-home"
        activeBranchSelectLabel="H01 - Home"
        branches={branches}
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
});
