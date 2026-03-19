import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { webhookAuthHook } from '../../middleware/webhook-auth.js';

interface GitHubWebhookPayload {
  ref?: string;
  deleted?: boolean;
  repository?: {
    full_name: string;
    name: string;
    owner: { login: string };
  };
  after?: string;
  before?: string;
  ref_type?: string; // 'branch' or 'tag'
}

interface WebhookHeaders {
  'x-github-event': string;
  'x-hub-signature-256': string;
  'x-github-delivery': string;
}

export default async function webhookRoutes(app: FastifyInstance) {
  app.post<{ Headers: WebhookHeaders; Body: GitHubWebhookPayload }>(
    '/webhook/github',
    {
      config: {
        rawBody: true, // Keep raw body for signature verification
      },
      preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
        await webhookAuthHook(app, request, reply);
      },
    },
    async (request: FastifyRequest<{ Body: GitHubWebhookPayload }>, reply: FastifyReply) => {
      const event = request.headers['x-github-event'];
      const delivery = request.headers['x-github-delivery'];
      const payload = request.body;

      app.log.info({
        event,
        delivery,
        repo: payload.repository?.full_name,
        ref: payload.ref,
      }, 'GitHub webhook received');

      // Handle different event types
      switch (event) {
        case 'push':
          return handlePushEvent(app, payload, reply);

        case 'delete':
          return handleDeleteEvent(app, payload, reply);

        default:
          // Acknowledge but don't process other events
          return reply.send({
            success: true,
            data: {
              event,
              processed: false,
              message: `Event type '${event}' is not processed`,
            },
          });
      }
    }
  );
}

async function handlePushEvent(
  app: FastifyInstance,
  payload: GitHubWebhookPayload,
  reply: FastifyReply
) {
  const repo = payload.repository?.full_name;

  // Push events might indicate merged branches
  // Check if this is a branch deletion (merged branch cleanup)
  if (payload.deleted && payload.ref?.startsWith('refs/heads/')) {
    const branch = payload.ref.replace('refs/heads/', '');

    app.log.info({ branch, repo }, 'Branch deleted (possibly merged)');

    return reply.send({
      success: true,
      data: {
        event: 'push',
        processed: true,
        action: 'branch_deleted',
        branch,
        repo,
      },
    });
  }

  return reply.send({
    success: true,
    data: {
      event: 'push',
      processed: true,
      ref: payload.ref,
      repo,
    },
  });
}

async function handleDeleteEvent(
  app: FastifyInstance,
  payload: GitHubWebhookPayload,
  reply: FastifyReply
) {
  const refType = payload.ref_type; // 'branch' or 'tag'
  const ref = payload.ref;
  const repo = payload.repository?.full_name;

  if (refType === 'branch') {
    app.log.info({ branch: ref, repo }, 'Branch deleted via delete event');

    return reply.send({
      success: true,
      data: {
        event: 'delete',
        processed: true,
        action: 'branch_deleted',
        branch: ref,
        repo,
      },
    });
  }

  return reply.send({
    success: true,
    data: {
      event: 'delete',
      processed: true,
      refType,
      ref,
      repo,
    },
  });
}