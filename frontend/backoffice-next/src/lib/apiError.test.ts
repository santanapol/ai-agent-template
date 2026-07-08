import type { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { apiErrorMessage } from "./apiError";
import { BranchReportApiError } from "./branchReportApiClient";
import { branchReportUserMessage } from "./branchReportMessages";

function makeAxiosError(data: { code?: string; detail?: string; message?: string }) {
  const err = new Error("request failed") as AxiosError;
  err.isAxiosError = true;
  err.response = {
    data,
    status: 400,
    statusText: "Bad Request",
    headers: {},
    config: {},
  } as AxiosError["response"];
  return err;
}

describe("apiErrorMessage", () => {
  it("maps AUTH_PRECONDITION_FAILED", () => {
    const err = makeAxiosError({ code: "AUTH_PRECONDITION_FAILED" });
    expect(apiErrorMessage(err, "fallback")).toMatch(/modified by another session/i);
  });

  it("maps AUTH_MENU_IN_USE from detail", () => {
    const err = makeAxiosError({
      code: "AUTH_MENU_IN_USE",
      detail: "Cannot delete menu key that has children.",
    });
    expect(apiErrorMessage(err, "fallback")).toBe("Cannot delete menu key that has children.");
  });

  it("maps AUTH_ROLE_PERMISSION_IN_USE from detail", () => {
    const err = makeAxiosError({
      code: "AUTH_ROLE_PERMISSION_IN_USE",
      detail: "Cannot delete role mapping because there are 3 active users.",
    });
    expect(apiErrorMessage(err, "fallback")).toContain("active users");
  });

  it("does not pass through AUTH_INVALID_REQUEST detail", () => {
    const err = makeAxiosError({
      code: "AUTH_INVALID_REQUEST",
      detail: "Menu validation failed: duplicate key",
    });
    expect(apiErrorMessage(err, "fallback")).toBe("fallback");
  });

  it("maps VERSION_CONFLICT for staff", () => {
    const err = makeAxiosError({ code: "VERSION_CONFLICT" });
    expect(apiErrorMessage(err, "fallback")).toMatch(/modified by another session/i);
  });

  it("returns BranchReportApiError message", () => {
    const err = new BranchReportApiError(
      "INVALID_PARAM",
      "Invalid report parameters. Check your filters and try again.",
    );
    expect(apiErrorMessage(err, "fallback")).toBe("Invalid report parameters. Check your filters and try again.");
  });

  it("maps DUPLICATE to fixed message", () => {
    const err = makeAxiosError({ code: "DUPLICATE", detail: "duplicate key" });
    expect(apiErrorMessage(err, "fallback")).toMatch(/staff code or user already exists/i);
  });

  it("maps STAFF_AUTH_REVOKE_PENDING to fixed message", () => {
    const err = makeAxiosError({ code: "STAFF_AUTH_REVOKE_PENDING" });
    expect(apiErrorMessage(err, "fallback")).toMatch(/revocation is still pending/i);
  });

  it("returns fallback for unknown errors", () => {
    expect(apiErrorMessage(new Error("nope"), "fallback")).toBe("fallback");
  });

  it("does not pass through raw detail for unknown codes", () => {
    const err = makeAxiosError({
      code: "UNKNOWN_CODE",
      detail: "<script>alert(1)</script>",
      message: "raw message",
    });
    expect(apiErrorMessage(err, "fallback")).toBe("fallback");
  });

  it("maps AUTH_MENU_NOT_FOUND to fixed message", () => {
    const err = makeAxiosError({
      code: "AUTH_MENU_NOT_FOUND",
      detail: "Menu key missing",
    });
    expect(apiErrorMessage(err, "fallback")).toBe("Menu node not found. Refresh the catalog and try again.");
  });

  it("maps AUTH_ROLE_PERMISSION_NOT_FOUND with default message", () => {
    const err = makeAxiosError({ code: "AUTH_ROLE_PERMISSION_NOT_FOUND" });
    expect(apiErrorMessage(err, "fallback")).toBe("Role permission mapping not found.");
  });
});
