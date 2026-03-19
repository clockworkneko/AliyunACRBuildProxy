import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyReply, HookHandlerDoneFunction } from 'fastify';

declare module 'fastify' {
  interface FastifyReply {
    success: (data: unknown) => FastifyReply;
  }
}

async function envelopePlugin(app: FastifyInstance) {
  // Add the success helper method
  app.decorateReply('success', function (this: FastifyReply, data: unknown) {
    return this.send({ success: true, data });
  });

  // Automatically wrap all non-error responses in envelope format
  app.addHook('preSerialization', async (request, reply, payload) => {
    // Skip if payload is already in envelope format (has success property)
    if (payload && typeof payload === 'object' && 'success' in payload) {
      return payload;
    }
    
    // Skip if payload is a string (could be a serialized error or custom response)
    if (typeof payload === 'string') {
      return payload;
    }

    // Wrap in envelope format
    return { success: true, data: payload };
  });
}

export default fp(envelopePlugin, { name: 'envelope' });