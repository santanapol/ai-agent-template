"use strict";

const validators = require("../../items.validator");

describe("items.validator", () => {
  describe("create.body", () => {
    it("accepts a valid payload", () => {
      const { error, value } = validators.create.body.validate({
        code: "ABC-01",
        name: "Item",
        description: null,
        status: "draft",
        tags: ["a"],
      });
      expect(error).toBeUndefined();
      expect(value.code).toBe("ABC-01");
    });

    it("rejects unknown keys", () => {
      const { error } = validators.create.body.validate({
        code: "ABC-01",
        name: "Item",
        status: "draft",
        extra: true,
      });
      expect(error).toBeDefined();
    });

    it("rejects invalid code pattern", () => {
      const { error } = validators.create.body.validate({
        code: "ab",
        name: "Item",
        status: "draft",
      });
      expect(error).toBeDefined();
    });
  });

  describe("list.query", () => {
    it("applies defaults for page and limit", () => {
      const { error, value } = validators.list.query.validate({});
      expect(error).toBeUndefined();
      expect(value).toEqual({ page: 1, limit: 20 });
    });
  });

  describe("detail.params", () => {
    it("requires 24-char hex itemId", () => {
      const ok = validators.detail.params.validate({
        itemId: "a".repeat(24),
      });
      expect(ok.error).toBeUndefined();

      const bad = validators.detail.params.validate({ itemId: "short" });
      expect(bad.error).toBeDefined();
    });
  });
});
