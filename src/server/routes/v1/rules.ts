import type { FastifyInstance } from 'fastify';
import { listRules, addRule, removeRule, cleanupRules } from '../../../services/rule-manager.js';
import { ErrorCodes } from '../../errors/codes.js';

interface RulesPathParams {
  alias: string;
  ruleId?: string;
}

interface AddRuleBody {
  branchPattern: string;
  tagTemplate: string;
}

interface CleanupQuery {
  dryRun?: boolean;
  force?: boolean;
}

const AddRuleBodySchema = {
  type: 'object',
  required: ['branchPattern', 'tagTemplate'],
  properties: {
    branchPattern: { type: 'string', minLength: 1 },
    tagTemplate: { type: 'string', minLength: 1 },
  },
};

export default async function rulesRoutes(app: FastifyInstance) {
  // GET /v1/rules/:alias - List rules
  app.get<{ Params: RulesPathParams }>('/rules/:alias', async (request, reply) => {
    const { alias } = request.params;

    try {
      const rules = await listRules(alias);
      return reply.success({ rules });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: ErrorCodes.ALIAS_NOT_FOUND,
            message: `Alias "${alias}" not found`,
          },
        });
      }

      throw err;
    }
  });

  // POST /v1/rules/:alias - Add rule
  app.post<{ Params: RulesPathParams; Body: AddRuleBody }>(
    '/rules/:alias',
    {
      schema: {
        body: AddRuleBodySchema,
      },
    },
    async (request, reply) => {
      const { alias } = request.params;
      const { branchPattern, tagTemplate } = request.body;

      try {
        const result = await addRule(alias, branchPattern, tagTemplate);

        return reply.code(201).send({
          success: true,
          data: {
            rule: {
              id: result.rule.id,
              branchPattern: result.rule.branch_pattern,
              tagTemplate: result.rule.tag_template,
            },
            warning: result.warning,
          },
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: {
              code: ErrorCodes.ALIAS_NOT_FOUND,
              message: `Alias "${alias}" not found`,
            },
          });
        }

        if (message.includes('Maximum')) {
          return reply.code(400).send({
            success: false,
            error: {
              code: 'RULE_LIMIT_EXCEEDED',
              message,
            },
          });
        }

        throw err;
      }
    }
  );

  // DELETE /v1/rules/:alias/:ruleId - Remove rule
  app.delete<{ Params: RulesPathParams }>('/rules/:alias/:ruleId', async (request, reply) => {
    const { alias, ruleId } = request.params;

    if (!ruleId) {
      return reply.code(400).send({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Rule ID is required',
        },
      });
    }

    const numericRuleId = parseInt(ruleId, 10);
    if (isNaN(numericRuleId)) {
      return reply.code(400).send({
        success: false,
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Rule ID must be a number',
        },
      });
    }

    try {
      await removeRule(alias, numericRuleId);
      return reply.success({ removed: true, ruleId: numericRuleId });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: {
            code: ErrorCodes.NOT_FOUND,
            message,
          },
        });
      }

      throw err;
    }
  });

  // POST /v1/rules/:alias/cleanup - Cleanup merged branch rules
  app.post<{ Params: RulesPathParams; Querystring: CleanupQuery }>(
    '/rules/:alias/cleanup',
    async (request, reply) => {
      const { alias } = request.params;
      const { dryRun, force } = request.query;

      try {
        const report = await cleanupRules(alias, { dryRun, force });
        return reply.success({
          totalChecked: report.totalChecked,
          mergedBranches: report.mergedBranches.length,
          deletedBranches: report.deletedBranches.length,
          removedCount: report.removedCount,
          dryRun: dryRun ?? false,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (message.includes('not found')) {
          return reply.code(404).send({
            success: false,
            error: {
              code: ErrorCodes.ALIAS_NOT_FOUND,
              message: `Alias "${alias}" not found`,
            },
          });
        }

        throw err;
      }
    }
  );
}
