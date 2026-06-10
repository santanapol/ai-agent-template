const objectIdPattern = "^[a-fA-F0-9]{24}$";

export const profileIdParamsSchema = {
  type: "object",
  required: ["profileId"],
  additionalProperties: false,
  properties: {
    profileId: { type: "string", pattern: objectIdPattern },
  },
};

export const lookupProfilesQuerySchema = {
  type: "object",
  required: ["user_id"],
  additionalProperties: false,
  properties: {
    user_id: { type: "string", pattern: objectIdPattern },
  },
};

/** GET /profiles — Fastify route schema (lookup uses runtime exclusivity check). */
export const listOrLookupProfilesSchema = {
  querystring: {
    type: "object",
    additionalProperties: false,
    properties: {
      user_id: { type: "string", pattern: objectIdPattern },
      status: {
        type: "string",
        enum: ["active", "archived", "all"],
      },
      branch_id: { type: "string", pattern: objectIdPattern },
      q: { type: "string", maxLength: 64 },
      sort: {
        type: "string",
        pattern: "^-?(code|firstname|lastname|upd_date)$",
      },
      page: { type: "integer", minimum: 1 },
      limit: { type: "integer", minimum: 1, maximum: 100 },
    },
  },
};

export const getProfileByIdSchema = {
  params: profileIdParamsSchema,
};

const profileContactFields = {
  code: { type: "string", minLength: 1, maxLength: 32 },
  firstname: { type: "string", minLength: 1, maxLength: 128 },
  lastname: { type: "string", minLength: 1, maxLength: 128 },
  email: { type: "string", minLength: 6, maxLength: 254 },
  tel: { type: "string", minLength: 4, maxLength: 16 },
};

export const createProfileBodySchema = {
  type: "object",
  required: ["code", "firstname", "lastname", "email", "tel"],
  additionalProperties: false,
  properties: {
    ...profileContactFields,
    user_id: { type: "string", pattern: objectIdPattern },
    username: { type: "string", minLength: 1, maxLength: 128 },
    password: { type: "string", minLength: 8, maxLength: 256, pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$" },
  },
};

export const createProfileSchema = {
  body: createProfileBodySchema,
};

export const patchProfileSchema = {
  params: profileIdParamsSchema,
  body: {
    type: "object",
    additionalProperties: false,
    minProperties: 1,
    properties: profileContactFields,
  },
};

export const adminPasswordSchema = {
  params: profileIdParamsSchema,
  body: {
    type: "object",
    required: ["password"],
    additionalProperties: false,
    properties: {
      password: { type: "string", minLength: 8, maxLength: 256, pattern: "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$" },
      revoke_sessions: { type: "boolean", default: true },
    },
  },
};

export const lifecycleActionSchema = {
  params: profileIdParamsSchema,
};
