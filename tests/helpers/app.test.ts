import { describe, it, expect } from 'vitest';
import { buildTestApp } from './app.js';

describe('Test Helper', () => {
  it('should create a valid Fastify instance', async () => {
    const app = await buildTestApp();
    expect(app).toBeDefined();
    expect(app.server).toBeDefined();
    await app.close();
  });

  it('should register sensible plugin', async () => {
    const app = await buildTestApp();
    // sensible plugin adds httpErrors decorator
    expect(app.httpErrors).toBeDefined();
    await app.close();
  });
});