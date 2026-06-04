import * as controller from './master-data.controller.js';

export default async function masterDataRoute(fastify, options) {
  fastify.get('/game-companies', controller.getGameCompaniesHandler);
  fastify.get('/game-categories', controller.getGameCategoriesHandler);
}
