export const getFeesSchema = {
  description: 'Get all fees overrides for a specific agent with pagination',
  tags: ['Agent Fees'],
  params: {
    type: 'object',
    required: ['agentId'],
    properties: {
      agentId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$'
      }
    }
  },
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              _id: { type: 'string' },
              agent_id: { type: 'string' },
              company_id: { type: 'string' },
              main_cate_id: { type: 'string' },
              platform_name: { type: 'string' },
              game_provider: { type: 'string' },
              game_category: { type: 'string' },
              fee_rate: { type: 'number' },
              cr_by: { type: 'string' },
              cr_date: { type: 'string' },
              cr_prog: { type: 'string' },
              upd_by: { type: 'string' },
              upd_date: { type: 'string' },
              upd_prog: { type: 'string' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' }
          }
        }
      }
    }
  }
};

export const createFeeSchema = {
  description: 'Create a new fee override for an agent',
  tags: ['Agent Fees'],
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string' }
    }
  },
  params: {
    type: 'object',
    required: ['agentId'],
    properties: {
      agentId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$'
      }
    }
  },
  body: {
    type: 'object',
    required: ['company_id', 'main_cate_id', 'fee_rate'],
    properties: {
      company_id: { type: 'string' },
      main_cate_id: { type: 'string' },
      platform_name: { type: 'string' },
      game_provider: { type: 'string' },
      game_category: { type: 'string' },
      fee_rate: { type: 'number', minimum: 0, maximum: 100 }
    }
  },
  response: {
    201: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            insertedId: { type: 'string' }
          }
        }
      }
    }
  }
};

export const updateFeeSchema = {
  description: 'Update fee_rate with optimistic locking via If-Match header',
  tags: ['Agent Fees'],
  headers: {
    type: 'object',
    properties: {
      'if-match': { type: 'string' },
      'x-user-id': { type: 'string' }
    }
  },
  params: {
    type: 'object',
    required: ['agentId', 'feeId'],
    properties: {
      agentId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$'
      },
      feeId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$'
      }
    }
  },
  body: {
    type: 'object',
    required: ['fee_rate'],
    properties: {
      fee_rate: { type: 'number', minimum: 0, maximum: 100 }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        statusCode: { type: 'number' },
        message: { type: 'string' }
      }
    }
  }
};

export const deleteFeeSchema = {
  description: 'Hard delete a fee override',
  tags: ['Agent Fees'],
  headers: {
    type: 'object',
    properties: {
      'x-user-id': { type: 'string' }
    }
  },
  params: {
    type: 'object',
    required: ['agentId', 'feeId'],
    properties: {
      agentId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$'
      },
      feeId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$'
      }
    }
  },
  response: {
    204: {
      type: 'null',
      description: 'Successfully deleted (No Content)'
    }
  }
};
