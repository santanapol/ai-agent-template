export const inviteLinksListQuerySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    q: { type: "string", minLength: 1, maxLength: 64 },
    limit: { type: "integer", minimum: 1, maximum: 250 },
  },
};

export const inviteLinksListSchema = {
  querystring: inviteLinksListQuerySchema,
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
            required: ["id", "inviteCode", "username", "description"],
            properties: {
              id: { type: "string" },
              inviteCode: { type: "string" },
              username: { type: "string" },
              description: { type: "string" },
            },
          },
        },
        requestId: { type: "string" },
      },
    },
  },
};
