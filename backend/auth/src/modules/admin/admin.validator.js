export const menuKeyParamSchema = {
  type: 'object',
  properties: {
    key: { type: 'string', minLength: 1, maxLength: 256 }
  },
  required: ['key']
}

export const createMenuBodySchema = {
  type: 'object',
  properties: {
    key: { type: 'string', minLength: 1, maxLength: 256 },
    label: { type: 'string', minLength: 1, maxLength: 256 },
    type: { type: 'string', enum: ['menu', 'action'] },
    parent_key: { type: ['string', 'null'], maxLength: 256 },
    sort_order: { type: 'integer', minimum: 0 }
  },
  required: ['key', 'label', 'type', 'parent_key', 'sort_order'],
  additionalProperties: false
}

export const updateMenuBodySchema = {
  type: 'object',
  properties: {
    label: { type: 'string', minLength: 1, maxLength: 256 },
    parent_key: { type: ['string', 'null'], maxLength: 256 },
    sort_order: { type: 'integer', minimum: 0 }
  },
  additionalProperties: false
}

export const rolePermissionParamsSchema = {
  type: 'object',
  properties: {
    ou_id: { type: 'string', minLength: 1, maxLength: 256 },
    role: { type: 'string', minLength: 1, maxLength: 256 }
  },
  required: ['ou_id', 'role']
}

export const getRolePermissionsQuerySchema = {
  type: 'object',
  properties: {
    ou_id: { type: 'string', maxLength: 256 },
    role: { type: 'string', maxLength: 256 }
  },
  additionalProperties: false
}

export const upsertRolePermissionBodySchema = {
  type: 'object',
  properties: {
    menu_keys: {
      type: 'array',
      items: { type: 'string', minLength: 1, maxLength: 256 }
    },
    revoke_sessions: { type: 'boolean', default: false }
  },
  required: ['menu_keys'],
  additionalProperties: false
}
