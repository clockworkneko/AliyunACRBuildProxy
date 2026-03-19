import { Command } from 'commander';
import { DaemonManager } from '../../server/daemon/manager.js';
import * as output from '../output.js';

export const serverCommand = new Command('server')
  .description('Manage HTTP server daemon')
  .option('--start', 'Start the HTTP server daemon')
  .option('--stop', 'Stop the HTTP server daemon')
  .option('--status', 'Check server status')
  .option('--restart', 'Restart the HTTP server daemon')
  .action(async (options) => {
    const manager = new DaemonManager();

    if (options.start) {
      try {
        const { pid, port, host } = await manager.start();
        output.success(`Server started on ${host}:${port} (PID: ${pid})`);
      } catch (err) {
        output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    } else if (options.stop) {
      try {
        await manager.stop();
        output.success('Server stopped');
      } catch (err) {
        output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    } else if (options.status) {
      const status = manager.status();
      if (status.running) {
        output.info(`Server running (PID: ${status.pid}, port: ${status.port})`);
      } else {
        output.info('Server is not running');
      }
    } else if (options.restart) {
      try {
        const { pid, port, host } = await manager.restart();
        output.success(`Server restarted on ${host}:${port} (PID: ${pid})`);
      } catch (err) {
        output.error(err instanceof Error ? err.message : String(err));
        process.exit(1);
      }
    } else {
      // No flag provided, show help
      serverCommand.outputHelp();
    }
  });