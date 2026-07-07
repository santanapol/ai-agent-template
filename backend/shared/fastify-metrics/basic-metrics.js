/**
 * Minimal Prometheus /metrics for harness observability (no extra deps).
 * @param {import('fastify').FastifyInstance} fastify
 * @param {{ startedAtMs: number, serviceName: string }} opts
 */
export function registerBasicMetrics(fastify, { startedAtMs, serviceName }) {
  fastify.get('/metrics', async (_request, reply) => {
    const uptime = (Date.now() - startedAtMs) / 1000;
    const mem = process.memoryUsage();
    const body = [
      '# HELP process_uptime_seconds Process uptime in seconds',
      '# TYPE process_uptime_seconds gauge',
      `process_uptime_seconds{service="${serviceName}"} ${uptime}`,
      '# HELP nodejs_heap_used_bytes Node.js heap used',
      '# TYPE nodejs_heap_used_bytes gauge',
      `nodejs_heap_used_bytes{service="${serviceName}"} ${mem.heapUsed}`,
      '# HELP nodejs_external_bytes Node.js external memory',
      '# TYPE nodejs_external_bytes gauge',
      `nodejs_external_bytes{service="${serviceName}"} ${mem.external}`,
    ].join('\n');
    reply.type('text/plain; version=0.0.4; charset=utf-8');
    return `${body}\n`;
  });
}
