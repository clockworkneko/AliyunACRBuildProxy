import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../../src/server/app.js';
import type { FastifyInstance } from 'fastify';

// Mock the resolver service
vi.mock('../../../src/services/resolver.js', () => ({
  resolve: vi.fn(),
}));

import { resolve } from '../../../src/services/resolver.js';

describe('GET /v1/resolve', () => {
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
