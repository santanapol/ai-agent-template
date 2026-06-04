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
    if (error.statusCode === 400) {
      return reply.status(400).send({
        success: false,
        code: 'INVALID_PARAM',
        message: error.message,
        data: null,
        requestId
      });
    }
    throw error;
  }
};

export const updateAgentHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
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
    const result = await service.updateAgent(db, id, ouId, request.body, updDateISO, userId);
    reply.header('ETag', generateETag(result.upd_date));

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Updated successfully.',
      data: null
    });
  } catch (error) {
    if (error.statusCode === 400) {
      return reply.status(400).send({
        success: false,
        code: 'INVALID_PARAM',
        message: error.message,
        data: null,
        requestId
      });
    }
    if (error.statusCode === 412) {
      return reply.status(412).send({
        success: false,
        code: 'VERSION_CONFLICT',
        message: error.message,
        data: null,
        requestId
      });
    }
    throw error;
  }
};

export const deleteAgentHandler = async (request, reply) => {
  const { id } = request.params;
  const { ouId, userId, requestId } = extractContext(request);
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
    const result = await service.softDeleteAgent(db, id, ouId, updDateISO, userId);
    reply.header('ETag', generateETag(result.upd_date));

    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Deleted successfully.',
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
    throw error;
  }
};

export const syncAgentHandler = async (request, reply) => {
  const { ouId, userId, requestId } = extractContext(request);
  const { branch_id } = request.body;
  const db = request.server.db;

  try {
    const result = await service.syncAgent(db, ouId, branch_id, userId);
    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Sync successful.',
      data: result
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: error.message,
      data: null,
      requestId
    });
  }
};

export const getUnsyncedBranchesHandler = async (request, reply) => {
  const { ouId, requestId } = extractContext(request);
  const { includeInactive } = request.query;
  const db = request.server.db;

  try {
    const unsynced = await service.getUnsyncedBranches(db, ouId, includeInactive);
    return reply.status(200).send({
      success: true,
      code: 'SUCCESS',
      message: 'Success.',
      data: unsynced
    });
  } catch (error) {
    return reply.status(500).send({
      success: false,
      code: 'INTERNAL_ERROR',
      message: error.message,
      data: null,
      requestId
    });
  }
};
