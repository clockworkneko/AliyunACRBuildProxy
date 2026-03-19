import type { FastifyInstance } from 'fastify';

export default async function healthRoutes(app: FastifyInstance) {
  app.get('/health', {
    config: {
      skipAuth: true, // Mark as public endpoint
    },
  }, async (request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });
}