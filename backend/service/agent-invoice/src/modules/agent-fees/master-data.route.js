import * as controller from './master-data.controller.js';

const ouIdQuerySchema = {
  querystring: {
    type: 'object',
    properties: {
      ou_id: { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
    }
  }
};

export default async function masterDataRoute(fastify, options) {
  fastify.get('/game-companies', { schema: ouIdQuerySchema }, controller.getGameCompaniesHandler);
  fastify.get('/game-categories', { schema: ouIdQuerySchema }, controller.getGameCategoriesHandler);
}
