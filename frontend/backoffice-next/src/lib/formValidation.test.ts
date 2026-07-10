import { describe, expect, it } from "vitest";

import { validateEmail, validateTelephone } from "./formValidation";

describe("formValidation contact fields", () => {
  it("allows empty email and telephone", () => {
    expect(validateEmail("")).toBeUndefined();
    expect(validateEmail("   ")).toBeUndefined();
    expect(validateTelephone("")).toBeUndefined();
  });

  it("rejects invalid email format when provided", () => {
    expect(validateEmail("not-an-email")).toBe("Please enter a valid email");
  });

  it("rejects invalid telephone format when provided", () => {
    expect(validateTelephone("abc")).toMatch(/invalid telephone format/i);
  });

  it("accepts valid email and telephone", () => {
    expect(validateEmail("user@example.com")).toBeUndefined();
    expect(validateTelephone("0812345678")).toBeUndefined();
  });
});
