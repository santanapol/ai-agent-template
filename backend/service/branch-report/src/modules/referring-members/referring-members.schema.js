export const referringMembersListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    username: { type: "string", minLength: 1, maxLength: 64 },
  },
  required: ["username"],
};

export const referringMembersListSchema = {
  querystring: referringMembersListQuerySchema,
  response: {
    200: {
      type: "object",
      required: ["success", "code", "message", "data", "requestId"],
      properties: {
        success: { type: "boolean", const: true },
        code: { type: "string" },
        message: { type: ["string", "null"] },
        data: {
          type: "array",
          items: {
            type: "object",
            required: ["id", "username"],
            properties: {
              id: { type: "string" },
              username: { type: "string" },
            },
          },
        },
        requestId: { type: "string" },
      },
    },
  },
};
