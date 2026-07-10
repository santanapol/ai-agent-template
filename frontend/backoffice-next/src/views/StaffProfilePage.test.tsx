import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Route, Routes } from "@/navigation/compat";

import * as staffApi from "../lib/staffApiClient";
import { renderWithRouter } from "../test/renderWithRouter";
import { testNavigation } from "../test/mockNavigation";
import StaffProfilePage from "./StaffProfilePage";

const mockFeedback = vi.hoisted(() => ({
  message: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

vi.mock("../lib/staffApiClient");
vi.mock("../hooks/useAppFeedback", () => ({
  useAppFeedback: () => mockFeedback,
}));
vi.mock("../hooks/usePermission", () => ({
  usePermission: (permission: string) => permission === "roles:assign" || permission === "profiles:edit",
}));
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { sub: "admin-user" } }),
}));

function renderStaffProfile(mode: "create" | "view" | "edit", path: string) {
  return renderWithRouter(
    <Routes>
      <Route path="/staff/new" element={<StaffProfilePage mode="create" />} />
      <Route path="/staff/:id/edit" element={<StaffProfilePage mode="edit" />} />
      <Route path="/staff/:id" element={<StaffProfilePage mode="view" />} />
    </Routes>,
    { initialEntries: [path] },
  );
}

describe("StaffProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    testNavigation.reset();
    vi.mocked(staffApi.getProfileById).mockResolvedValue({
      profile: {
        id: "profile-1",
        user_id: "user-1",
        ou_id: "ou-1",
        branch_id: "branch-1",
        status: "active",
        code: "EMP-001",
        firstname: "John",
        lastname: "Doe",
        email: "john@example.com",
        tel: "+661234567890",
        user: { username: "jdoe", role: "staff" },
      },
      etag: "etag-1",
    });
  });

  it("renders create form on /staff/new", async () => {
    renderStaffProfile("create", "/staff/new");

    expect(await screen.findByRole("heading", { name: /create staff profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create profile/i })).toBeInTheDocument();
  });

  it("creates profile when form is valid", async () => {
    const user = userEvent.setup();
    vi.mocked(staffApi.createProfile).mockResolvedValue({
      id: "profile-new",
      user_id: "user-new",
      ou_id: "ou-1",
      branch_id: "branch-1",
      status: "active",
      code: "EMP-002",
      firstname: "Jane",
      lastname: "Smith",
      email: "jane@example.com",
      tel: "+66812345678",
      user: { username: "jsmith", role: "staff" },
    });

    renderStaffProfile("create", "/staff/new");
    await screen.findByRole("heading", { name: /create staff profile/i });

    await user.type(screen.getByLabelText("Staff Code"), "EMP-002");
    await user.type(screen.getByLabelText("First Name"), "Jane");
    await user.type(screen.getByLabelText("Last Name"), "Smith");
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.type(screen.getByLabelText("Telephone"), "0812345678");
    await user.type(screen.getByLabelText("Username"), "jsmith");
    await user.type(screen.getByLabelText("Password"), "InitialSecurePass1234!");
    await user.type(screen.getByLabelText("Confirm password"), "InitialSecurePass1234!");

    await user.click(screen.getByRole("button", { name: /create profile/i }));

    await waitFor(() => {
      expect(staffApi.createProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "EMP-002",
          firstname: "Jane",
          lastname: "Smith",
          email: "jane@example.com",
          username: "jsmith",
          password: "InitialSecurePass1234!",
        }),
      );
      expect(testNavigation.push).toHaveBeenCalledWith("/staff", undefined);
    });
  });

  it("creates profile without email and telephone", async () => {
    const user = userEvent.setup();
    vi.mocked(staffApi.createProfile).mockResolvedValue({
      id: "profile-new",
      user_id: "user-new",
      ou_id: "ou-1",
      branch_id: "branch-1",
      status: "active",
      code: "EMP-003",
      firstname: "Jane",
      lastname: "Smith",
      email: null,
      tel: null,
      user: { username: "jsmith2", role: "staff" },
    });

    renderStaffProfile("create", "/staff/new");
    await screen.findByRole("heading", { name: /create staff profile/i });

    await user.type(screen.getByLabelText("Staff Code"), "EMP-003");
    await user.type(screen.getByLabelText("First Name"), "Jane");
    await user.type(screen.getByLabelText("Last Name"), "Smith");
    await user.type(screen.getByLabelText("Username"), "jsmith2");
    await user.type(screen.getByLabelText("Password"), "InitialSecurePass1234!");
    await user.type(screen.getByLabelText("Confirm password"), "InitialSecurePass1234!");

    await user.click(screen.getByRole("button", { name: /create profile/i }));

    await waitFor(() => {
      expect(staffApi.createProfile).toHaveBeenCalled();
    });
    const payload = vi.mocked(staffApi.createProfile).mock.calls[0]?.[0];
    expect(payload).toMatchObject({
      code: "EMP-003",
      firstname: "Jane",
      lastname: "Smith",
      username: "jsmith2",
      password: "InitialSecurePass1234!",
    });
    expect(payload?.email).toBeUndefined();
    expect(payload?.tel).toBeUndefined();
  });

  it("shows validation errors when create form is incomplete", async () => {
    const user = userEvent.setup();
    renderStaffProfile("create", "/staff/new");
    await screen.findByRole("button", { name: /create profile/i });

    await user.click(screen.getByRole("button", { name: /create profile/i }));

    expect(await screen.findByText("Please enter staff code")).toBeInTheDocument();
    expect(staffApi.createProfile).not.toHaveBeenCalled();
    expect(mockFeedback.message.warning).toHaveBeenCalled();
  });

  it("loads profile for view mode", async () => {
    renderStaffProfile("view", "/staff/profile-1");

    expect(await screen.findByRole("heading", { name: /john doe/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit profile/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Staff Code")).toBeDisabled();
  });

  it("navigates to edit page from view mode", async () => {
    const user = userEvent.setup();
    renderStaffProfile("view", "/staff/profile-1");

    await screen.findByRole("button", { name: /edit profile/i });
    await user.click(screen.getByRole("button", { name: /edit profile/i }));

    expect(testNavigation.push).toHaveBeenCalledWith("/staff/profile-1/edit", undefined);
  });

  it("saves profile updates in edit mode", async () => {
    const user = userEvent.setup();
    vi.mocked(staffApi.patchProfile).mockResolvedValue({
      profile: {
        id: "profile-1",
        user_id: "user-1",
        ou_id: "ou-1",
        branch_id: "branch-1",
        status: "active",
        code: "EMP-001",
        firstname: "Jane",
        lastname: "Doe",
        email: "john@example.com",
        tel: "+661234567890",
        user: { username: "jdoe", role: "staff" },
      },
      etag: "etag-2",
    });

    renderStaffProfile("edit", "/staff/profile-1/edit");
    await screen.findByLabelText("First Name");

    const firstName = screen.getByLabelText("First Name");
    await user.clear(firstName);
    await user.type(firstName, "Jane");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(staffApi.patchProfile).toHaveBeenCalledWith(
        "profile-1",
        expect.objectContaining({ firstname: "Jane", lastname: "Doe" }),
        "etag-1",
      );
      expect(testNavigation.push).toHaveBeenCalledWith("/staff/profile-1", undefined);
    });
    const payload = vi.mocked(staffApi.patchProfile).mock.calls[0]?.[1];
    expect(payload?.email).toBeUndefined();
    expect(payload?.tel).toBeUndefined();
  });
});
