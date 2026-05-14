"use strict";

jest.mock("../../items.repository");

const repository = require("../../items.repository");
const service = require("../../items.service");
const CODES = require("../../../../utils/error-codes");
const { encodeEtagFromDate } = require("../../../../utils/etag");

describe("items.service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getItemById", () => {
    it("throws RESOURCE_NOT_FOUND when missing", async () => {
      repository.findById.mockResolvedValue(null);
      await expect(
        service.getItemById("a".repeat(24), {
          userId: "u",
          ouId: "o",
          branchId: "b",
        }),
      ).rejects.toMatchObject({ status: 404, code: CODES.RESOURCE_NOT_FOUND });
    });
  });

  describe("replaceItem", () => {
    it("throws PRECONDITION_REQUIRED when If-Match missing", async () => {
      await expect(
        service.replaceItem(
          "a".repeat(24),
          {
            code: "ABC",
            name: "N",
            description: null,
            status: "draft",
            tags: [],
          },
          { userId: "u", ouId: "o", branchId: "b" },
          "/api/v1/items/:itemId",
          undefined,
        ),
      ).rejects.toMatchObject({
        status: 428,
        code: CODES.PRECONDITION_REQUIRED,
      });
    });

    it("throws VERSION_CONFLICT when replace matchedCount is zero", async () => {
      const id = "b".repeat(24);
      const doc = {
        item: { id },
        etag: "e1",
      };
      repository.findById.mockResolvedValue(doc);
      repository.replaceById.mockResolvedValue({ matchedCount: 0 });
      const ifMatch = encodeEtagFromDate(new Date("2024-01-01T00:00:00.000Z"));
      await expect(
        service.replaceItem(
          id,
          {
            code: "ABC",
            name: "N",
            description: null,
            status: "draft",
            tags: [],
          },
          { userId: "u", ouId: "o", branchId: "b" },
          "/api/v1/items/:itemId",
          ifMatch,
        ),
      ).rejects.toMatchObject({
        status: 412,
        code: CODES.VERSION_CONFLICT,
      });
    });
  });
});
