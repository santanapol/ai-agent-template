import * as service from './agent-fees.service.js';

// Helper for ETag (base64 of iso string)
const generateETag = (dateISO) => {
  const base64 = Buffer.from(dateISO).toString('base64');
  return `W/"${base64}"`;
};

const decodeETag = (etag) => {
  if (!etag) return null;
  const match = etag.match(/^W\/"([^"]+)"$/);
  if (!match) return null;
  return Buffer.from(match[1], 'base64').toString('ascii');
};

export const getFeesHandler = async (request, reply) => {
  try {
    const { agentId } = request.params;
    const { page, limit } = request.query;
    const db = request.server.db;
    
    const { fees, total } = await service.getFeesByAgentId(db, agentId, page, limit);
    
    return reply.status(200).send({
      statusCode: 200,
      message: 'Success',
      data: fees,
      meta: {
        page,
        limit,
        total
      }
    });
  } catch (error) {
    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

export const createFeeHandler = async (request, reply) => {
  try {
    const { agentId } = request.params;
    const db = request.server.db;
    const userId = request.headers['x-user-id'] || 'system';

    const result = await service.createFeeByAgentId(db, agentId, request.body, userId);
    
    // Add ETag to response
    reply.header('ETag', generateETag(result.upd_date));
    
    return reply.status(201).send({
      statusCode: 201,
      message: 'Created Successfully',
      data: {
        insertedId: result.insertedId.toString()
      }
    });
  } catch (error) {
    if (error.statusCode) {
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: error.message,
        message: error.message
      });
    }
    
    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

export const updateFeeHandler = async (request, reply) => {
  try {
    const { agentId, feeId } = request.params;
    const db = request.server.db;
    const userId = request.headers['x-user-id'] || 'system';
    
    const ifMatch = request.headers['if-match'];
    if (!ifMatch) {
      return reply.status(428).send({
        statusCode: 428,
        error: 'Precondition Required',
        message: 'If-Match header is required'
      });
    }

    const updDateISO = decodeETag(ifMatch);
    if (!updDateISO) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid If-Match ETag format'
      });
    }

    const { fee_rate } = request.body;
    const result = await service.updateFeeByAgentId(db, agentId, feeId, fee_rate, updDateISO, userId);
    
    reply.header('ETag', generateETag(result.upd_date));
    
    return reply.status(200).send({
      statusCode: 200,
      message: 'Updated Successfully'
    });
  } catch (error) {
    if (error.statusCode) {
      const errorTitle = error.statusCode === 412 ? 'Precondition Failed' : 'Conflict';
      return reply.status(error.statusCode).send({
        statusCode: error.statusCode,
        error: errorTitle,
        message: error.message
      });
    }
    
    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};

export const deleteFeeHandler = async (request, reply) => {
  try {
    const { agentId, feeId } = request.params;
    const db = request.server.db;

    await service.deleteFeeByAgentId(db, agentId, feeId);
    
    return reply.status(204).send(); // No Content
  } catch (error) {
    if (error.statusCode === 404) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message
      });
    }
    
    request.log.error(error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: error.message
    });
  }
};
