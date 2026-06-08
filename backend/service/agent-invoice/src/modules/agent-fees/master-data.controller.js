import * as repo from './master-data.repository.js';

export const getGameCompaniesHandler = async (request, reply) => {
  try {
    const { ou_id } = request.query;
    const data = await repo.getGameCompanies(ou_id);
    return {
      success: true,
      code: 'SUCCESS',
      message: 'Fetched game companies',
      data,
      requestId: request.requestId,
    };
  } catch (err) {
    request.log.error(err);
    throw err;
  }
};

export const getGameCategoriesHandler = async (request, reply) => {
  try {
    const { ou_id } = request.query;
    const data = await repo.getGameCategories(ou_id);
    return {
      success: true,
      code: 'SUCCESS',
      message: 'Fetched game categories',
      data,
      requestId: request.requestId,
    };
  } catch (err) {
    request.log.error(err);
    throw err;
  }
};
