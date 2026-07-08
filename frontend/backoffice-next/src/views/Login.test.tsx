import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { mockAuthUser } from "../test/mockFactories";
import { mockNextRouter } from "../test/mockNavigation";
import { renderWithProviders } from "../test/renderWithProviders";

const login = vi.fn();
const mockUseAuth = vi.fn();
const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() },
}));

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));

import Login from "./Login";

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login,
    });
  });

  it("shows inline validation errors when submit is empty", async () => {
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("Please enter username")).toBeInTheDocument();
    expect(screen.getByText("Please enter password")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(mockFeedback.message.error).not.toHaveBeenCalled();
  });

  it("calls login on successful submit", async () => {
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/username/i), "platform_admin");
    await user.type(screen.getByLabelText(/^password$/i), "1234");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(login).toHaveBeenCalledWith("platform_admin", "1234");
    expect(mockNextRouter.push).toHaveBeenCalledWith("/");
  });

  it("shows inline error when login rejects", async () => {
    login.mockRejectedValue(new Error("Unauthorized"));
    const user = userEvent.setup();

    renderWithProviders(<Login />);

    await user.type(screen.getByLabelText(/username/i), "bad");
    await user.type(screen.getByLabelText(/^password$/i), "bad");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(screen.getByText("Login failed. Please try again.")).toBeInTheDocument();
    expect(mockFeedback.message.error).not.toHaveBeenCalled();
  });

  it("redirects when already authenticated", () => {
    mockUseAuth.mockReturnValue({
      user: mockAuthUser(),
      loading: false,
      login,
    });

    renderWithProviders(<Login />);

    const navigateEl = screen.getByTestId("navigate");
    expect(navigateEl.getAttribute("data-to")).toBe("/");
  });

  it("shows split layout hero on large screens", () => {
    renderWithProviders(<Login />);
    expect(screen.getByText(/operations console for staff/i)).toBeInTheDocument();
  });
});
