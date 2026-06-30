export const inviteLinksListSchema = {
  response: {
    200: {
      type: 'object',
      required: ['success', 'code', 'message', 'data', 'requestId'],
      properties: {
        success: { type: 'boolean', const: true },
        code: { type: 'string' },
        message: { type: ['string', 'null'] },
        data: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'inviteCode', 'username', 'description'],
            properties: {
              id: { type: 'string' },
              inviteCode: { type: 'string' },
              username: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
        requestId: { type: 'string' },
      },
    },
  },
};
