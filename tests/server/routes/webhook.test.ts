import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import webhookRoutes from '../../../src/server/routes/v1/webhook.js';
import { configStore } from '../../../src/config/store.js';

// Mock configStore
vi.mock('../../../src/config/store.js', () => ({
  configStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

// Mock rule-manager
vi.mock('../../../src/services/rule-manager.js', () => ({
  cleanupRules: vi.fn(),
}));

// Mock orchestrator
vi.mock('../../../src/services/orchestrator.js', () => ({
  listRepos: vi.fn(),
}));

describe('GitHub Webhook Endpoint', () => {
  const mockConfigStore = vi.mocked(configStore);
  const testSecret = 'test-webhook-secret';

  function createSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  async function buildTestApp() {
    const app = Fastify({ logger: false });
    await app.register(sensible);
    
    // Add error handler to match main app behavior
    app.setErrorHandler((error: any, request, reply) => {
      const statusCode = error.statusCode ?? 500;
      const isConfigurationError = error.message?.includes('not configured');
      
      let errorCode = 'INTERNAL_ERROR';
      if (isConfigurationError) {
        errorCode = 'CONFIGURATION_ERROR';
      } else if (statusCode === 400) {
        errorCode = 'VALIDATION_ERROR';
      } else if (statusCode === 401) {
        errorCode = 'UNAUTHORIZED';
      }
      
      return reply.code(statusCode).send({
        success: false,
        error: {
          code: errorCode,
          message: error.message ?? 'Internal server error',
        },
      });
    });
    
    // Register webhook routes
    await app.register(webhookRoutes, { prefix: '/v1' });
    
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should return 401 for invalid webhook signature', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'webhook-secret') return testSecret;
        return undefined;
      });
      const app = await buildTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-hub-signature-256': 'sha256=invalid_signature',
          'x-github-event': 'push',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ref: 'refs/heads/main' }),
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('Invalid webhook signature');
    });

    it('should return 401 for missing signature', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'webhook-secret') return testSecret;
        return undefined;
      });
      const app = await buildTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-github-event': 'push',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ref: 'refs/heads/main' }),
      });

      expect(response.statusCode).toBe(401);
      const body = response.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 500 when webhook secret not configured', async () => {
      mockConfigStore.get.mockReturnValue(undefined);
      const app = await buildTestApp();

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-hub-signature-256': 'sha256=something',
          'x-github-event': 'push',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ ref: 'refs/heads/main' }),
      });

      expect(response.statusCode).toBe(500);
      const body = response.json();
      expect(body.error.code).toBe('CONFIGURATION_ERROR');
      expect(body.error.message).toContain('Webhook secret not configured');
    });
  });

  describe('push events', () => {
    it('should accept valid push event with valid signature', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'webhook-secret') return testSecret;
        return undefined;
      });
      const app = await buildTestApp();

      const payload = JSON.stringify({
        ref: 'refs/heads/main',
        repository: { full_name: 'owner/repo' },
      });
      const signature = createSignature(payload, testSecret);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'content-type': 'application/json',
        },
        body: payload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.event).toBe('push');
      expect(body.data.processed).toBe(true);
    });

    it('should handle branch deletion in push event', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'webhook-secret') return testSecret;
        return undefined;
      });
      const app = await buildTestApp();

      const payload = JSON.stringify({
        ref: 'refs/heads/feature-branch',
        deleted: true,
        repository: { full_name: 'owner/repo' },
      });
      const signature = createSignature(payload, testSecret);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'push',
          'content-type': 'application/json',
        },
        body: payload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.action).toBe('branch_deleted');
      expect(body.data.branch).toBe('feature-branch');
    });
  });

  describe('delete events', () => {
    it('should handle branch delete event', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'webhook-secret') return testSecret;
        return undefined;
      });
      const app = await buildTestApp();

      const payload = JSON.stringify({
        ref: 'deleted-branch',
        ref_type: 'branch',
        repository: { full_name: 'owner/repo' },
      });
      const signature = createSignature(payload, testSecret);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'delete',
          'content-type': 'application/json',
        },
        body: payload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.event).toBe('delete');
      expect(body.data.action).toBe('branch_deleted');
    });

    it('should handle tag delete event without special action', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'webhook-secret') return testSecret;
        return undefined;
      });
      const app = await buildTestApp();

      const payload = JSON.stringify({
        ref: 'v1.0.0',
        ref_type: 'tag',
        repository: { full_name: 'owner/repo' },
      });
      const signature = createSignature(payload, testSecret);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'delete',
          'content-type': 'application/json',
        },
        body: payload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.processed).toBe(true);
      expect(body.data.refType).toBe('tag');
    });
  });

  describe('unsupported events', () => {
    it('should acknowledge but not process other event types', async () => {
      mockConfigStore.get.mockImplementation((key: string) => {
        if (key === 'webhook-secret') return testSecret;
        return undefined;
      });
      const app = await buildTestApp();

      const payload = JSON.stringify({
        action: 'opened',
        repository: { full_name: 'owner/repo' },
      });
      const signature = createSignature(payload, testSecret);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/webhook/github',
        headers: {
          'x-hub-signature-256': signature,
          'x-github-event': 'pull_request',
          'content-type': 'application/json',
        },
        body: payload,
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.processed).toBe(false);
      expect(body.data.message).toContain('not processed');
    });
  });
});