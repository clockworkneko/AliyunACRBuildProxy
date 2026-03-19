import Fastify from 'fastify';
import sensible from '@fastify/sensible';
import envelopePlugin from './middleware/envelope.js';
import authPlugin from './middleware/auth.js';
import type { FastifyInstance, FastifyError } from 'fastify';

export interface AppOptions {
  logger?: boolean | object;
}

export async function buildApp(options: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? {
      level: 'info',
      transport:
        process.env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });

  await app.register(sensible);
  await app.register(envelopePlugin);
  await app.register(authPlugin);

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error({ err: error }, 'Error occurred');

    // Handle schema validation errors
    if (error.validation) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      });
    }

    const statusCode = error.statusCode ?? 500;
    
    // Check for configuration-related errors (actionable 500 errors)
    const isConfigurationError = error.message.includes('not configured');
    
    // Map error codes based on status
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = statusCode >= 500 ? 'Internal server error' : error.message;
    
    if (isConfigurationError) {
      errorCode = 'CONFIGURATION_ERROR';
      errorMessage = error.message;
    } else if (statusCode === 400) {
      errorCode = 'VALIDATION_ERROR';
    } else if (statusCode === 401) {
      errorCode = 'UNAUTHORIZED';
    } else if (statusCode === 404) {
      errorCode = 'NOT_FOUND';
    } else if ((error as any).code) {
      errorCode = (error as any).code;
    }

    return reply.code(statusCode).send({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
      },
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
      },
    });
  });

  return app;
}