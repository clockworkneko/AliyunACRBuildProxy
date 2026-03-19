import crypto from 'crypto';
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { configStore } from '../../config/store.js';

// Timing-safe string comparison
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');

  if (bufA.length !== bufB.length) {
    // Perform dummy comparison to maintain constant time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

async function authPlugin(app: FastifyInstance) {
  app.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for health check endpoints
    if (request.url === '/health' || request.url === '/v1/health') {
      return;
    }

    const apiKey = request.headers['x-api-key'];
    const storedKey = configStore.get('api-key');

    if (!storedKey) {
      throw app.httpErrors.internalServerError(
        'API key not configured. Run: asor config set api-key <key>'
      );
    }

    if (!apiKey || typeof apiKey !== 'string') {
      throw app.httpErrors.unauthorized('Missing X-API-Key header');
    }

    if (!timingSafeEqual(apiKey, storedKey)) {
      throw app.httpErrors.unauthorized('Invalid API key');
    }
  });
}

export default fp(authPlugin, { name: 'auth' });