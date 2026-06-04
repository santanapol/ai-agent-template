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

const agentResponseObj = {
  type: 'object',
  properties: {
    _id: { type: 'string' },
    ou_id: { type: 'string' },
    branch_id: { type: 'string' },
    branch_code: { type: 'string' },
    branch_name: { type: 'string' },
    branch_type: { type: 'string' },
    branch_desc: { type: 'string' },
    parent_branch_id: { type: 'string' },
    currency: { type: 'string' },
    default_fee_rate: { type: 'number' },
    active: { type: 'boolean' },
    cr_by: { type: 'string' },
    cr_date: { type: 'string' },
    cr_prog: { type: 'string' },
    upd_by: { type: 'string' },
    upd_date: { type: 'string' },
    upd_prog: { type: 'string' }
  }
};

export const getAgentsSchema = {
  description: 'Get all agents with pagination',
  tags: ['agents'],
  headers: trustedHeaders,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'number', minimum: 1, default: 1 },
      limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
      search: { type: 'string' }
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
          items: agentResponseObj
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

export const getAgentDetailSchema = {
  description: 'Get detail of an agent (returns ETag)',
  tags: ['agents'],
  headers: trustedHeaders,
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  },
  response: {
    200: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        code: { type: 'string' },
        message: { type: 'string' },
        data: agentResponseObj
      }
    },
    '4xx': errorResponse,
    '5xx': errorResponse
  }
};

export const createAgentSchema = {
  description: 'Create a new agent',
  tags: ['agents'],
  headers: trustedHeaders,
  body: {
    type: 'object',
    required: ['branch_code', 'branch_name', 'branch_type', 'currency'],
    properties: {
      branch_code: { type: 'string' },
      branch_name: { type: 'string' },
      branch_type: { type: 'string', enum: ['vip', 'affiliate'] },
      branch_desc: { type: 'string' },
      parent_branch_id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      currency: { type: 'string' },
      default_fee_rate: { type: 'number', minimum: 0, maximum: 100 }
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

export const updateAgentSchema = {
  description: 'Update agent details with optimistic locking via If-Match header',
  tags: ['agents'],
  headers: {
    ...trustedHeaders,
    properties: {
      ...trustedHeaders.properties,
      'if-match': { type: 'string' }
    }
  },
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  },
  body: {
    type: 'object',
    properties: {
      branch_name: { type: 'string' },
      branch_type: { type: 'string', enum: ['vip', 'affiliate'] },
      branch_desc: { type: 'string' },
      parent_branch_id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' },
      currency: { type: 'string' },
      default_fee_rate: { type: 'number', minimum: 0, maximum: 100 }
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

export const deleteAgentSchema = {
  description: 'Soft delete an agent (requires If-Match for optimistic lock)',
  tags: ['agents'],
  headers: {
    ...trustedHeaders,
    properties: {
      ...trustedHeaders.properties,
      'if-match': { type: 'string' }
    }
  },
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
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

export const syncAgentSchema = {
  description: 'Sync 1 branch from source gpp_777ww.su_branch',
  tags: ['agents'],
  headers: trustedHeaders,
  body: {
    type: 'object',
    required: ['branch_id'],
    properties: {
      branch_id: { type: 'string' }
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
          type: 'object',
          properties: {
            syncedId: { type: 'string' }
          }
        }
      }
    },
    '4xx': errorResponse,
    '5xx': errorResponse
  }
};

export const getUnsyncedBranchesSchema = {
  description: 'Get branches that are not yet synced',
  tags: ['agents'],
  headers: trustedHeaders,
  querystring: {
    type: 'object',
    properties: {
      includeInactive: { type: 'boolean', default: false }
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
              branch_id: { type: 'string' },
              branch_code: { type: 'string' },
              branch_name: { type: 'string' },
              active: { type: 'boolean' }
            }
          }
        }
      }
    },
    '5xx': errorResponse
  }
};
