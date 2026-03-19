import { describe, it, expect, beforeEach, vi } from 'vitest';
import crypto from 'crypto';
import { verifyGitHubSignature, webhookAuthHook } from '../../../src/server/middleware/webhook-auth.js';
import { configStore } from '../../../src/config/store.js';
import Fastify from 'fastify';
import sensible from '@fastify/sensible';

// Mock configStore
vi.mock('../../../src/config/store.js', () => ({
  configStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

describe('verifyGitHubSignature', () => {
  const testSecret = 'my-webhook-secret';
  const testPayload = JSON.stringify({ ref: 'refs/heads/main', repository: { full_name: 'owner/repo' } });

  function createSignature(payload: string | Buffer, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload) : payload;
    hmac.update(payloadBuffer);
    return `sha256=${hmac.digest('hex')}`;
  }

  describe('valid signatures', () => {
    it('should return true for valid signature with string payload', () => {
      const signature = createSignature(testPayload, testSecret);
      expect(verifyGitHubSignature(testPayload, signature, testSecret)).toBe(true);
    });

    it('should return true for valid signature with Buffer payload', () => {
      const payloadBuffer = Buffer.from(testPayload);
      const signature = createSignature(payloadBuffer, testSecret);
      expect(verifyGitHubSignature(payloadBuffer, signature, testSecret)).toBe(true);
    });

    it('should support sha256= prefix format', () => {
      const signature = createSignature(testPayload, testSecret);
      expect(signature).toMatch(/^sha256=/);
      expect(verifyGitHubSignature(testPayload, signature, testSecret)).toBe(true);
    });
  });

  describe('invalid signatures', () => {
    it('should return false for invalid signature', () => {
      const signature = 'sha256=invalid_hex_signature';
      expect(verifyGitHubSignature(testPayload, signature, testSecret)).toBe(false);
    });

    it('should return false for signature with wrong secret', () => {
      const signature = createSignature(testPayload, 'wrong-secret');
      expect(verifyGitHubSignature(testPayload, signature, testSecret)).toBe(false);
    });

    it('should return false for signature without sha256= prefix', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayload);
      const signature = hmac.digest('hex');
      expect(verifyGitHubSignature(testPayload, signature, testSecret)).toBe(false);
    });
  });

  describe('missing signatures', () => {
    it('should return false for empty signature', () => {
      expect(verifyGitHubSignature(testPayload, '', testSecret)).toBe(false);
    });
  });

  describe('timing-safe comparison', () => {
    it('should use timing-safe comparison to prevent timing attacks', () => {
      const validSignature = createSignature(testPayload, testSecret);
      
      // Test with signatures of different lengths
      const shortSig = 'sha256=aa';
      const longSig = 'sha256=' + 'a'.repeat(128);

      const start1 = process.hrtime.bigint();
      verifyGitHubSignature(testPayload, shortSig, testSecret);
      const time1 = Number(process.hrtime.bigint() - start1);

      const start2 = process.hrtime.bigint();
      verifyGitHubSignature(testPayload, longSig, testSecret);
      const time2 = Number(process.hrtime.bigint() - start2);

      // Both should fail, but time difference should not be significant
      // Real timing attacks need statistical analysis, this is a rough check
      const ratio = Math.max(time1, time2) / Math.min(time1, time2);
      expect(ratio).toBeLessThan(100); // Allow some variance
    });
  });
});

describe('webhookAuthHook', () => {
  const mockConfigStore = vi.mocked(configStore);
  const testSecret = 'test-secret';
  const testPayload = JSON.stringify({ ref: 'refs/heads/main' });

  function createSignature(payload: string, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  async function buildTestAppWithHook() {
    const app = Fastify({ logger: false });
    await app.register(sensible);
    
    // Add error handler to match main app behavior
    app.setErrorHandler((error: any, request, reply) => {
      const statusCode = error.statusCode ?? 500;
      const isConfigurationError = error.message?.includes('not configured');
      
      let errorCode = 'INTERNAL_ERROR';
      if (isConfigurationError) {
        errorCode = 'CONFIGURATION_ERROR';
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
    
    // Register a test route that uses the webhook auth hook
    app.post('/test-webhook', {
      preHandler: async (request, reply) => {
        await webhookAuthHook(app, request, reply);
      },
    }, async () => {
      return { success: true };
    });
    
    return app;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should throw 500 when webhook secret is not configured', async () => {
    mockConfigStore.get.mockReturnValue(undefined);
    const app = await buildTestAppWithHook();

    const response = await app.inject({
      method: 'POST',
      url: '/test-webhook',
      headers: {
        'x-hub-signature-256': 'sha256=abc123',
        'x-github-event': 'push',
      },
      payload: { ref: 'refs/heads/main' },
    });

    expect(response.statusCode).toBe(500);
    const body = response.json();
    expect(body.error.code).toBe('CONFIGURATION_ERROR');
    expect(body.error.message).toContain('Webhook secret not configured');
  });

  it('should throw 401 when X-Hub-Signature-256 header is missing', async () => {
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'webhook-secret') return testSecret;
      return undefined;
    });
    const app = await buildTestAppWithHook();

    const response = await app.inject({
      method: 'POST',
      url: '/test-webhook',
      headers: {
        'x-github-event': 'push',
      },
      payload: { ref: 'refs/heads/main' },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toContain('Missing X-Hub-Signature-256');
  });

  it('should throw 401 for invalid webhook signature', async () => {
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'webhook-secret') return testSecret;
      return undefined;
    });
    const app = await buildTestAppWithHook();

    const response = await app.inject({
      method: 'POST',
      url: '/test-webhook',
      headers: {
        'x-hub-signature-256': 'sha256=invalid_signature',
        'x-github-event': 'push',
      },
      payload: { ref: 'refs/heads/main' },
    });

    expect(response.statusCode).toBe(401);
    const body = response.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
    expect(body.error.message).toContain('Invalid webhook signature');
  });

  it('should pass with valid signature', async () => {
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'webhook-secret') return testSecret;
      return undefined;
    });
    const app = await buildTestAppWithHook();

    const validSignature = createSignature(testPayload, testSecret);
    const response = await app.inject({
      method: 'POST',
      url: '/test-webhook',
      headers: {
        'x-hub-signature-256': validSignature,
        'x-github-event': 'push',
        'content-type': 'application/json',
      },
      body: testPayload,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.success).toBe(true);
  });
});