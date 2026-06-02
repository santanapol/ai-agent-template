export const getFeesSchema = {
  description: 'Get all fees overrides for a specific agent',
  tags: ['Agent Fees'],
  params: {
    type: 'object',
    required: ['agentId'],
    properties: {
      agentId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$', // MongoDB ObjectId format
        description: 'The Agent ID'
      }
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
        }
      }
    }
  }
};
