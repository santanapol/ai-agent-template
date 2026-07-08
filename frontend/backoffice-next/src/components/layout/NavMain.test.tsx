import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LayoutDashboard, WalletCards } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { SidebarProvider } from "@/components/ui/sidebar";

import { renderWithRouter } from "../../test/renderWithRouter";
import { NavMain } from "./NavMain";
import type { MenuItemType } from "./types";

const flatItems: MenuItemType[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard />,
    route: "/",
    sort_order: 0,
  },
];

const groupedItems: MenuItemType[] = [
  ...flatItems,
  {
    key: "billing",
    label: "Billing",
    icon: <WalletCards />,
    sort_order: 10,
    children: [
      {
        key: "invoices",
        label: "Invoices",
        route: "/invoices",
        sort_order: 0,
      },
    ],
  },
];

describe("NavMain", () => {
  it("calls onNavigate when flat item clicked", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<NavMain items={flatItems} selectedPath="/staff" onNavigate={onNavigate} />, {
      withSidebar: true,
    });

    await user.click(screen.getByText("Dashboard"));
    expect(onNavigate).toHaveBeenCalledWith("/");
  });

  it("marks active item based on selectedPath", () => {
    renderWithRouter(<NavMain items={flatItems} selectedPath="/" onNavigate={vi.fn()} />, { withSidebar: true });

    const dashboardButton = screen.getByText("Dashboard").closest("button");
    expect(dashboardButton).toHaveAttribute("data-active");
  });

  it("expands collapsible group and navigates child", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<NavMain items={groupedItems} selectedPath="/" onNavigate={onNavigate} />, { withSidebar: true });

    await user.click(screen.getByText("Billing"));
    await user.click(screen.getByText("Invoices"));
    expect(onNavigate).toHaveBeenCalledWith("/invoices");
  });

  it("auto-opens group when selectedPath is in subtree", () => {
    renderWithRouter(<NavMain items={groupedItems} selectedPath="/invoices" onNavigate={vi.fn()} />, {
      withSidebar: true,
    });

    expect(screen.getByText("Invoices")).toBeInTheDocument();
  });

  it("renders dashboard in a separate group above Menu label", () => {
    renderWithRouter(<NavMain items={groupedItems} selectedPath="/" onNavigate={vi.fn()} />, { withSidebar: true });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Menu")).toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
  });

  it("does not crash with empty items", () => {
    renderWithRouter(<NavMain items={[]} selectedPath="/" onNavigate={vi.fn()} />, { withSidebar: true });

    expect(screen.queryByText("Menu")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  });

  it("hides inline submenu when sidebar is collapsed on desktop", () => {
    renderWithRouter(
      <SidebarProvider defaultOpen={false}>
        <NavMain items={groupedItems} selectedPath="/invoices" onNavigate={vi.fn()} />
      </SidebarProvider>,
      { withSidebar: false },
    );

    expect(screen.queryByText("Invoices")).not.toBeInTheDocument();
    expect(screen.getByText("Billing")).toBeInTheDocument();
  });
});
