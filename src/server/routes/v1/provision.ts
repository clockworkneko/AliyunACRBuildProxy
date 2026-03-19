import type { FastifyInstance } from 'fastify';
import { provisionRepo, type ProvisionInput } from '../../../services/orchestrator.js';
import { ErrorCodes } from '../../errors/codes.js';

const ProvisionBodySchema = {
  type: 'object',
  required: ['imageName', 'imageTag'],
  properties: {
    imageName: { type: 'string', minLength: 1 },
    imageTag: { type: 'string', minLength: 1 },
    alias: { type: 'string' },
    namespace: { type: 'string' },
    region: { type: 'string' },
  },
};

export default async function provisionRoutes(app: FastifyInstance) {
  app.post('/provision', {
    schema: {
      body: ProvisionBodySchema,
    },
  }, async (request, reply) => {
    const body = request.body as ProvisionInput;

    try {
      const result = await provisionRepo(body);

      return reply.success({
        alias: result.alias,
        acrUrl: result.acrUrl,
        dockerPullCommand: result.dockerPullCommand,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      // Map error messages to error codes
      if (message.includes('already exists')) {
        return reply.code(400).send({
          success: false,
          error: {
            code: ErrorCodes.ALIAS_EXISTS,
            message,
          },
        });
      }

      if (message.includes('not configured')) {
        return reply.code(500).send({
          success: false,
          error: {
            code: ErrorCodes.CONFIGURATION_ERROR,
            message,
          },
        });
      }

      // Re-throw for global error handler
      throw err;
    }
  });
}
