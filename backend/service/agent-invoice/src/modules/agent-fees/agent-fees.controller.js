import * as service from './agent-fees.service.js';

const generateETag = (dateISO) => `W/"${Buffer.from(dateISO).toString('base64')}"`;

const decodeETag = (etag) => {
  if (!etag) return null;
  const match = etag.match(/^W\/"([^"]+)"$/);
  if (!match) return null;
  return Buffer.from(match[1], 'base64').toString('utf8');
};

const extractContext = (request) => ({
  ouId: request.headers['x-user-ou'],
  branchId: request.headers['x-user-branch'],
  userId: request.headers['x-user-id'],
  requestId: request.requestId
});

const handleError = (error, reply, requestId) => {
  const statusMap = {
    400: 'INVALID_PARAM',
    404: 'RESOURCE_NOT_FOUND',
    409: 'DUPLICATE',
    412: 'VERSION_CONFLICT',
    428: 'PRECONDITION_REQUIRED'
  };

  if (statusMap[error.statusCode]) {
    return reply.status(error.statusCode).send({
      success: false,
      code: statusMap[error.statusCode],
      message: error.message,
      data: null,
      requestId
    });
  }
  throw error;
};

const extractUpdDateISO = (request) => {
  const ifMatch = request.headers['if-match'];
  if (!ifMatch) {
    const error = new Error('If-Match header is required for this operation.');
    error.statusCode = 428;
    throw error;
  }
  const updDateISO = decodeETag(ifMatch);
  if (!updDateISO) {
    const error = new Error('Invalid If-Match ETag format.');
    error.statusCode = 400;
    throw error;
  }
  return updDateISO;
};

export const getFeesHandler = async (request, reply) => {
  const { agentId } = request.params;
  const { page, limit } = request.query;
  const { ouId } = extractContext(request);
  const db = request.server.db;
  const requestId = request.requestId;

  try {
    const { fees, total } = await service.getFeesByAgentId(db, agentId, ouId, page, limit);

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Success.',
      data: fees,
      pagination: { page, limit, total }
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const createFeeHandler = async (request, reply) => {
  const { agentId } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const result = await service.createFeeByAgentId(db, agentId, ouId, request.body, userId);
    reply.header('ETag', generateETag(result.upd_date));

    return reply.status(201).send({
      success: true,
      code: 'CREATED',
      message: 'Resource created successfully.',
      data: { insertedId: result.insertedId.toString() }
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const updateFeeHandler = async (request, reply) => {
  const { agentId, feeId } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    const result = await service.updateFeeByAgentId(
      db, agentId, feeId, ouId, request.body, updDateISO, userId
    );
    reply.header('ETag', generateETag(result.upd_date));

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Updated successfully.',
      data: null
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const deleteFeeHandler = async (request, reply) => {
  const { agentId, feeId } = request.params;
  const { ouId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    await service.deleteFeeByAgentId(db, agentId, feeId, ouId, updDateISO);

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Deleted successfully.',
      data: null
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};
