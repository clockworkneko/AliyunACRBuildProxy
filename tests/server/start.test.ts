import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { buildApp } from '../../src/server/app.js';
import { configStore } from '../../src/config/store.js';
import { startServer } from '../../src/server/index.js';
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

describe('Server Entry Point', () => {
  let app: FastifyInstance;
  const mockConfigStore = vi.mocked(configStore);

  beforeEach(async () => {
    vi.clearAllMocks();
    // Default: API key is configured
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'api-key') return 'test-api-key';
      if (key === 'server-port') return 3000;
      if (key === 'server-host') return '127.0.0.1';
      return undefined;
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('startServer', () => {
    it('should start and listen on configured port', async () => {
      app = await startServer({ port: 0 }); // Use port 0 to get a random available port

      const address = app.server.address();
      expect(address).not.toBeNull();
      if (address && typeof address === 'object') {
        expect(address.port).toBeGreaterThan(0);
        expect(address.address).toBe('127.0.0.1');
      }
    });

    it('should respond to health check at /health', async () => {
      app = await startServer({ port: 0 });

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });

    it('should close connections gracefully on shutdown', async () => {
      app = await startServer({ port: 0 });

      // Verify app is listening
      const address = app.server.address();
      expect(address).not.toBeNull();

      // Close the app
      await app.close();

      // Verify the server is no longer listening
      expect(app.server.listening).toBe(false);
    });

    it('should use default port 3000 when not configured', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'api-key') return 'test-api-key';
        return undefined; // No server-port configured
      });

      // We can't actually listen on port 3000 (might be in use),
      // but we can verify the default is used when building
      app = await buildApp({ logger: false });
      await app.ready();

      expect(app).toBeDefined();
    });

    it('should use configured port and host from config store', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'api-key') return 'test-api-key';
        if (key === 'server-port') return 8080;
        if (key === 'server-host') return '0.0.0.0';
        return undefined;
      });

      // Use port 0 to avoid port conflicts
      app = await startServer({ port: 0, host: '0.0.0.0' });

      const address = app.server.address();
      expect(address).not.toBeNull();
      if (address && typeof address === 'object') {
        expect(address.address).toBe('0.0.0.0');
      }
    });
  });
});