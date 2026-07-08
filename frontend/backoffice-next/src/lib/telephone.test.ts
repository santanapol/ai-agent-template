import { describe, expect, it } from "vitest";

import { formatTelephoneToE164, telephoneRules } from "./telephone";

describe("telephone utility", () => {
  describe("formatTelephoneToE164", () => {
    it("returns empty string if falsy", () => {
      expect(formatTelephoneToE164("")).toBe("");
    });

    it("replaces dashes and spaces", () => {
      expect(formatTelephoneToE164("081-234 5678")).toBe("+66812345678");
    });

    it("keeps existing E164 with plus sign", () => {
      expect(formatTelephoneToE164("+66812345678")).toBe("+66812345678");
    });

    it("adds plus to 66 prefix", () => {
      expect(formatTelephoneToE164("66812345678")).toBe("+66812345678");
    });

    it("converts leading 0 to +66", () => {
      expect(formatTelephoneToE164("0812345678")).toBe("+66812345678");
    });

    it("prepends +66 to plain local numbers starting with 8", () => {
      expect(formatTelephoneToE164("812345678")).toBe("+66812345678");
    });
  });

  describe("telephoneRules validation", () => {
    const validator = telephoneRules[1].validator!;

    it("allows empty value (defers to required rule)", async () => {
      await expect(validator(null, "")).resolves.toBeUndefined();
    });

    it("accepts valid local and international numbers with spaces/dashes", async () => {
      await expect(validator(null, "081-234 5678")).resolves.toBeUndefined();
      await expect(validator(null, "+66812345678")).resolves.toBeUndefined();
    });

    it("rejects invalid characters", async () => {
      await expect(validator(null, "081-234-abc")).rejects.toThrow(
        "Invalid telephone format. e.g. 0812345678 or +66812345678",
      );
    });

    it("rejects numbers that are too short or long", async () => {
      await expect(validator(null, "123")).rejects.toThrow();
    });
  });
});
