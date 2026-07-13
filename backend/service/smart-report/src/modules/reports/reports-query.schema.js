const paginatedListQuery = (extraProperties = {}) => ({
  type: "object",
  properties: {
    page: { type: "integer", minimum: 1, default: 1 },
    limit: { type: "integer", minimum: 1, maximum: 200, default: 20 },
    ...extraProperties,
  },
});

export const listReportsQuery = paginatedListQuery({
  q: { type: "string", maxLength: 64 },
  enabled: { type: "boolean" },
  schedule: { type: "string", enum: ["manual", "daily", "weekly", "monthly"] },
});

export const historyQuery = paginatedListQuery({
  reportId: { type: "string", pattern: "^[a-fA-F0-9]{24}$" },
});
