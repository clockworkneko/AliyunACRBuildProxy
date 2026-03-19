import { Command } from 'commander';
import { listRules, addRule, removeRule, cleanupRules, getRuleCount } from '../../services/rule-manager.js';
import { success, error, warning, info, dim } from '../output.js';
import * as readline from 'readline';

const rulesCommand = new Command('rules')
  .description('Manage build rules for a repository')
  .argument('<alias>', 'Repository alias')
  .action(async (alias: string) => {
    try {
      const rules = await listRules(alias);
      
      if (rules.length === 0) {
        info(`No rules configured for "${alias}".`);
        info(`Add a rule with: asor rules ${alias} add <branch>:<tag>`);
        return;
      }
      
      console.log(`\nRules for "${alias}":\n`);
      console.log('  ID    Branch Pattern       Tag Template    Status');
      console.log('  ----  -------------------  --------------  --------');
      
      for (const rule of rules) {
        const id = rule.id || '(ACR)';
        const status = rule.status === 'active' ? 'active' : rule.status;
        console.log(`  ${String(id).padEnd(5)} ${rule.branchPattern.padEnd(20)} ${rule.tagTemplate.padEnd(15)} ${status}`);
      }
      
      console.log();
      
      const count = await getRuleCount(alias);
      dim(`  ${count.current}/${count.max} rules used`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

rulesCommand
  .command('add')
  .description('Add a new build rule')
  .argument('<branch>:<tag>', 'Branch pattern and tag template (e.g., main:latest or feature/*:feature-*)')
  .action(async (branchTag: string, options: { parent: { args: string[] } }) => {
    const alias = options.parent.args[0];
    
    const parts = branchTag.split(':');
    if (parts.length !== 2) {
      error('Invalid format. Use: <branch>:<tag> (e.g., main:latest)');
      process.exit(1);
    }
    
    const [branchPattern, tagTemplate] = parts;
    
    try {
      const result = await addRule(alias, branchPattern, tagTemplate);
      success(`Rule created: ${branchPattern} -> ${tagTemplate}`);
      
      if (result.warning) {
        warning(result.warning);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

rulesCommand
  .command('remove')
  .description('Remove a build rule')
  .argument('<rule-id>', 'Rule ID to remove')
  .option('-f, --force', 'Skip confirmation')
  .action(async (ruleIdStr: string, options: { force?: boolean; parent: { args: string[] } }) => {
    const alias = options.parent.args[0];
    const ruleId = parseInt(ruleIdStr, 10);
    
    if (isNaN(ruleId)) {
      error('Rule ID must be a number');
      process.exit(1);
    }
    
    try {
      if (!options.force) {
        const confirmed = await confirm(`Remove rule ${ruleId} from "${alias}"?`);
        if (!confirmed) {
          info('Cancelled.');
          return;
        }
      }
      
      await removeRule(alias, ruleId);
      success(`Rule ${ruleId} removed`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

rulesCommand
  .command('cleanup')
  .description('Remove rules for merged/deleted branches')
  .option('-n, --dry-run', 'Show what would be removed without removing')
  .option('-f, --force', 'Skip confirmation')
  .action(async (options: { dryRun?: boolean; force?: boolean; parent: { args: string[] } }) => {
    const alias = options.parent.args[0];
    
    try {
      info('Checking branch status...');
      
      const report = await cleanupRules(alias, { dryRun: options.dryRun, force: options.force });
      
      const rulesToRemove = [...report.mergedBranches, ...report.deletedBranches];
      
      if (rulesToRemove.length === 0) {
        success('No rules for merged/deleted branches found.');
        return;
      }
      
      if (options.dryRun) {
        console.log(`\nWould remove ${rulesToRemove.length} rules:\n`);
        
        for (const item of report.mergedBranches) {
          dim(`  - ${item.rule.branch_pattern} -> ${item.rule.tag_template} (merged)`);
        }
        for (const item of report.deletedBranches) {
          dim(`  - ${item.rule.branch_pattern} -> ${item.rule.tag_template} (branch deleted)`);
        }
        
        console.log();
        return;
      }
      
      console.log(`\nFound ${rulesToRemove.length} rules for merged/deleted branches:\n`);
      
      for (const item of report.mergedBranches) {
        dim(`  - ${item.rule.branch_pattern} -> ${item.rule.tag_template} (merged)`);
      }
      for (const item of report.deletedBranches) {
        dim(`  - ${item.rule.branch_pattern} -> ${item.rule.tag_template} (branch deleted)`);
      }
      
      console.log();
      
      if (!options.force) {
        const confirmed = await confirm('Remove these rules?');
        if (!confirmed) {
          info('Cancelled.');
          return;
        }
      }
      
      if (report.removedCount > 0) {
        success(`${report.removedCount} rules removed`);
      } else {
        warning('No rules were removed');
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });

function confirm(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export { rulesCommand };