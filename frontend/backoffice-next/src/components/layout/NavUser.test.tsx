import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { mockAuthUser } from "../../test/mockFactories";
import { renderWithRouter } from "../../test/renderWithRouter";
import { NavUser } from "./NavUser";

describe("NavUser", () => {
  const baseProps = {
    displayName: "Jane Admin",
    headerProfile: { firstname: "Jane", lastname: "Admin", username: "jadmin" },
    user: mockAuthUser(),
    roleLabel: "Platform Admin",
    onProfile: vi.fn(),
    onLogout: vi.fn(),
  };

  it("uses account menu aria label with display name", () => {
    renderWithRouter(<NavUser {...baseProps} />, { withSidebar: true });
    expect(screen.getByLabelText(/account menu for jane admin/i)).toBeInTheDocument();
  });

  it("falls back to username then sub for display name", async () => {
    const user = userEvent.setup();
    renderWithRouter(
      <NavUser
        {...baseProps}
        displayName={null}
        headerProfile={null}
        user={mockAuthUser("staff", [], { username: "staff_user", sub: "sub-99" })}
      />,
      { withSidebar: true },
    );

    await user.click(screen.getByLabelText(/account menu for staff_user/i));
    expect(screen.getAllByText("staff_user").length).toBeGreaterThan(0);
  });

  it("does not render theme toggle menu item", async () => {
    const user = userEvent.setup();
    renderWithRouter(<NavUser {...baseProps} />, { withSidebar: true });

    await user.click(screen.getByLabelText(/account menu for jane admin/i));
    expect(screen.queryByRole("menuitem", { name: /mode/i })).not.toBeInTheDocument();
  });

  it("calls onProfile from My Profile item", async () => {
    const onProfile = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<NavUser {...baseProps} onProfile={onProfile} />, { withSidebar: true });

    await user.click(screen.getByLabelText(/account menu for jane admin/i));
    await user.click(await screen.findByRole("menuitem", { name: /my profile/i }));
    expect(onProfile).toHaveBeenCalled();
  });

  it("calls onLogout from Log out item", async () => {
    const onLogout = vi.fn();
    const user = userEvent.setup();

    renderWithRouter(<NavUser {...baseProps} onLogout={onLogout} />, { withSidebar: true });

    await user.click(screen.getByLabelText(/account menu for jane admin/i));
    await user.click(await screen.findByRole("menuitem", { name: /log out/i }));
    expect(onLogout).toHaveBeenCalled();
  });

  it("shows role subtitle under account name", async () => {
    const user = userEvent.setup();
    renderWithRouter(<NavUser {...baseProps} />, { withSidebar: true });

    await user.click(screen.getByLabelText(/account menu for jane admin/i));
    expect(screen.getAllByText("Platform Admin").length).toBeGreaterThan(0);
  });
});
