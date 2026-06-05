const trustedHeaders = {
  type: 'object',
  properties: {
    'x-gateway-secret': { type: 'string' },
    'x-user-ou': { type: 'string' },
    'x-user-branch': { type: 'string' },
    'x-user-id': { type: 'string' },
    'x-user-role': { type: 'string' },
    'x-request-id': { type: 'string' }
  }
};

const errorResponse = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    code: { type: 'string' },
    message: { type: 'string' },
    data: { type: 'null' },
    requestId: { type: 'string' }
  }
};

export const getFeesSchema = {
  description: 'Get all fee overrides for a specific agent with pagination',
  tags: ['agent-fees'],
  headers: trustedHeaders,
  params: {
    type: 'object',
    required: ['agentId'],
    properties: {
      agentId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 1000, default: 20 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              ou_id: { type: 'string' },
              branch_id: { type: 'string' },
              game_company_id: { type: 'string' },
              game_main_cate_id: { type: 'string' },
              gcomp_cost: { type: 'number' },
              agent_known_fee: { type: 'number' },
              agent_fee: { type: 'number' },
              cr_by: { type: 'string' },
              cr_date: { type: 'string' },
              cr_prog: { type: 'string' },
              upd_by: { type: 'string' },
              upd_date: { type: 'string' },
              upd_prog: { type: 'string' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' }
          }
        }
      }
    },
    '4xx': errorResponse,
    '5xx': errorResponse
  }
};

export const createFeeSchema = {
  description: 'Create a new fee override for an agent',
  tags: ['agent-fees'],
  headers: trustedHeaders,
  params: {
    type: 'object',
    required: ['agentId'],
    properties: {
      agentId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  },
  body: {
    type: 'object',
    required: ['game_company_id', 'game_main_cate_id', 'agent_known_fee', 'agent_fee'],
    properties: {
      game_company_id: { type: 'string' },
      game_main_cate_id: { type: 'string' },
      gcomp_cost: { type: 'number', minimum: 0, maximum: 100 },
      agent_known_fee: { type: 'number', minimum: 0, maximum: 100 },
      agent_fee: { type: 'number', minimum: 0, maximum: 100 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            insertedId: { type: 'string' }
          }
        }
      }
    },
    '4xx': errorResponse,
    '5xx': errorResponse
  }
};

export const updateFeeSchema = {
  description: 'Update fee_rate with optimistic locking via If-Match header',
  tags: ['agent-fees'],
  headers: {
    ...trustedHeaders,
    properties: {
      ...trustedHeaders.properties,
      'if-match': { type: 'string' }
    }
  },
  params: {
    type: 'object',
    required: ['agentId', 'feeId'],
    properties: {
      agentId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      feeId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  },
  body: {
    type: 'object',
    minProperties: 1,
    properties: {
      gcomp_cost: { type: 'number', minimum: 0, maximum: 100 },
      agent_known_fee: { type: 'number', minimum: 0, maximum: 100 },
      agent_fee: { type: 'number', minimum: 0, maximum: 100 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string' },
        message: { type: 'string' },
        data: { type: 'null' }
      }
    },
    '4xx': errorResponse,
    '5xx': errorResponse
  }
};

export const deleteFeeSchema = {
  description: 'Hard delete a fee override (requires If-Match for optimistic lock)',
  tags: ['agent-fees'],
  headers: {
    ...trustedHeaders,
    properties: {
      ...trustedHeaders.properties,
      'if-match': { type: 'string' }
    }
  },
  params: {
    type: 'object',
    required: ['agentId', 'feeId'],
    properties: {
      agentId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      feeId: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string' },
        message: { type: 'string' },
        data: { type: 'null' }
      }
    },
    '4xx': errorResponse,
    '5xx': errorResponse
  }
};
