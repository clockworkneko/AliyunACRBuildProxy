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

describe('API Key Authentication', () => {
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

  describe('authentication required', () => {
    it('should return 401 when X-API-Key header is missing', async () => {
      app.get('/protected', async () => {
        return { secret: 'data' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('Missing X-API-Key');
    });

    it('should return 401 when API key is invalid', async () => {
      app.get('/protected', async () => {
        return { secret: 'data' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          'x-api-key': 'wrong-key',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('Invalid API key');
    });

    it('should allow request with valid API key', async () => {
      app.get('/protected', async () => {
        return { secret: 'data' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: { secret: 'data' },
      });
    });
  });

  describe('health endpoint bypass', () => {
    it('should bypass authentication for /health endpoint', async () => {
      app.get('/health', async () => {
        return { status: 'ok' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: { status: 'ok' },
      });
    });

    it('should bypass authentication for /v1/health endpoint', async () => {
      app.get('/v1/health', async () => {
        return { status: 'ok' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: { status: 'ok' },
      });
    });
  });

  describe('configuration errors', () => {
    it('should return 500 when API key is not configured', async () => {
      mockConfigStore.get.mockReturnValue(undefined);

      app.get('/protected', async () => {
        return { secret: 'data' };
      });

      const response = await app.inject({
        method: 'GET',
        url: '/protected',
        headers: {
          'x-api-key': 'any-key',
        },
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('CONFIGURATION_ERROR');
      expect(body.error.message).toContain('API key not configured');
    });
  });

  describe('timing-safe comparison', () => {
    it('should use timing-safe comparison (constant time for invalid keys)', async () => {
      app.get('/protected', async () => {
        return { secret: 'data' };
      });

      // Test with keys of different lengths
      const shortKey = 'x';
      const longKey = 'x'.repeat(100);

      const start1 = process.hrtime.bigint();
      await app.inject({
        method: 'GET',
        url: '/protected',
        headers: { 'x-api-key': shortKey },
      });
      const time1 = Number(process.hrtime.bigint() - start1);

      const start2 = process.hrtime.bigint();
      await app.inject({
        method: 'GET',
        url: '/protected',
        headers: { 'x-api-key': longKey },
      });
      const time2 = Number(process.hrtime.bigint() - start2);

      // Both should fail with 401
      // Time difference should not be significant (within 10x factor)
      // This is a rough check - real timing attacks need statistical analysis
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      expect(ratio).toBeLessThan(10);
    });
  });
});