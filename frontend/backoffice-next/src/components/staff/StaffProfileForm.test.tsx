import type React from "react";
import { useState } from "react";

import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../test/renderWithProviders";
import StaffProfileForm from "./StaffProfileForm";

interface WrapperProps {
  mode: "create" | "edit" | "view";
  isSaving?: boolean;
  showAdminResetPassword?: boolean;
  canAssignRole?: boolean;
  errors?: Partial<
    Record<
      | "code"
      | "firstname"
      | "lastname"
      | "email"
      | "tel"
      | "username"
      | "password"
      | "confirmPassword"
      | "newPassword"
      | "confirmNewPassword",
      string
    >
  >;
}

const Wrapper: React.FC<WrapperProps> = ({
  mode,
  showAdminResetPassword = false,
  canAssignRole = false,
  errors = {},
}) => {
  const [values, setValues] = useState({
    code: "",
    firstname: "",
    lastname: "",
    email: "",
    tel: "",
    role: "staff",
  });

  return (
    <StaffProfileForm
      mode={mode}
      loading={false}
      updatingPassword={false}
      showAdminResetPassword={showAdminResetPassword}
      canAssignRole={canAssignRole}
      values={values}
      errors={errors}
      onChange={(field, value) => setValues((prev) => ({ ...prev, [field]: value }))}
      onUpdatePassword={vi.fn()}
    />
  );
};

describe("StaffProfileForm", () => {
  describe("mode: create", () => {
    it("renders Username and Password fields", () => {
      renderWithProviders(<Wrapper mode="create" />);
      expect(screen.getByText("Username")).toBeInTheDocument();
      expect(screen.getByText("Password")).toBeInTheDocument();
    });

    it("shows System Role when canAssignRole is true", () => {
      renderWithProviders(<Wrapper mode="create" canAssignRole={true} />);
      expect(screen.getByText("System Role")).toBeInTheDocument();
    });

    it("hides System Role when canAssignRole is false", () => {
      renderWithProviders(<Wrapper mode="create" />);
      expect(screen.queryByText("System Role")).not.toBeInTheDocument();
    });

    it("links validation errors to the matching inputs", () => {
      renderWithProviders(
        <Wrapper
          mode="create"
          errors={{
            code: "Code is required",
            email: "Email is invalid",
            password: "Password is too short",
          }}
        />,
      );

      expect(screen.getByLabelText("Staff Code")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
      expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    });
  });

  describe("mode: edit", () => {
    it("does not render Username field", () => {
      renderWithProviders(<Wrapper mode="edit" />);
      expect(screen.queryByText("Username")).not.toBeInTheDocument();
    });

    it("renders admin reset password section when showAdminResetPassword=true", () => {
      renderWithProviders(<Wrapper mode="edit" showAdminResetPassword={true} />);
      expect(screen.getByText(/reset password/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /update password/i })).toBeInTheDocument();
      expect(screen.getByText(/uppercase, lowercase, numbers, and special characters/i)).toBeInTheDocument();
    });
  });

  describe("mode: view", () => {
    it("disables profile fields", () => {
      renderWithProviders(<Wrapper mode="view" />);
      expect(screen.getByLabelText("Staff Code")).toBeDisabled();
      expect(screen.getByLabelText("First Name")).toBeDisabled();
    });
  });
});
