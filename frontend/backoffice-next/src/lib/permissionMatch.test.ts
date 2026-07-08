import { describe, expect, it } from "vitest";

import { anyPermissionMatches, isWildcardEntry, matchesPermission } from "./permissionMatch";

describe("permissionMatch", () => {
  describe("isWildcardEntry", () => {
    it("accepts only the domain:* form", () => {
      expect(isWildcardEntry("profiles:*")).toBe(true);
      expect(isWildcardEntry("profiles:create")).toBe(false);
      expect(isWildcardEntry("*")).toBe(false);
      expect(isWildcardEntry(":*")).toBe(false);
      expect(isWildcardEntry("pro*:*")).toBe(false);
      expect(isWildcardEntry("profiles:*:create")).toBe(false);
      expect(isWildcardEntry("")).toBe(false);
      expect(isWildcardEntry(null)).toBe(false);
      expect(isWildcardEntry(undefined)).toBe(false);
    });
  });

  describe("matchesPermission", () => {
    it("matches exact action key", () => {
      expect(matchesPermission("profiles:create", "profiles:create")).toBe(true);
      expect(matchesPermission("profiles:create", "profiles:list")).toBe(false);
    });

    it("wildcard covers all actions in the domain", () => {
      expect(matchesPermission("profiles:*", "profiles:create")).toBe(true);
      expect(matchesPermission("profiles:*", "profiles:list")).toBe(true);
    });

    it("wildcard does not cross domains", () => {
      expect(matchesPermission("profiles:*", "profile:create")).toBe(false);
      expect(matchesPermission("profiles:*", "invoice:read")).toBe(false);
      expect(matchesPermission("profiles:*", "profiles")).toBe(false);
      expect(matchesPermission("profiles:*", "profiles:")).toBe(false);
    });

    it("rejects unsupported wildcard forms as literals", () => {
      expect(matchesPermission("*", "profiles:create")).toBe(false);
      expect(matchesPermission("pro*:*", "profiles:create")).toBe(false);
      expect(matchesPermission("profiles:*", "profiles:*")).toBe(false);
    });

    it("rejects non-string input", () => {
      expect(matchesPermission(null, "profiles:create")).toBe(false);
      expect(matchesPermission("profiles:*", null)).toBe(false);
      expect(matchesPermission(undefined, undefined)).toBe(false);
    });
  });

  describe("anyPermissionMatches", () => {
    it("checks entries with mixed exact and wildcard", () => {
      const entries = ["invoice:read", "profiles:*"];
      expect(anyPermissionMatches(entries, "profiles:create")).toBe(true);
      expect(anyPermissionMatches(entries, "invoice:read")).toBe(true);
      expect(anyPermissionMatches(entries, "invoice:create")).toBe(false);
    });

    it("returns false for empty or invalid entries", () => {
      expect(anyPermissionMatches([], "profiles:create")).toBe(false);
      expect(anyPermissionMatches(null as unknown as string[], "profiles:create")).toBe(false);
      expect(anyPermissionMatches(undefined as unknown as string[], "profiles:create")).toBe(false);
    });
  });
});
