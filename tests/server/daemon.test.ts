import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, unlinkSync, writeFileSync, readFileSync } from 'fs';
import {
  getPidFilePath,
  writePidFile,
  readPidFile,
  removePidFile,
  pidFileExists,
} from '../../src/server/daemon/pid.js';
import { DaemonManager } from '../../src/server/daemon/manager.js';
import { configStore } from '../../src/config/store.js';

// Mock configStore
vi.mock('../../src/config/store.js', () => ({
  configStore: {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}));

describe('PID File Operations', () => {
  const testPidFile = join(tmpdir(), 'asor-server.pid');

  beforeEach(() => {
    // Clean up any existing PID file
    if (existsSync(testPidFile)) {
      unlinkSync(testPidFile);
    }
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testPidFile)) {
      unlinkSync(testPidFile);
    }
  });

  describe('getPidFilePath', () => {
    it('should return path in os.tmpdir()', () => {
      const path = getPidFilePath();
      expect(path).toBe(join(tmpdir(), 'asor-server.pid'));
    });
  });

  describe('writePidFile', () => {
    it('should create PID file with correct content', () => {
      writePidFile(12345);

      expect(existsSync(testPidFile)).toBe(true);
      const content = readFileSync(testPidFile, 'utf-8').trim();
      expect(content).toBe('12345');
    });
  });

  describe('readPidFile', () => {
    it('should return null when no PID file exists', () => {
      const pid = readPidFile();
      expect(pid).toBeNull();
    });

    it('should return PID from file', () => {
      writeFileSync(testPidFile, '54321', 'utf-8');

      const pid = readPidFile();
      expect(pid).toBe(54321);
    });

    it('should return null for invalid PID content', () => {
      writeFileSync(testPidFile, 'not-a-number', 'utf-8');

      const pid = readPidFile();
      expect(pid).toBeNull();
    });
  });

  describe('removePidFile', () => {
    it('should remove existing PID file', () => {
      writeFileSync(testPidFile, '12345', 'utf-8');
      expect(existsSync(testPidFile)).toBe(true);

      removePidFile();

      expect(existsSync(testPidFile)).toBe(false);
    });

    it('should not throw when PID file does not exist', () => {
      expect(() => removePidFile()).not.toThrow();
    });
  });

  describe('pidFileExists', () => {
    it('should return false when PID file does not exist', () => {
      expect(pidFileExists()).toBe(false);
    });

    it('should return true when PID file exists', () => {
      writeFileSync(testPidFile, '12345', 'utf-8');
      expect(pidFileExists()).toBe(true);
    });
  });
});

describe('DaemonManager', () => {
  const testPidFile = join(tmpdir(), 'asor-server.pid');
  const mockConfigStore = vi.mocked(configStore);

  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up any existing PID file
    if (existsSync(testPidFile)) {
      unlinkSync(testPidFile);
    }
    // Default config values
    mockConfigStore.get.mockImplementation((key: string) => {
      if (key === 'server-port') return 3000;
      if (key === 'server-host') return '127.0.0.1';
      return undefined;
    });
  });

  afterEach(() => {
    // Clean up after each test
    if (existsSync(testPidFile)) {
      unlinkSync(testPidFile);
    }
  });

  describe('status', () => {
    it('should return running=false when no PID file exists', () => {
      const manager = new DaemonManager();
      const status = manager.status();

      expect(status.running).toBe(false);
      expect(status.pid).toBeUndefined();
    });

    it('should return running=true when PID file exists and process is alive', () => {
      // Use current process PID (which is definitely alive)
      writeFileSync(testPidFile, String(process.pid), 'utf-8');

      const manager = new DaemonManager();
      const status = manager.status();

      expect(status.running).toBe(true);
      expect(status.pid).toBe(process.pid);
      expect(status.port).toBe(3000);
      expect(status.host).toBe('127.0.0.1');

      // Clean up
      unlinkSync(testPidFile);
    });

    it('should clean up stale PID file when process is dead', () => {
      // Use a PID that definitely doesn't exist (high number)
      writeFileSync(testPidFile, '99999999', 'utf-8');

      const manager = new DaemonManager();
      const status = manager.status();

      expect(status.running).toBe(false);
      // PID file should be removed
      expect(existsSync(testPidFile)).toBe(false);
    });
  });

  describe('start', () => {
    it('should throw error when server already running', async () => {
      // Simulate running server with current process PID
      writeFileSync(testPidFile, String(process.pid), 'utf-8');

      const manager = new DaemonManager();

      await expect(manager.start()).rejects.toThrow('Server already running');

      // Clean up
      unlinkSync(testPidFile);
    });

    it('should create PID file and spawn detached process', async () => {
      const manager = new DaemonManager();
      const result = await manager.start();

      expect(result.pid).toBeDefined();
      expect(result.pid).toBeGreaterThan(0);
      expect(result.port).toBe(3000);
      expect(result.host).toBe('127.0.0.1');

      // PID file should exist
      expect(existsSync(testPidFile)).toBe(true);
      const pid = readPidFile();
      expect(pid).toBe(result.pid);

      // Clean up spawned process
      try {
        process.kill(result.pid, 'SIGTERM');
      } catch {
        // Process might have exited already
      }
      removePidFile();
    });
  });

  describe('stop', () => {
    it('should throw error when server is not running', async () => {
      const manager = new DaemonManager();

      await expect(manager.stop()).rejects.toThrow('Server is not running');
    });

    it('should kill process and remove PID file', async () => {
      // Start a server first
      const manager = new DaemonManager();
      const { pid } = await manager.start();

      // Verify it's running
      let status = manager.status();
      expect(status.running).toBe(true);

      // Stop it
      await manager.stop();

      // PID file should be removed
      expect(existsSync(testPidFile)).toBe(false);

      // Status should show not running
      status = manager.status();
      expect(status.running).toBe(false);
    });
  });

  describe('restart', () => {
    it('should stop running server and start new one', async () => {
      const manager = new DaemonManager();

      // Start first
      const result1 = await manager.start();
      expect(result1.pid).toBeGreaterThan(0);

      // Restart
      const result2 = await manager.restart();
      expect(result2.pid).toBeGreaterThan(0);
      expect(result2.pid).not.toBe(result1.pid); // Different PID after restart

      // Clean up
      await manager.stop();
    });

    it('should start server even when not running', async () => {
      const manager = new DaemonManager();

      // Restart without starting first
      const result = await manager.restart();
      expect(result.pid).toBeGreaterThan(0);
      expect(result.port).toBe(3000);
      expect(result.host).toBe('127.0.0.1');

      // Clean up
      await manager.stop();
    });
  });
});