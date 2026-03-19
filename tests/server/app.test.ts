import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { configStore } from '../../src/config/store.js';
import type { FastifyInstance } from 'fastify';

// Mock configStore
vi.mock('../../src/config/store.js', () => ({
  configStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

describe('App Factory', () => {
  let app: FastifyInstance;
  const mockConfigStore = vi.mocked(configStore);

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: API key is configured
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'api-key') return 'test-api-key';
      return undefined;
    });
    app = await buildApp({ logger: false });
  });

  afterEach(async () => {
    await app.close();
  });

  describe('envelope format', () => {
    it('should wrap successful response in {success: true, data: {...}}', async () => {
      app.get('/test-success', async (request, reply) => {
        return reply.success({ message: 'hello' });
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-success',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: { message: 'hello' },
      });
    });

    it('should wrap error response in {success: false, error: {code, message}}', async () => {
      app.get('/test-error', async (request, reply) => {
        throw app.httpErrors.badRequest('Invalid input');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-error',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid input');
    });

    it('should return 404 with proper error format for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/unknown-route',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toContain('not found');
    });

    it('should handle validation errors with 400 status', async () => {
      app.post('/test-validation', {
        schema: {
          body: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string' },
            },
          },
        },
      }, async () => {
        return { ok: true };
      });

      const response = await app.inject({
        method: 'POST',
        url: '/test-validation',
        payload: {}, // Missing required 'name'
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('error handling', () => {
    it('should hide internal error details for 500 errors', async () => {
      app.get('/test-internal-error', async () => {
        throw new Error('Database connection failed');
      });

      const response = await app.inject({
        method: 'GET',
        url: '/test-internal-error',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Internal server error');
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});