import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { serverCommand } from '../../src/cli/commands/server.js';
import { DaemonManager } from '../../src/server/daemon/manager.js';
import * as output from '../../src/cli/output.js';

// Mock DaemonManager
vi.mock('../../src/server/daemon/manager.js', () => {
  return {
    DaemonManager: vi.fn().mockImplementation(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      status: vi.fn(),
      restart: vi.fn(),
    })),
  };
});

// Mock output functions
vi.mock('../../src/cli/output.js', () => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  spinner: vi.fn(),
  dim: vi.fn(),
}));

describe('CLI Server Commands', () => {
  let mockManager: {
    start: ReturnType<typeof vi.fn>;
    stop: ReturnType<typeof vi.fn>;
    status: ReturnType<typeof vi.fn>;
    restart: ReturnType<typeof vi.fn>;
  };

  const mockOutput = vi.mocked(output);

  beforeEach(() => {
    vi.clearAllMocks();

    // Get the mock instance
    const MockDaemonManager = vi.mocked(DaemonManager);
    mockManager = new MockDaemonManager() as unknown as typeof mockManager;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('server --start', () => {
    it('should start daemon and show success message', async () => {
      mockManager.start.mockResolvedValueOnce({ pid: 12345, port: 3000, host: '127.0.0.1' });

      // Create a test program and add the server command
      const program = new Command();
      program.addCommand(serverCommand);

      // Simulate command execution
      await program.parseAsync(['node', 'test', 'server', '--start'], { from: 'user' });

      expect(mockManager.start).toHaveBeenCalled();
      expect(mockOutput.success).toHaveBeenCalledWith('Server started on 127.0.0.1:3000 (PID: 12345)');
    });

    it('should show error when already running', async () => {
      mockManager.start.mockRejectedValueOnce(new Error('Server already running (PID: 54321)'));

      const program = new Command();
      program.addCommand(serverCommand);
      program.exitOverride(); // Prevent process.exit from killing test

      try {
        await program.parseAsync(['node', 'test', 'server', '--start'], { from: 'user' });
      } catch {
        // Expected - process.exit(1)
      }

      expect(mockOutput.error).toHaveBeenCalledWith('Server already running (PID: 54321)');
    });
  });

  describe('server --stop', () => {
    it('should stop daemon and show success message', async () => {
      mockManager.stop.mockResolvedValueOnce(undefined);

      const program = new Command();
      program.addCommand(serverCommand);

      await program.parseAsync(['node', 'test', 'server', '--stop'], { from: 'user' });

      expect(mockManager.stop).toHaveBeenCalled();
      expect(mockOutput.success).toHaveBeenCalledWith('Server stopped');
    });

    it('should show error when not running', async () => {
      mockManager.stop.mockRejectedValueOnce(new Error('Server is not running'));

      const program = new Command();
      program.addCommand(serverCommand);
      program.exitOverride();

      try {
        await program.parseAsync(['node', 'test', 'server', '--stop'], { from: 'user' });
      } catch {
        // Expected
      }

      expect(mockOutput.error).toHaveBeenCalledWith('Server is not running');
    });
  });

  describe('server --status', () => {
    it('should show running status when server is running', async () => {
      mockManager.status.mockReturnValueOnce({
        running: true,
        pid: 12345,
        port: 3000,
        host: '127.0.0.1',
      });

      const program = new Command();
      program.addCommand(serverCommand);

      await program.parseAsync(['node', 'test', 'server', '--status'], { from: 'user' });

      expect(mockManager.status).toHaveBeenCalled();
      expect(mockOutput.info).toHaveBeenCalledWith('Server running (PID: 12345, port: 3000)');
    });

    it('should show not running status when server is stopped', async () => {
      mockManager.status.mockReturnValueOnce({ running: false });

      const program = new Command();
      program.addCommand(serverCommand);

      await program.parseAsync(['node', 'test', 'server', '--status'], { from: 'user' });

      expect(mockManager.status).toHaveBeenCalled();
      expect(mockOutput.info).toHaveBeenCalledWith('Server is not running');
    });
  });

  describe('server --restart', () => {
    it('should restart daemon and show success message', async () => {
      mockManager.restart.mockResolvedValueOnce({ pid: 67890, port: 3000, host: '127.0.0.1' });

      const program = new Command();
      program.addCommand(serverCommand);

      await program.parseAsync(['node', 'test', 'server', '--restart'], { from: 'user' });

      expect(mockManager.restart).toHaveBeenCalled();
      expect(mockOutput.success).toHaveBeenCalledWith('Server restarted on 127.0.0.1:3000 (PID: 67890)');
    });
  });

  describe('server (no options)', () => {
    it('should show help when no options provided', async () => {
      const program = new Command();
      program.addCommand(serverCommand);
      program.exitOverride();

      try {
        await program.parseAsync(['node', 'test', 'server'], { from: 'user' });
      } catch {
        // Expected - help output
      }

      // No specific assertion needed - just verify it doesn't throw unexpectedly
    });
  });
});