import { objectIdSchema } from "../../lib/object-id.js";

const billingMonthSchema = {
  type: "string",
  pattern: "^\\d{4}-(0[1-9]|1[0-2])$",
};

export const generateBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["month"],
  properties: {
    month: billingMonthSchema,
    branch_id: objectIdSchema,
  },
};

export const calculateFeeBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["iv_id", "action"],
  properties: {
    iv_id: objectIdSchema,
    action: { type: "string", enum: ["CALCULATE", "MISSING_FEE"] },
  },
};

export const getDetailParamsSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: objectIdSchema,
  },
};

/** Querystring values arrive as strings — format checks run in list-invoices.query.js */
const optionalQueryString = { type: "string" };

export const listInvoicesQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    page: optionalQueryString,
    limit: optionalQueryString,
    iv_no: optionalQueryString,
    branch_id: optionalQueryString,
    billing_month: optionalQueryString,
    status: optionalQueryString,
  },
};

export const updateStatusBodySchema = {
  type: "object",
  additionalProperties: false,
  required: ["status"],
  properties: {
    status: { type: "string", enum: ["PAID", "VOID"] },
  },
};

export const batchGetQuerySchema = {
  type: "object",
  additionalProperties: false,
  required: ["ids"],
  properties: {
    ids: { type: "string", minLength: 1 },
    include: { type: "string", enum: ["transactions"] },
  },
};
