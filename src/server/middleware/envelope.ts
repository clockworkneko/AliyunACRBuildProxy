import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    success: (data: unknown) => FastifyReply;
  }
}

async function envelopePlugin(app: FastifyInstance) {
  app.decorateReply('success', function (this: FastifyReply, data: unknown) {
    return this.send({ success: true, data });
  });
}

export default fp(envelopePlugin, { name: 'envelope' });