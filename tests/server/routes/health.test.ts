import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import envelopePlugin from '../../../src/server/middleware/envelope.js';
import authPlugin from '../../../src/server/middleware/auth.js';
import healthRoutes from '../../../src/server/routes/health.js';
import { configStore } from '../../../src/config/store.js';
import type { FastifyInstance } from 'fastify';

// Set test environment
process.env.NODE_ENV = 'test';

// Mock configStore
vi.mock('../../../src/config/store.js', () => ({
  configStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

async function buildTestApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(sensible);
  await app.register(envelopePlugin);
  await app.register(authPlugin);
  await app.register(healthRoutes);
  return app;
}

describe('Health Endpoint', () => {
  let app: FastifyInstance;
  const mockConfigStore = vi.mocked(configStore);

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: API key is configured
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'api-key') return 'test-api-key';
      return undefined;
    });
    app = await buildTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return {status: "ok"} without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Response is wrapped in envelope format
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('ok');
      expect(body.data.timestamp).toBeDefined();
    });

    it('should return valid timestamp in ISO format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      // Response is wrapped in envelope format
      expect(body.success).toBe(true);
      // Verify timestamp is valid ISO format
      expect(() => new Date(body.data.timestamp)).not.toThrow();
    });
  });
});