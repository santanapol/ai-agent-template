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

export const getFeesHandler = async (request, reply) => {
  const { agentId } = request.params;
  const { page, limit } = request.query;
  const { ouId, branchId } = extractContext(request);
  const db = request.server.db;

  const { fees, total } = await service.getFeesByAgentId(db, agentId, ouId, branchId, page, limit);

  return reply.status(200).send({
    success: true,
    code: 'SUCCESS',
    message: 'Success.',
    data: fees,
    pagination: { page, limit, total }
  });
};

export const createFeeHandler = async (request, reply) => {
  const { agentId } = request.params;
  const { ouId, branchId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const result = await service.createFeeByAgentId(db, agentId, ouId, branchId, request.body, userId);
    reply.header('ETag', generateETag(result.upd_date));

    return reply.status(201).send({
      success: true,
      code: 'CREATED',
      message: 'Resource created successfully.',
      data: { insertedId: result.insertedId.toString() }
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return reply.status(409).send({
        success: false,
        code: 'DUPLICATE',
        message: error.message,
        data: null,
        requestId
      });
    }
    throw error;
  }
};

export const updateFeeHandler = async (request, reply) => {
  const { agentId, feeId } = request.params;
  const { ouId, branchId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  const ifMatch = request.headers['if-match'];
  if (!ifMatch) {
    return reply.status(428).send({
      success: false,
      code: 'PRECONDITION_REQUIRED',
      message: 'If-Match header is required for this operation.',
      data: null,
      requestId
    });
  }

  const updDateISO = decodeETag(ifMatch);
  if (!updDateISO) {
    return reply.status(400).send({
      success: false,
      code: 'INVALID_PARAM',
      message: 'Invalid If-Match ETag format.',
      data: null,
      requestId
    });
  }

  try {
    const result = await service.updateFeeByAgentId(
      db, agentId, feeId, ouId, branchId, request.body.fee_rate, updDateISO, userId
    );
    reply.header('ETag', generateETag(result.upd_date));

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Updated successfully.',
      data: null
    });
  } catch (error) {
    if (error.statusCode === 412) {
      return reply.status(412).send({
        success: false,
        code: 'VERSION_CONFLICT',
        message: error.message,
        data: null,
        requestId
      });
    }
    if (error.statusCode === 404) {
      return reply.status(404).send({
        success: false,
        code: 'RESOURCE_NOT_FOUND',
        message: error.message,
        data: null,
        requestId
      });
    }
    throw error;
  }
};

export const deleteFeeHandler = async (request, reply) => {
  const { agentId, feeId } = request.params;
  const { ouId, branchId, requestId } = extractContext(request);
  const db = request.server.db;

  const ifMatch = request.headers['if-match'];
  if (!ifMatch) {
    return reply.status(428).send({
      success: false,
      code: 'PRECONDITION_REQUIRED',
      message: 'If-Match header is required for this operation.',
      data: null,
      requestId
    });
  }

  try {
    await service.deleteFeeByAgentId(db, agentId, feeId, ouId, branchId);

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Deleted successfully.',
      data: null
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return reply.status(404).send({
        success: false,
        code: 'RESOURCE_NOT_FOUND',
        message: error.message,
        data: null,
        requestId
      });
    }
    throw error;
  }
};
