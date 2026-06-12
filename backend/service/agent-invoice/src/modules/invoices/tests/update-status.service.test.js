import test from "node:test";
import assert from "node:assert";
import { updateInvoiceStatus } from "../update-status.service.js";

const VALID_ID = "665a3d76b1e5f8b9e6f2b3d1";
const VALID_OU = "000000000000000000000456";

test("updateInvoiceStatus — returns INVALID_PARAM for malformed id", async () => {
  const result = await updateInvoiceStatus({
    id: "bad-id",
    status: "PAID",
    actor: "user1",
    ouId: VALID_OU,
    ifMatch: 'W/"dGVzdA=="',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "INVALID_PARAM");
});

test("updateInvoiceStatus — returns INVALID_PARAM for non-PAID status", async () => {
  const result = await updateInvoiceStatus({
    id: VALID_ID,
    status: "READY",
    actor: "user1",
    ouId: VALID_OU,
    ifMatch: 'W/"dGVzdA=="',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "INVALID_PARAM");
});

test("updateInvoiceStatus — returns PRECONDITION_REQUIRED when ifMatch is absent", async () => {
  const result = await updateInvoiceStatus({
    id: VALID_ID,
    status: "PAID",
    actor: "user1",
    ouId: VALID_OU,
    // no ifMatch
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "PRECONDITION_REQUIRED");
});

test("updateInvoiceStatus — returns PRECONDITION_REQUIRED when ifMatch is null", async () => {
  const result = await updateInvoiceStatus({
    id: VALID_ID,
    status: "PAID",
    actor: "user1",
    ouId: VALID_OU,
    ifMatch: null,
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "PRECONDITION_REQUIRED");
});

test("updateInvoiceStatus — returns INVALID_PARAM when ETag encodes a non-date string", async () => {
  // base64('test') = 'dGVzdA==' → decodes to 'test' → new Date('test') is Invalid Date
  const result = await updateInvoiceStatus({
    id: VALID_ID,
    status: "PAID",
    actor: "user1",
    ouId: VALID_OU,
    ifMatch: 'W/"dGVzdA=="',
  });
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "INVALID_PARAM");
});

test("updateInvoiceStatus — returns VERSION_CONFLICT when DB matchedCount is 0", async () => {
  const updDate = new Date("2025-01-01T00:00:00.000Z");
  const etag = `W/"${Buffer.from(updDate.toISOString()).toString("base64")}"`;

  const _repos = {
    invoice: {
      findById: async () => ({
        _id: VALID_ID,
        status: "READY",
        upd_date: updDate,
      }),
      updateStatus: async () => ({ matchedCount: 0 }),
    },
    masterData: {},
  };

  const result = await updateInvoiceStatus({
    id: VALID_ID,
    status: "PAID",
    actor: "user1",
    ouId: VALID_OU,
    ifMatch: etag,
    _repos,
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "VERSION_CONFLICT");
});

test("updateInvoiceStatus — transitions to VOID successfully from READY", async () => {
  const updDate = new Date("2025-01-01T00:00:00.000Z");
  const etag = `W/"${Buffer.from(updDate.toISOString()).toString("base64")}"`;

  const _repos = {
    invoice: {
      findById: async () => ({
        _id: VALID_ID,
        status: "READY",
        upd_date: updDate,
      }),
      updateStatus: async () => ({ matchedCount: 1 }),
      findDetailById: async () => ({
        _id: VALID_ID,
        ou_id: VALID_OU,
        branch_id: "000000000000000000000789",
        status: "VOID",
      }),
    },
    masterData: {
      findBranchDisplayName: async () => "Branch A",
      findOuDisplayName: async () => "OU A",
    },
  };

  const result = await updateInvoiceStatus({
    id: VALID_ID,
    status: "VOID",
    actor: "user1",
    ouId: VALID_OU,
    ifMatch: etag,
    _repos,
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.data.status, "VOID");
});
