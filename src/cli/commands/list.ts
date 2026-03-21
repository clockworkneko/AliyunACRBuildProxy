import { Command } from 'commander';
import { configStore } from '../../config/store.js';
import { listRepos } from '../../services/orchestrator.js';
import { success, error, info } from '../output.js';

interface RepoJson {
  alias: string;
  image: string;
  acrUrl: string;
  region: string;
}

function getAcrUrl(repo: any): string {
  const acrEndpoint = configStore.get('acr-endpoint');
  if (acrEndpoint) {
    return `${acrEndpoint}/${repo.acr_namespace}/${repo.acr_repo_name}`;
  }
  return `registry.${repo.acr_region}.aliyuncs.com/${repo.acr_namespace}/${repo.acr_repo_name}`;
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
          acrUrl: getAcrUrl(repo),
          region: repo.acr_region,
        }));
        console.log(JSON.stringify(output, null, 2));
        return;
      }
      
      const acrEndpoint = configStore.get('acr-endpoint');
      const regionDisplay = acrEndpoint ? 'ENDPOINT' : 'REGION';
      
      console.log();
      console.log('  ALIAS'.padEnd(25) + 'IMAGE'.padEnd(30) + 'ACR URL'.padEnd(60) + regionDisplay);
      console.log('  ' + '-'.repeat(130));
      
      for (const repo of repos) {
        const acrUrl = getAcrUrl(repo);
        const image = `${repo.image_name}:${repo.image_tag}`;
        const displayRegion = acrEndpoint ? acrEndpoint : repo.acr_region;
        console.log(
          '  ' + repo.alias.padEnd(24) + 
          image.padEnd(29) + 
          acrUrl.padEnd(59) + 
          displayRegion
        );
      }
      console.log();
      success(`${repos.length} repository mapping(s)`);
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });