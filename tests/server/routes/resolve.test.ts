import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { buildApp } from '../../../src/server/app.js';
import { configStore } from '../../../src/config/store.js';
import resolveRoutes from '../../../src/server/routes/v1/resolve.js';
import type { FastifyInstance } from 'fastify';

// Mock the resolver service
vi.mock('../../../src/services/resolver.js', () => ({
  resolve: vi.fn(),
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

import { resolve } from '../../../src/services/resolver.js';

describe('GET /v1/resolve', () => {
  let app: FastifyInstance;
  const mockConfigStore = vi.mocked(configStore);

  beforeAll(async () => {
    app = await buildApp({ logger: false });
    // Manually register the route since autoload is disabled in test mode
    await app.register(resolveRoutes, { prefix: '/v1' });
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

  it('should resolve an alias', async () => {
    const mockResult = {
      alias: 'nginx-latest',
      tag: 'latest',
      acrUrl: 'registry.cn-beijing.aliyuncs.com/asor/nginx-latest',
      fullImagePath: 'registry.cn-beijing.aliyuncs.com/asor/nginx-latest:latest',
    };

    vi.mocked(resolve).mockResolvedValue(mockResult);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/resolve?alias=nginx-latest',
      headers: {
        'x-api-key': 'test-api-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.alias).toBe('nginx-latest');
    expect(body.data.dockerPullCommand).toBe('docker pull registry.cn-beijing.aliyuncs.com/asor/nginx-latest:latest');
  });

  it('should resolve an alias with specific tag', async () => {
    const mockResult = {
      alias: 'nginx',
      tag: '1.21',
      acrUrl: 'registry.cn-beijing.aliyuncs.com/asor/nginx',
      fullImagePath: 'registry.cn-beijing.aliyuncs.com/asor/nginx:1.21',
    };

    vi.mocked(resolve).mockResolvedValue(mockResult);

    const response = await app.inject({
      method: 'GET',
      url: '/v1/resolve?alias=nginx&tag=1.21',
      headers: {
        'x-api-key': 'test-api-key',
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(true);
    expect(body.data.tag).toBe('1.21');
  });

  it('should return 404 for non-existent alias', async () => {
    vi.mocked(resolve).mockRejectedValue(new Error('Alias not found'));

    const response = await app.inject({
      method: 'GET',
      url: '/v1/resolve?alias=notfound',
      headers: {
        'x-api-key': 'test-api-key',
      },
    });

    expect(response.statusCode).toBe(404);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('ALIAS_NOT_FOUND');
  });

  it('should return 400 for missing alias param', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/resolve',
      headers: {
        'x-api-key': 'test-api-key',
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.payload);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
