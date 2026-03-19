import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { configStore } from '../../config/store.js';
import {
  writePidFile,
  readPidFile,
  removePidFile,
} from './pid.js';

export interface ServerStatus {
  running: boolean;
  pid?: number;
  port?: number;
  host?: string;
}

export class DaemonManager {
  private getPort(): number {
    return configStore.get('server-port') ?? 3000;
  }

  private getHost(): string {
    return configStore.get('server-host') ?? '127.0.0.1';
  }

  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0); // Signal 0 = check existence
      return true;
    } catch {
      return false;
    }
  }

  status(): ServerStatus {
    const pid = readPidFile();

    if (pid === null) {
      return { running: false };
    }

    if (this.isProcessRunning(pid)) {
      return {
        running: true,
        pid,
        port: this.getPort(),
        host: this.getHost(),
      };
    }

    // Stale PID file - process is dead
    removePidFile();
    return { running: false };
  }

  async start(): Promise<{ pid: number; port: number; host: string }> {
    const currentStatus = this.status();
    if (currentStatus.running) {
      throw new Error(`Server already running (PID: ${currentStatus.pid})`);
    }

    const port = this.getPort();
    const host = this.getHost();

    // Get the path to the server entry point
    const serverPath = fileURLToPath(new URL('../index.ts', import.meta.url));

    // Use tsx for development
    const args = [
      '--import', 'tsx',
      serverPath,
      '--port', String(port),
      '--host', host,
    ];

    const child = spawn(process.execPath, args, {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
      windowsHide: true,
    });

    child.unref();

    const pid = child.pid!;
    writePidFile(pid);

    return { pid, port, host };
  }

  async stop(): Promise<void> {
    const currentStatus = this.status();
    if (!currentStatus.running || !currentStatus.pid) {
      throw new Error('Server is not running');
    }

    try {
      process.kill(currentStatus.pid, 'SIGTERM');
    } catch {
      // Process might already be dead
    }

    removePidFile();
  }

  async restart(): Promise<{ pid: number; port: number; host: string }> {
    const currentStatus = this.status();
    if (currentStatus.running && currentStatus.pid) {
      try {
        process.kill(currentStatus.pid, 'SIGTERM');
      } catch {
        // Process might already be dead
      }
      removePidFile();
    }

    // Small delay to ensure port is freed
    await new Promise(resolve => setTimeout(resolve, 500));

    return this.start();
  }
}