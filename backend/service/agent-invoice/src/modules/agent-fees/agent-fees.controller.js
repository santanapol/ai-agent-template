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
