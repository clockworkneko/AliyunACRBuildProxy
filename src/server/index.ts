import { buildApp } from './app.js';
import { configStore } from '../config/store.js';
import type { FastifyInstance } from 'fastify';

export interface ServerConfig {
  port?: number;
  host?: string;
}

export async function startServer(config: ServerConfig = {}): Promise<FastifyInstance> {
  const port = config.port ?? configStore.get('server-port') ?? 3000;
  const host = config.host ?? configStore.get('server-host') ?? '127.0.0.1';

  const app = await buildApp({
    logger: {
      level: 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  // Health check endpoint (unauthenticated)
  app.get('/health', async (request, reply) => {
    return reply.send({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Cleanup hook
  app.addHook('onClose', async () => {
    app.log.info('Server shutdown complete');
  });

  // Handle shutdown signals
  const signals = ['SIGTERM', 'SIGINT'];
  const signalHandlers: { signal: string; handler: () => Promise<void> }[] = [];

  for (const signal of signals) {
    const handler = async () => {
      app.log.info({ signal }, 'Received shutdown signal');
      try {
        await app.close();
      } catch (err) {
        app.log.error({ err }, 'Error during shutdown');
      }
      process.exit(0);
    };
    process.on(signal, handler);
    signalHandlers.push({ signal, handler });
  }

  // Windows compatibility - also handle beforeExit
  process.on('beforeExit', async () => {
    app.log.info('Process exiting, cleaning up');
    try {
      await app.close();
    } catch {
      // Ignore errors during cleanup
    }
  });

  await app.listen({ port, host });
  app.log.info({ port, host }, 'Server started');

  return app;
}

// CLI entry point when run directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  const args = process.argv.slice(2);
  let port: number | undefined;
  let host: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--host' && args[i + 1]) {
      host = args[i + 1];
      i++;
    }
  }

  startServer({ port, host }).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}