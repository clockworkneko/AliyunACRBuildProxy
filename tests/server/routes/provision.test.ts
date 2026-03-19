import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../../src/server/app.js';
import type { FastifyInstance } from 'fastify';

// Mock the orchestrator service
vi.mock('../../../src/services/orchestrator.js', () => ({
  provisionRepo: vi.fn(),
}));

import { provisionRepo } from '../../../src/services/orchestrator.js';

describe('POST /v1/provision', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provision a new repo with valid data', async () => {
    const mockResult = {
      alias: 'nginx-latest',
      acrUrl: 'registry.cn-beijing.aliyuncs.com/asor/nginx-latest',
      dockerPullCommand: 'docker pull registry.cn-beijing.aliyuncs.com/asor/nginx-latest:latest',
    };

    vi.mocked(provisionRepo).mockResolvedValue(mockResult);

    const response = await app.inject({
      method: 'POST',
      url: '/v1/provision',
      headers: {
        'x-api-key': 'test-api-key',
      },
      payload: {
        imageName: 'nginx',
        imageTag: 'latest',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({
      alias: 'nginx-latest',
      acrUrl: 'registry.cn-beijing.aliyuncs.com/asor/nginx-latest',
      dockerPullCommand: 'docker pull registry.cn-beijing.aliyuncs.com/asor/nginx-latest:latest',
    });
  });

  it('should return 400 for missing imageName', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/provision',
      headers: {
        'x-api-key': 'test-api-key',
      },
      payload: {
        imageTag: 'latest',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for missing imageTag', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/provision',
      headers: {
        'x-api-key': 'test-api-key',
      },
      payload: {
        imageName: 'nginx',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should return 400 for duplicate alias', async () => {
    vi.mocked(provisionRepo).mockRejectedValue(new Error('Alias already exists'));

    const response = await app.inject({
      method: 'POST',
      url: '/v1/provision',
      headers: {
        'x-api-key': 'test-api-key',
      },
      payload: {
        imageName: 'nginx',
        imageTag: 'latest',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ALIAS_EXISTS');
  });
});
