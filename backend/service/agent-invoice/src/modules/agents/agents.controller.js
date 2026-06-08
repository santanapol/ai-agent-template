import * as service from './agents.service.js';

const generateETag = (dateISO) => `W/"${Buffer.from(dateISO).toString('base64')}"`;

const decodeETag = (etag) => {
  if (!etag) return null;
  const match = etag.match(/^W\/"([^"]+)"$/);
  if (!match) return null;
  return Buffer.from(match[1], 'base64').toString('utf8');
};

const extractContext = (request) => ({
  ouId: request.headers['x-user-ou'],
  branchId: request.headers['x-user-branch'], // although agents might not need branch_id for scope, keeping standard
  userId: request.headers['x-user-id'],
  requestId: request.requestId
});

const handleError = (error, reply, requestId) => {
  const statusMap = {
    400: 'INVALID_PARAM',
    404: 'RESOURCE_NOT_FOUND',
    409: 'DUPLICATE',
    412: 'VERSION_CONFLICT',
    428: 'PRECONDITION_REQUIRED',
    500: 'INTERNAL_ERROR'
  };

  if (error.statusCode && statusMap[error.statusCode]) {
    return reply.status(error.statusCode).send({
      success: false,
      code: statusMap[error.statusCode],
      message: error.message,
      data: null,
      requestId
    });
  }
  
  // Fallback to 500 for unhandled errors directly returned in endpoints like syncAgent
  if (!error.statusCode && error.message) {
      return reply.status(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
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

export const getAgentsHandler = async (request, reply) => {
  const { page, limit, search } = request.query;
  const { ouId } = extractContext(request);
  const db = request.server.db;

  const { agents, total } = await service.getAgents(db, ouId, search, page, limit);

  return reply.status(200).send({
    success: true,
    code: 'SUCCESS',
    message: 'Success.',
    data: agents,
    pagination: { page, limit, total }
  });
};

export const getAgentDetailHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const agent = await service.getAgentDetail(db, id, ouId);
    reply.header('ETag', generateETag(agent.upd_date.toISOString()));

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Success.',
      data: agent
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const createAgentHandler = async (request, reply) => {
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const result = await service.createAgent(db, ouId, request.body, userId);
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

export const updateAgentHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    const result = await service.updateAgent(db, id, ouId, request.body, updDateISO, userId);
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

export const deleteAgentHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
  const db = request.server.db;

  try {
    const updDateISO = extractUpdDateISO(request);
    const result = await service.softDeleteAgent(db, id, ouId, updDateISO, userId);
    reply.header('ETag', generateETag(result.upd_date));

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

export const syncAgentHandler = async (request, reply) => {
  const { ouId, userId, requestId } = extractContext(request);
  const { branch_id } = request.body;
  const db = request.server.db;
  const sourceDb = request.server.sourceDb;

  try {
    const result = await service.syncAgent(db, sourceDb, ouId, branch_id, userId);
    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Sync successful.',
      data: result
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};

export const getUnsyncedBranchesHandler = async (request, reply) => {
  const { ouId, requestId } = extractContext(request);
  const { includeInactive } = request.query;
  const db = request.server.db;
  const sourceDb = request.server.sourceDb;

  try {
    const unsynced = await service.getUnsyncedBranches(db, sourceDb, ouId, includeInactive);
    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Success.',
      data: unsynced
    });
  } catch (error) {
    return handleError(error, reply, requestId);
  }
};
