import Fastify from 'fastify';
import sensible from '@fastify/sensible';

export async function buildTestApp() {
  const app = Fastify({
    logger: false, // Disable logging in tests
  });
  await app.register(sensible);
  return app;
}