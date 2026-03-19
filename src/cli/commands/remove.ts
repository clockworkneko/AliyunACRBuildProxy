import { Command } from 'commander';
import { removeRepo } from '../../services/orchestrator.js';
import { success, error, info, warning } from '../output.js';
import * as readline from 'readline';

function askConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${message} (y/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export const removeCommand = new Command('remove')
  .description('Remove a repository mapping')
  .argument('<alias>', 'Alias name of the mapping to remove')
  .option('-f, --force', 'Skip confirmation prompt')
  .option('-k, --keep-acr', 'Keep ACR repository, only remove local mapping')
  .action(async (alias: string, options: { force?: boolean; keepAcr?: boolean }) => {
    try {
      if (!options.force) {
        const message = options.keepAcr 
          ? `Remove local mapping "${alias}"?`
          : `Remove "${alias}" (including ACR repository)?`;
        
        const confirmed = await askConfirmation(message);
        if (!confirmed) {
          info('Operation cancelled.');
          return;
        }
      }
      
      const result = await removeRepo(alias, {
        force: options.force,
        keepAcr: options.keepAcr,
      });
      
      success(`Repository mapping "${result.alias}" removed.`);
      
      if (!options.keepAcr && result.acrDeleted) {
        info('ACR repository deleted.');
      } else if (options.keepAcr) {
        info('ACR repository preserved.');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });