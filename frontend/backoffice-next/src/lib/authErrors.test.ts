import axios from "axios";
import { describe, expect, it } from "vitest";

import {
  loginErrorMessage,
  passwordChangeFieldErrors,
  staffPasswordResetFieldErrors,
  validateAdminPasswordReset,
} from "./authErrors";
import { PASSWORD_COMPLEXITY_MESSAGE, PASSWORD_REQUIREMENTS_DESCRIPTION } from "./passwordPolicy";

function axiosError(data: Record<string, unknown>, status = 400) {
  return new axios.AxiosError("request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
    statusText: "Bad Request",
    headers: {},
    config: {} as never,
  });
}

describe("loginErrorMessage", () => {
  it("maps LOGIN_INVALID_CREDENTIALS", () => {
    expect(loginErrorMessage(axiosError({ code: "LOGIN_INVALID_CREDENTIALS" }))).toBe("Invalid username or password");
  });

  it("maps LOGIN_ACCOUNT_LOCKED", () => {
    expect(loginErrorMessage(axiosError({ code: "LOGIN_ACCOUNT_LOCKED" }))).toBe(
      "Account is locked due to too many failed attempts",
    );
  });

  it("maps AUTH_TOO_MANY_ATTEMPTS", () => {
    expect(loginErrorMessage(axiosError({ code: "AUTH_TOO_MANY_ATTEMPTS" }))).toBe(
      "Too many attempts. Please try again later.",
    );
  });

  it("does not render raw detail verbatim", () => {
    expect(loginErrorMessage(axiosError({ code: "UNKNOWN", detail: "<script>alert(1)</script>" }))).toBe(
      "Login failed. Please try again.",
    );
  });

  it("falls back for non-axios errors", () => {
    expect(loginErrorMessage(new Error("network"))).toBe("Login failed. Please try again.");
  });
});

describe("passwordChangeFieldErrors", () => {
  it("maps LOGIN_INVALID_CREDENTIALS to current_password", () => {
    expect(passwordChangeFieldErrors(axiosError({ code: "LOGIN_INVALID_CREDENTIALS" }))).toEqual({
      current_password: "Current password is incorrect.",
    });
  });

  it("maps AUTH_PASSWORD_UNCHANGED to new_password", () => {
    expect(passwordChangeFieldErrors(axiosError({ code: "AUTH_PASSWORD_UNCHANGED" }))).toEqual({
      new_password: "New password must differ from the current password.",
    });
  });

  it("maps AUTH_PASSWORD_POLICY_VIOLATION to new_password", () => {
    expect(passwordChangeFieldErrors(axiosError({ code: "AUTH_PASSWORD_POLICY_VIOLATION" }))).toEqual({
      new_password: PASSWORD_COMPLEXITY_MESSAGE,
    });
  });

  it("returns null for unknown codes", () => {
    expect(passwordChangeFieldErrors(axiosError({ code: "OTHER" }))).toBeNull();
  });
});

describe("staffPasswordResetFieldErrors", () => {
  it("maps staff INVALID_PARAM password policy message", () => {
    expect(
      staffPasswordResetFieldErrors(
        axiosError({ code: "INVALID_PARAM", message: "Password does not meet policy requirements" }),
      ),
    ).toEqual({ newPassword: PASSWORD_COMPLEXITY_MESSAGE });
  });

  it("maps generic staff validation failure to requirements helper", () => {
    expect(
      staffPasswordResetFieldErrors(axiosError({ code: "INVALID_PARAM", message: "Request validation failed" })),
    ).toEqual({ newPassword: PASSWORD_REQUIREMENTS_DESCRIPTION });
  });
});

describe("validateAdminPasswordReset", () => {
  it("rejects weak passwords before submit", () => {
    expect(validateAdminPasswordReset("password123", "password123")).toEqual({
      newPassword: PASSWORD_COMPLEXITY_MESSAGE,
    });
  });

  it("accepts policy-compliant passwords", () => {
    expect(validateAdminPasswordReset("InitialSecurePass1234!", "InitialSecurePass1234!")).toEqual({});
  });
});
