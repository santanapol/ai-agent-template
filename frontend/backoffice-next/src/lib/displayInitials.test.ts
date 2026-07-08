import { describe, expect, it } from "vitest";

import { getDisplayInitials } from "./displayInitials";

describe("getDisplayInitials", () => {
  it("uses first and last name when both are present", () => {
    expect(getDisplayInitials({ firstname: "Santana", lastname: "Pol" })).toBe("SP");
    expect(getDisplayInitials({ firstname: "สมชาย", lastname: "ใจดี" })).toBe("สใ");
  });

  it("uses first two letters of a single first name", () => {
    expect(getDisplayInitials({ firstname: "Admin" })).toBe("AD");
  });

  it("parses displayName when structured names are missing", () => {
    expect(getDisplayInitials({ displayName: "John Doe" })).toBe("JD");
    expect(getDisplayInitials({ displayName: "Cher" })).toBe("CH");
  });

  it("falls back to username", () => {
    expect(getDisplayInitials({ username: "branch_admin_01" })).toBe("BR");
  });

  it("returns null when no usable label exists", () => {
    expect(getDisplayInitials({})).toBeNull();
    expect(getDisplayInitials({ firstname: "  ", lastname: "" })).toBeNull();
  });
});
