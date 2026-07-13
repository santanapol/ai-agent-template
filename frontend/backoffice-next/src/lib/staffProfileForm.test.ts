import { describe, expect, it } from "vitest";

import { PASSWORD_COMPLEXITY_MESSAGE } from "./passwordPolicy";
import { buildProfileContactPayload, emptyStaffProfileForm, validateStaffProfileForm } from "./staffProfileForm";

describe("validateStaffProfileForm", () => {
  it("allows empty email and tel on create", () => {
    const errors = validateStaffProfileForm(
      {
        ...emptyStaffProfileForm,
        code: "EMP-001",
        firstname: "John",
        lastname: "Doe",
        username: "jdoe",
        password: "InitialSecurePass1234!",
        confirmPassword: "InitialSecurePass1234!",
      },
      true,
    );

    expect(errors.email).toBeUndefined();
    expect(errors.tel).toBeUndefined();
  });

  it("rejects weak passwords on create", () => {
    const errors = validateStaffProfileForm(
      {
        ...emptyStaffProfileForm,
        code: "EMP-001",
        firstname: "John",
        lastname: "Doe",
        email: "john@example.com",
        tel: "0812345678",
        username: "jdoe",
        password: "password123",
        confirmPassword: "password123",
      },
      true,
    );

    expect(errors.password).toBe(PASSWORD_COMPLEXITY_MESSAGE);
  });

  it("rejects invalid email when provided", () => {
    const errors = validateStaffProfileForm(
      {
        ...emptyStaffProfileForm,
        code: "EMP-001",
        firstname: "John",
        lastname: "Doe",
        email: "not-an-email",
        username: "jdoe",
        password: "InitialSecurePass1234!",
        confirmPassword: "InitialSecurePass1234!",
      },
      true,
    );

    expect(errors.email).toBe("Please enter a valid email");
  });
});

describe("buildProfileContactPayload", () => {
  it("omits empty contact fields on create", () => {
    expect(buildProfileContactPayload({ email: "", tel: "" }, {}, "create")).toEqual({});
  });

  it("includes formatted tel on create", () => {
    expect(buildProfileContactPayload({ email: "user@example.com", tel: "0812345678" }, {}, "create")).toEqual({
      email: "user@example.com",
      tel: "+66812345678",
    });
  });

  it("sends null when clearing an existing email on patch", () => {
    expect(
      buildProfileContactPayload({ email: "", tel: "" }, { email: "old@example.com", tel: null }, "patch"),
    ).toEqual({ email: null });
  });

  it("omits unchanged contact fields on patch", () => {
    expect(
      buildProfileContactPayload(
        { email: "old@example.com", tel: "+66812345678" },
        { email: "old@example.com", tel: "+66812345678" },
        "patch",
      ),
    ).toEqual({});
  });
});
