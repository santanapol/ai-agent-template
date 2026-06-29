import { randomUUID } from 'node:crypto';

import fp from 'fastify-plugin';

function requestIdPlugin(fastify) {
  fastify.addHook('onRequest', async (request) => {
    const incoming = request.headers['x-request-id'];
    const id =
      typeof incoming === 'string' && incoming.trim().length > 0
        ? incoming.trim()
        : randomUUID();

    request.requestId = id;
    request.headers['x-request-id'] = id;
  });

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.requestId) {
      reply.header('x-request-id', request.requestId);
    }
    return payload;
  });
}

export default fp(requestIdPlugin, {
  name: 'request-id',
});
