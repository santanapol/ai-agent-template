export const loginBodySchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 1, maxLength: 256 },
    password: { type: 'string', minLength: 1, maxLength: 4096 },
    client_kind: { type: 'string', enum: ['web', 'native'], default: 'web' }
  },
  required: ['username', 'password'],
  additionalProperties: false
}

export const refreshBodySchema = {
  type: 'object',
  properties: {
    refresh_token: { type: 'string', minLength: 10, maxLength: 512 }
  },
  additionalProperties: true
}

export const logoutBodySchema = refreshBodySchema

export const changeOwnPasswordBodySchema = {
  type: 'object',
  properties: {
    current_password: { type: 'string', minLength: 1, maxLength: 4096 },
    new_password: { type: 'string', minLength: 16, maxLength: 256 }
  },
  required: ['current_password', 'new_password'],
  additionalProperties: false
}
