const itemIdPattern = "^[0-9a-fA-F]{24}$";

export const listSchema = {
  querystring: {
    type: "object",
    properties: {
      page: { type: "integer", minimum: 1, default: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
    },
    additionalProperties: false,
  },
};

const createBodyProps = {
  code: { type: "string", pattern: "^[A-Z0-9_-]{3,30}$" },
  name: { type: "string", minLength: 1, maxLength: 120 },
  description: { type: ["string", "null"], maxLength: 500, default: null },
  status: { type: "string", enum: ["draft", "active", "inactive"] },
  tags: {
    type: "array",
    items: { type: "string", minLength: 1, maxLength: 30 },
    maxItems: 10,
    uniqueItems: true,
    default: [],
  },
};

export const createSchema = {
  body: {
    type: "object",
    properties: createBodyProps,
    required: ["code", "name", "status"],
    additionalProperties: false,
  },
};

export const detailSchema = {
  params: {
    type: "object",
    properties: {
      itemId: { type: "string", pattern: itemIdPattern },
    },
    required: ["itemId"],
    additionalProperties: false,
  },
};

export const replaceSchema = {
  params: detailSchema.params,
  body: {
    type: "object",
    properties: {
      ...createBodyProps,
      description: { type: ["string", "null"], maxLength: 500 },
      tags: {
        type: "array",
        items: { type: "string", minLength: 1, maxLength: 30 },
        maxItems: 10,
        uniqueItems: true,
      },
    },
    required: ["code", "name", "description", "status", "tags"],
    additionalProperties: false,
  },
};

export const patchSchema = {
  params: detailSchema.params,
  body: {
    type: "object",
    properties: {
      name: { type: "string", minLength: 1, maxLength: 120 },
      description: { type: ["string", "null"], maxLength: 500 },
      status: { type: "string", enum: ["draft", "active", "inactive"] },
      tags: {
        type: "array",
        items: { type: "string", minLength: 1, maxLength: 30 },
        maxItems: 10,
        uniqueItems: true,
      },
    },
    minProperties: 1,
    additionalProperties: false,
  },
};

export const removeSchema = {
  params: detailSchema.params,
};
