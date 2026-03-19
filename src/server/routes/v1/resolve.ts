import type { FastifyInstance } from 'fastify';
import { resolve, type ResolveOptions } from '../../../services/resolver.js';
import { ErrorCodes } from '../../errors/codes.js';

interface ResolveQuery {
  alias: string;
  tag?: string;
}

const ResolveQuerySchema = {
  type: 'object',
  required: ['alias'],
  properties: {
    alias: { type: 'string', minLength: 1 },
    tag: { type: 'string' },
  },
};

export default async function resolveRoutes(app: FastifyInstance) {
  app.get<{ Querystring: ResolveQuery }>('/resolve', {
    schema: {
      querystring: ResolveQuerySchema,
    },
  }, async (request, reply) => {
    const { alias, tag } = request.query;

    try {
      const options: ResolveOptions = {};
      if (tag) {
        options.tag = tag;
      }

      const result = await resolve(alias, options);

      return reply.success({
        alias: result.alias,
        tag: result.tag,
        acrUrl: result.acrUrl,
        fullImagePath: result.fullImagePath,
        dockerPullCommand: `docker pull ${result.fullImagePath}`,
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
  });
}
