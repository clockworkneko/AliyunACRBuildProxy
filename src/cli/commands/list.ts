import { Command } from 'commander';
import { listRepos } from '../../services/orchestrator.js';
import { success, error, info } from '../output.js';

interface RepoJson {
  alias: string;
  image: string;
  acrUrl: string;
  region: string;
}

export const listCommand = new Command('list')
  .description('List all repository mappings')
  .option('-j, --json', 'Output as JSON')
  .action(async (options: { json?: boolean }) => {
    try {
      const repos = await listRepos();
      
      if (repos.length === 0) {
        info('No repository mappings found.');
        info('Add one with: asor add <image:tag>');
        return;
      }
      
      if (options.json) {
        const output: RepoJson[] = repos.map(repo => ({
          alias: repo.alias,
          image: `${repo.image_name}:${repo.image_tag}`,
          acrUrl: `registry.${repo.acr_region}.aliyuncs.com/${repo.acr_namespace}/${repo.acr_repo_name}`,
          region: repo.acr_region,
        }));
        console.log(JSON.stringify(output, null, 2));
        return;
      }
      
      console.log();
      console.log('  ALIAS'.padEnd(25) + 'IMAGE'.padEnd(30) + 'ACR URL'.padEnd(50) + 'REGION');
      console.log('  ' + '-'.repeat(120));
      
      for (const repo of repos) {
        const acrUrl = `registry.${repo.acr_region}.aliyuncs.com/${repo.acr_namespace}/${repo.acr_repo_name}`;
        const image = `${repo.image_name}:${repo.image_tag}`;
        console.log(
          '  ' + repo.alias.padEnd(24) + 
          image.padEnd(29) + 
          acrUrl.padEnd(49) + 
          repo.acr_region
        );
      }
      console.log();
      success(`${repos.length} repository mapping(s)`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });