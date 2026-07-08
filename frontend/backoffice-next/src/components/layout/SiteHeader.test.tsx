import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithRouter } from "../../test/renderWithRouter";
import { SiteHeader } from "./SiteHeader";

describe("SiteHeader", () => {
  it("shows SidebarTrigger on desktop", () => {
    renderWithRouter(<SiteHeader isMobile={false} onOpenMobileNav={vi.fn()} />, { withSidebar: true });

    expect(screen.getByRole("button", { name: /toggle sidebar/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/open navigation menu/i)).not.toBeInTheDocument();
  });

  it("shows mobile hamburger and calls onOpenMobileNav", async () => {
    const onOpenMobileNav = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<SiteHeader isMobile onOpenMobileNav={onOpenMobileNav} />, { withSidebar: true });

    await user.click(screen.getByLabelText(/open navigation menu/i));
    expect(onOpenMobileNav).toHaveBeenCalled();
  });

  it("does not render breadcrumb in header", () => {
    renderWithRouter(<SiteHeader isMobile={false} onOpenMobileNav={vi.fn()} />, { withSidebar: true });

    expect(screen.queryByRole("navigation", { name: /breadcrumb/i })).not.toBeInTheDocument();
  });

  it("shows mobile branch label when provided (CC-07)", () => {
    renderWithRouter(<SiteHeader isMobile onOpenMobileNav={vi.fn()} mobileBranchLabel="HQ · Bangkok Branch" />, {
      withSidebar: true,
    });

    expect(screen.getByText("HQ · Bangkok Branch")).toBeInTheDocument();
  });
});
