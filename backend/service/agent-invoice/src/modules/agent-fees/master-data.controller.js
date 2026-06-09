import { extractContext } from '../../lib/request-handler.js';
import { INTERNAL_ERROR_MESSAGE } from '../../lib/response.js';
import * as repo from './master-data.repository.js';

export const getGameCompaniesHandler = async (request, reply) => {
  try {
    const { ouId } = extractContext(request);
    const data = await repo.getGameCompanies(ouId);

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Fetched game companies.',
      data,
      requestId: request.requestId,
    });
  } catch (err) {
    request.log.error({ err }, 'getGameCompaniesHandler: unhandled error');

    return reply.status(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: INTERNAL_ERROR_MESSAGE,
      data: null,
      requestId: request.requestId,
    });
  }
};

export const getGameCategoriesHandler = async (request, reply) => {
  try {
    const { ouId } = extractContext(request);
    const data = await repo.getGameCategories(ouId);

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Fetched game categories.',
      data,
      requestId: request.requestId,
    });
  } catch (err) {
    request.log.error({ err }, 'getGameCategoriesHandler: unhandled error');

    return reply.status(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: INTERNAL_ERROR_MESSAGE,
      data: null,
      requestId: request.requestId,
    });
  }
};
