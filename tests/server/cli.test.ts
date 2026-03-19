import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Command } from 'commander';
import { DaemonManager } from '../../src/server/daemon/manager.js';
import { serverCommand } from '../../src/cli/commands/server.js';
import * as output from '../../src/cli/output.js';

// Store for mock functions that will be used in tests
const mockFns = {
  start: vi.fn(),
  stop: vi.fn(),
  status: vi.fn(),
  restart: vi.fn(),
};

// Mock DaemonManager
vi.mock('../../src/server/daemon/manager.js', () => {
  return {
    DaemonManager: vi.fn().mockImplementation(() => ({
      start: mockFns.start,
      stop: mockFns.stop,
      status: mockFns.status,
      restart: mockFns.restart,
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
  const mockOutput = vi.mocked(output);

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear mock call counts but keep implementations
    mockFns.start.mockClear();
    mockFns.stop.mockClear();
    mockFns.status.mockClear();
    mockFns.restart.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('server --start', () => {
    it('should start daemon and show success message', async () => {
      mockFns.start.mockResolvedValueOnce({ pid: 12345, port: 3000, host: '127.0.0.1' });

      const program = new Command();
      program.name('asor').addCommand(serverCommand);

      await program.parseAsync(['node', 'asor', 'server', '--start'], { from: 'node' });

      expect(mockFns.start).toHaveBeenCalled();
      expect(mockOutput.success).toHaveBeenCalledWith('Server started on 127.0.0.1:3000 (PID: 12345)');
    });

    it('should show error when already running', async () => {
      mockFns.start.mockRejectedValueOnce(new Error('Server already running (PID: 54321)'));

      const program = new Command();
      program.name('asor').addCommand(serverCommand);
      program.exitOverride();

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });

      try {
        await program.parseAsync(['node', 'asor', 'server', '--start'], { from: 'node' });
      } catch {
        // Expected - process.exit(1)
      }

      expect(mockOutput.error).toHaveBeenCalledWith('Server already running (PID: 54321)');

      exitSpy.mockRestore();
    });
  });

  describe('server --stop', () => {
    it('should stop daemon and show success message', async () => {
      mockFns.stop.mockResolvedValueOnce(undefined);

      const program = new Command();
      program.name('asor').addCommand(serverCommand);

      await program.parseAsync(['node', 'asor', 'server', '--stop'], { from: 'node' });

      expect(mockFns.stop).toHaveBeenCalled();
      expect(mockOutput.success).toHaveBeenCalledWith('Server stopped');
    });

    it('should show error when not running', async () => {
      mockFns.stop.mockRejectedValueOnce(new Error('Server is not running'));

      const program = new Command();
      program.name('asor').addCommand(serverCommand);
      program.exitOverride();

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit');
      });

      try {
        await program.parseAsync(['node', 'asor', 'server', '--stop'], { from: 'node' });
      } catch {
        // Expected
      }

      expect(mockOutput.error).toHaveBeenCalledWith('Server is not running');

      exitSpy.mockRestore();
    });
  });

  describe('server --status', () => {
    it('should show running status when server is running', async () => {
      mockFns.status.mockReturnValueOnce({
        running: true,
        pid: 12345,
        port: 3000,
        host: '127.0.0.1',
      });

      const program = new Command();
      program.name('asor').addCommand(serverCommand);

      await program.parseAsync(['node', 'asor', 'server', '--status'], { from: 'node' });

      expect(mockFns.status).toHaveBeenCalled();
      expect(mockOutput.info).toHaveBeenCalledWith('Server running (PID: 12345, port: 3000)');
    });

    it('should show not running status when server is stopped', async () => {
      mockFns.status.mockReturnValueOnce({ running: false });

      const program = new Command();
      program.name('asor').addCommand(serverCommand);

      await program.parseAsync(['node', 'asor', 'server', '--status'], { from: 'node' });

      expect(mockFns.status).toHaveBeenCalled();
      expect(mockOutput.info).toHaveBeenCalledWith('Server is not running');
    });
  });

  describe('server --restart', () => {
    it('should restart daemon and show success message', async () => {
      mockFns.restart.mockResolvedValueOnce({ pid: 67890, port: 3000, host: '127.0.0.1' });

      const program = new Command();
      program.name('asor').addCommand(serverCommand);

      await program.parseAsync(['node', 'asor', 'server', '--restart'], { from: 'node' });

      expect(mockFns.restart).toHaveBeenCalled();
      expect(mockOutput.success).toHaveBeenCalledWith('Server restarted on 127.0.0.1:3000 (PID: 67890)');
    });
  });

  describe('server (no options)', () => {
    it('should show help when no options provided', async () => {
      const program = new Command();
      program.name('asor').addCommand(serverCommand);
      program.exitOverride();

      // No error expected - just outputs help
      await program.parseAsync(['node', 'asor', 'server'], { from: 'node' });

      // No specific assertion needed - just verify it doesn't throw unexpectedly
    });
  });
});