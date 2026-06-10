export const userIdParamSchema = {
  type: 'object',
  properties: {
    user_id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' }
  },
  required: ['user_id']
}

export const revokeBodySchema = {
  type: 'object',
  properties: {
    reason: { type: 'string', maxLength: 256 },
    correlation_id: { type: 'string', maxLength: 128 }
  },
  additionalProperties: false
}

export const createUserBodySchema = {
  type: 'object',
  properties: {
    ou_id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
    branch_id: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
    username: { type: 'string', minLength: 1, maxLength: 256 },
    password: { type: 'string', minLength: 8, maxLength: 256, pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$' },
    role: { type: 'string', minLength: 1, maxLength: 64, default: 'staff' }
  },
  required: ['ou_id', 'branch_id', 'username', 'password'],
  additionalProperties: false
}

export const setPasswordBodySchema = {
  type: 'object',
  properties: {
    password: { type: 'string', minLength: 8, maxLength: 256, pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).+$' },
    revoke_sessions: { type: 'boolean', default: true },
    reason: { type: 'string', maxLength: 256 },
    correlation_id: { type: 'string', maxLength: 128 }
  },
  required: ['password'],
  additionalProperties: false
}
