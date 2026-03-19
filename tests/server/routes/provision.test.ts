import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../../../src/server/app.js';
import { configStore } from '../../../src/config/store.js';
import provisionRoutes from '../../../src/server/routes/v1/provision.js';
import type { FastifyInstance } from 'fastify';

// Mock the orchestrator service
vi.mock('../../../src/services/orchestrator.js', () => ({
  provisionRepo: vi.fn(),
}));

// Mock configStore
vi.mock('../../../src/config/store.js', () => ({
  configStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

import { provisionRepo } from '../../../src/services/orchestrator.js';

describe('POST /v1/provision', () => {
  let app: FastifyInstance;
  const mockConfigStore = vi.mocked(configStore);

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    // Manually register the route since autoload is disabled in test mode
    await app.register(provisionRoutes, { prefix: '/v1' });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: API key is configured
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'api-key') return 'test-api-key';
      return undefined;
    });
  });

  it('should provision a new repo with valid data', async () => {
    const mockResult = {
      alias: 'nginx-latest',
      acrUrl: 'registry.cn-beijing.aliyuncs.com/asor/nginx-latest',
      dockerPullCommand: 'docker pull registry.cn-beijing.aliyuncs.com/asor/nginx-latest:latest',
    };

    vi.mocked(provisionRepo).mockResolvedValue(mockResult as any);

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
