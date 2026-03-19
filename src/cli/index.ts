import { Command } from 'commander';
import { configCommand } from './commands/config.js';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { removeCommand } from './commands/remove.js';
import { resolveCommand } from './commands/resolve.js';
import { rulesCommand } from './commands/rules.js';
import { serverCommand } from './commands/server.js';

const program = new Command();

program
  .name('asor')
  .description('ACR Smart Orchestrator & Resolver - Manage Aliyun ACR repos with simple aliases')
  .version('0.1.0');

program
  .addCommand(configCommand)
  .addCommand(addCommand)
  .addCommand(listCommand)
  .addCommand(removeCommand)
  .addCommand(resolveCommand)
  .addCommand(rulesCommand)
  .addCommand(serverCommand);

program.parse();