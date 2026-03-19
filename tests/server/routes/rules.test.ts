import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { buildApp } from '../../../src/server/app.js';
import type { FastifyInstance } from 'fastify';

// Mock the rule-manager service
vi.mock('../../../src/services/rule-manager.js', () => ({
  listRules: vi.fn(),
  addRule: vi.fn(),
  removeRule: vi.fn(),
  cleanupRules: vi.fn(),
}));

import { listRules, addRule, removeRule, cleanupRules } from '../../../src/services/rule-manager.js';

describe('Rules API', () => {
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

  describe('GET /v1/rules/:alias', () => {
    it('should list rules for an alias', async () => {
      const mockRules = [
        { id: 1, branchPattern: 'main', tagTemplate: 'latest', acrRuleId: 'rule-1', status: 'active' },
        { id: 2, branchPattern: 'release/*', tagTemplate: 'v{branch}', acrRuleId: 'rule-2', status: 'active' },
      ];

      vi.mocked(listRules).mockResolvedValue(mockRules);

      const response = await app.inject({
        method: 'GET',
        url: '/v1/rules/nginx-latest',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.rules).toHaveLength(2);
    });

    it('should return 404 for non-existent alias', async () => {
      vi.mocked(listRules).mockRejectedValue(new Error('Alias not found'));

      const response = await app.inject({
        method: 'GET',
        url: '/v1/rules/notfound',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('ALIAS_NOT_FOUND');
    });
  });

  describe('POST /v1/rules/:alias', () => {
    it('should add a new rule', async () => {
      const mockResult = {
        rule: {
          id: 3,
          branch_pattern: 'feature/*',
          tag_template: 'dev-{branch}',
        },
      };

      vi.mocked(addRule).mockResolvedValue(mockResult);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/rules/nginx-latest',
        headers: {
          'x-api-key': 'test-api-key',
        },
        payload: {
          branchPattern: 'feature/*',
          tagTemplate: 'dev-{branch}',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.rule.id).toBe(3);
    });

    it('should return 400 for missing branchPattern', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/rules/nginx-latest',
        headers: {
          'x-api-key': 'test-api-key',
        },
        payload: {
          tagTemplate: 'dev-{branch}',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('DELETE /v1/rules/:alias/:ruleId', () => {
    it('should remove a rule', async () => {
      vi.mocked(removeRule).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/rules/nginx-latest/1',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.removed).toBe(true);
    });

    it('should return 400 for invalid ruleId', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/v1/rules/nginx-latest/abc',
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

  describe('POST /v1/rules/:alias/cleanup', () => {
    it('should trigger cleanup', async () => {
      const mockReport = {
        totalChecked: 5,
        mergedBranches: [{ name: 'feature/old', ruleId: 1 }],
        deletedBranches: [],
        removedCount: 1,
      };

      vi.mocked(cleanupRules).mockResolvedValue(mockReport);

      const response = await app.inject({
        method: 'POST',
        url: '/v1/rules/nginx-latest/cleanup',
        headers: {
          'x-api-key': 'test-api-key',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.success).toBe(true);
      expect(body.data.totalChecked).toBe(5);
    });
  });
});
