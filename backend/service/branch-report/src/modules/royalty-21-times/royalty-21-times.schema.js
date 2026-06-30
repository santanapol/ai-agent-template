import { CHANNEL_TYPES } from '../../lib/channel-filter.js';

export const royalty21TimesQuerySchema = {
  querystring: {
    type: 'object',
    required: ['channelType', 'regDateFrom', 'regDateTo'],
    properties: {
      channelType: {
        type: 'string',
        enum: CHANNEL_TYPES,
      },
      regDateFrom: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      regDateTo: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      },
      inviteLinkId: {
        type: 'string',
        pattern: '^[0-9a-fA-F]{24}$',
      },
      page: { type: 'integer', minimum: 1, default: 1 },
      pageSize: { type: 'integer', minimum: 1, default: 50 },
    },
  },
  response: {
    200: {
      type: 'object',
      required: ['success', 'code', 'message', 'data', 'pagination', 'requestId'],
      properties: {
        success: { type: 'boolean', const: true },
        code: { type: 'string' },
        message: { type: ['string', 'null'] },
        data: {
          type: 'array',
          items: {
            type: 'object',
            required: [
              'username',
              'register',
              'billin',
              'withdraw',
              'promotion',
              'revenue',
              'deposits',
            ],
            properties: {
              username: { type: 'string' },
              register: { type: 'string' },
              billin: { type: 'number' },
              withdraw: { type: 'number' },
              promotion: { type: 'number' },
              revenue: { type: 'number' },
              deposits: {
                type: 'array',
                minItems: 21,
                maxItems: 21,
                items: { type: 'number' },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          required: ['page', 'pageSize', 'total'],
          properties: {
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            total: { type: 'integer' },
          },
        },
        requestId: { type: 'string' },
      },
    },
  },
};
