import crypto from 'crypto';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { configStore } from '../../config/store.js';
import { ErrorCodes } from '../errors/codes.js';

/**
 * Verify GitHub webhook HMAC-SHA256 signature
 * Uses timing-safe comparison to prevent timing attacks
 */
export function verifyGitHubSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): boolean {
  // GitHub sends signature as "sha256=<hex>"
  if (!signature.startsWith('sha256=')) {
    return false;
  }

  const expectedSignature = signature.slice(7); // Remove "sha256=" prefix

  // Compute HMAC
  const hmac = crypto.createHmac('sha256', secret);
  const payloadBuffer = typeof payload === 'string' ? Buffer.from(payload) : payload;
  hmac.update(payloadBuffer);
  const computedSignature = hmac.digest('hex');

  // Timing-safe comparison
  const expectedBuf = Buffer.from(expectedSignature, 'hex');
  const computedBuf = Buffer.from(computedSignature, 'hex');

  if (expectedBuf.length !== computedBuf.length) {
    // Still perform comparison to maintain constant time
    crypto.timingSafeEqual(computedBuf, computedBuf);
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, computedBuf);
}

/**
 * Fastify hook for GitHub webhook authentication
 * Skips API key check and uses HMAC signature instead
 */
export async function webhookAuthHook(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const signature = request.headers['x-hub-signature-256'];
  const secret = configStore.get('webhook-secret');

  if (!secret) {
    throw app.httpErrors.internalServerError(
      'Webhook secret not configured. Run: asor config set webhook-secret <secret>'
    );
  }

  if (!signature || typeof signature !== 'string') {
    throw app.httpErrors.unauthorized('Missing X-Hub-Signature-256 header');
  }

  // Get raw body - Fastify needs config: { rawBody: true } for this
  const rawBody = (request as any).rawBody || JSON.stringify(request.body);

  if (!verifyGitHubSignature(rawBody, signature, secret)) {
    throw app.httpErrors.unauthorized('Invalid webhook signature');
  }
}