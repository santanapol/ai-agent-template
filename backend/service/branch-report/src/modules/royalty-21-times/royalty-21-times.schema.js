import { CHANNEL_TYPES } from "../../lib/channel-filter.js";

const royalty21SharedQueryProperties = {
  channelType: {
    type: "string",
    enum: CHANNEL_TYPES,
  },
  regDateFrom: {
    type: "string",
    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  },
  regDateTo: {
    type: "string",
    pattern: "^\\d{4}-\\d{2}-\\d{2}$",
  },
  inviteLinkId: {
    type: "string",
    pattern: "^[0-9a-fA-F]{24}$",
  },
  referralUid: {
    type: "string",
    pattern: "^[0-9a-fA-F]{24}$",
  },
  referralUsername: {
    type: "string",
    minLength: 1,
    maxLength: 64,
  },
};

export const royalty21TimesQuerySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    required: ["channelType", "regDateFrom", "regDateTo"],
    properties: {
      ...royalty21SharedQueryProperties,
      page: { type: "integer", minimum: 1, default: 1 },
      pageSize: { type: "integer", minimum: 1, default: 50 },
    },
  },
  response: {
    200: {
      type: "object",
      required: [
        "success",
        "code",
        "message",
        "data",
        "pagination",
        "requestId",
      ],
      properties: {
        success: { type: "boolean", const: true },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "array",
          items: {
            type: "object",
            required: [
              "username",
              "register",
              "billin",
              "withdraw",
              "promotion",
              "revenue",
              "deposits",
            ],
            properties: {
              username: { type: "string" },
              register: { type: "string" },
              billin: { type: "number" },
              withdraw: { type: "number" },
              promotion: { type: "number" },
              revenue: { type: "number" },
              deposits: {
                type: "array",
                minItems: 21,
                maxItems: 21,
                items: { type: "number" },
              },
            },
          },
        },
        pagination: {
          type: "object",
          required: ["page", "pageSize", "total"],
          properties: {
            page: { type: "integer" },
            pageSize: { type: "integer" },
            total: { type: "integer" },
          },
        },
        requestId: { type: "string" },
      },
    },
  },
};

export const royalty21DepositMatrixQuerySchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    required: ["channelType", "regDateFrom", "regDateTo"],
    properties: {
      ...royalty21SharedQueryProperties,
    },
  },
  response: {
    200: {
      type: "object",
      required: ["success", "code", "message", "data", "requestId"],
      properties: {
        success: { type: "boolean", const: true },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "object",
          required: [
            "buckets",
            "rounds",
            "counts",
            "rowSums",
            "percents",
            "percentRowSums",
          ],
          properties: {
            buckets: {
              type: "array",
              items: {
                type: "object",
                required: ["key", "label", "min", "max"],
                properties: {
                  key: { type: "string" },
                  label: { type: "string" },
                  min: { type: "number" },
                  // null = no upper bound (the "10,000+" bucket); JSON has no
                  // Infinity, so the unbounded top bucket serializes as null.
                  max: { type: ["number", "null"] },
                },
              },
            },
            rounds: { type: "integer", const: 21 },
            counts: {
              type: "array",
              minItems: 9,
              maxItems: 9,
              items: {
                type: "array",
                minItems: 21,
                maxItems: 21,
                items: { type: "number" },
              },
            },
            rowSums: {
              type: "array",
              minItems: 9,
              maxItems: 9,
              items: { type: "number" },
            },
            percents: {
              type: "array",
              minItems: 9,
              maxItems: 9,
              items: {
                type: "array",
                minItems: 21,
                maxItems: 21,
                items: { type: "number" },
              },
            },
            percentRowSums: {
              type: "array",
              minItems: 9,
              maxItems: 9,
              items: { type: "number" },
            },
          },
        },
        requestId: { type: "string" },
      },
    },
  },
};
