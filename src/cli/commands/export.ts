import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { listRepos } from '../../services/orchestrator.js';
import { listRules } from '../../services/rule-manager.js';
import { success, error, info, spinner } from '../output.js';

interface ExportItem {
  alias: string;
  githubUrl: string;
  namespace: string;
  region: string;
  rules: Array<{
    branchPattern: string;
    tagTemplate: string;
  }>;
}

export const exportCommand = new Command('export')
  .description('Export repository configurations to JSON')
  .argument('[file]', 'Output file path (default: asor-export.json)')
  .option('--aliases <aliases>', 'Comma-separated list of aliases to export (default: all)')
  .option('--format <format>', 'Output format: json or yaml', 'json')
  .action(async (filePath: string | undefined, options) => {
    const outputPath = filePath || 'asor-export.json';
    const spin = spinner('Fetching repositories...');
    
    try {
      // Get list of repositories
      const repos = await listRepos();
      
      if (repos.length === 0) {
        spin.fail();
        error('No repositories found to export');
        return;
      }

      // Filter by aliases if specified
      let aliasesToExport = repos.map(r => r.alias);
      if (options.aliases) {
        const requestedAliases = options.aliases.split(',').map((a: string) => a.trim());
        aliasesToExport = aliasesToExport.filter((a: string) => requestedAliases.includes(a));
        
        if (aliasesToExport.length === 0) {
          spin.fail();
          error('No matching repositories found');
          return;
        }
      }

      spin.text = `Exporting ${aliasesToExport.length} repositories...`;

      // Export each repository
      const exportData: ExportItem[] = [];
      
      for (const alias of aliasesToExport) {
        try {
          // Find repo from the list
          const repo = repos.find(r => r.alias === alias);
          if (!repo) {
            warning(`Repository ${alias} not found, skipping`);
            continue;
          }

          // Get rules for this repository
          let rules: Array<{ branchPattern: string; tagTemplate: string }> = [];
          try {
            const ruleList = await listRules(alias);
            rules = ruleList.map(r => ({
              branchPattern: r.branchPattern,
              tagTemplate: r.tagTemplate,
            }));
          } catch {
            // Repository might not have rules yet
          }

          exportData.push({
            alias: repo.alias,
            githubUrl: `https://github.com/${repo.github_owner}/${repo.github_repo}`,
            namespace: repo.acr_namespace,
            region: repo.acr_region,
            rules,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          warning(`Failed to export ${alias}: ${message}`);
        }
      }

      spin.succeed(`Exported ${exportData.length} repositories`);

      // Generate output
      let output: string;
      
      if (options.format === 'yaml') {
        output = generateYaml(exportData);
      } else {
        output = JSON.stringify({
          version: '1.0',
          exportedAt: new Date().toISOString(),
          repositories: exportData,
        }, null, 2);
      }

      // Write to file
      fs.writeFileSync(outputPath, output, 'utf-8');

      success(`Configuration exported to: ${outputPath}`);
      info(`Total repositories: ${exportData.length}`);
      
      if (exportData.length > 0) {
        console.log('');
        info('Exported repositories:');
        exportData.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.alias}`);
        });
      }

    } catch (err) {
      spin.fail();
      const message = err instanceof Error ? err.message : String(err);
      error(`Export failed: ${message}`);
    }
  });

// Simple YAML generator
function generateYaml(data: ExportItem[]): string {
  const lines: string[] = [];
  lines.push('version: "1.0"');
  lines.push(`exportedAt: "${new Date().toISOString()}"`);
  lines.push('repositories:');
  
  for (const item of data) {
    lines.push(`  - alias: "${item.alias}"`);
    lines.push(`    githubUrl: "${item.githubUrl}"`);
    lines.push(`    namespace: "${item.namespace}"`);
    lines.push(`    region: "${item.region}"`);
    lines.push('    rules:');
    
    if (item.rules.length === 0) {
      lines.push('      []');
    } else {
      for (const rule of item.rules) {
        lines.push('      - branchPattern: ' + JSON.stringify(rule.branchPattern));
        lines.push('        tagTemplate: ' + JSON.stringify(rule.tagTemplate));
      }
    }
  }
  
  return lines.join('\n');
}

function warning(message: string): void {
  console.warn('⚠', message);
}
