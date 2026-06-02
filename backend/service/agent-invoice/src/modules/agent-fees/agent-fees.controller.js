import * as service from './agent-fees.service.js';

export const getFeesHandler = async (request, reply) => {
  try {
    const { agentId } = request.params;
    // req.server.db is available because of fastify instance context?
    // Wait, it's better to pass db from request.server.db
    const db = request.server.db;
    
    const fees = await service.getFeesByAgentId(db, agentId);
    
    return reply.status(200).send({
      statusCode: 200,
      message: 'Success',
      data: fees
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
    
    // In real app, user ID comes from JWT via request.user
    const userId = 'admin_user';

    const result = await service.createFeeByAgentId(db, agentId, request.body, userId);
    
    return reply.status(201).send({
      statusCode: 201,
      message: 'Created Successfully',
      data: {
        insertedId: result.insertedId.toString()
      }
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
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
    const userId = 'admin_user';

    await service.updateFeeByAgentId(db, agentId, feeId, request.body, userId);
    
    return reply.status(200).send({
      statusCode: 200,
      message: 'Updated Successfully'
    });
  } catch (error) {
    if (error.statusCode === 409) {
      return reply.status(409).send({
        statusCode: 409,
        error: 'Conflict',
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
