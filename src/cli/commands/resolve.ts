import { Command } from 'commander';
import clipboardy from 'clipboardy';
import { resolve, formatDockerPull } from '../../services/resolver.js';
import { success, error, info, dim } from '../output.js';

export const resolveCommand = new Command('resolve')
  .description('Resolve an alias to ACR image path')
  .argument('<alias>', 'Alias name (can include tag, e.g., nginx-latest:alpine)')
  .option('-c, --copy', 'Copy the image path to clipboard')
  .option('-d, --docker', 'Output as docker pull command')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (alias: string, options: { copy?: boolean; docker?: boolean; verbose?: boolean }) => {
    try {
      const result = await resolve(alias);
      
      if (options.verbose) {
        console.log();
        dim(`Alias:     ${result.alias}`);
        if (result.repo.github_owner && result.repo.github_repo) {
          dim(`GitHub:    https://github.com/${result.repo.github_owner}/${result.repo.github_repo}`);
        }
        dim(`Original:  ${result.repo.image_name}:${result.repo.image_tag}`);
        dim(`ACR:       ${result.fullImagePath}`);
        dim(`Region:    ${result.repo.acr_region}`);
        console.log();
      }
      
      let output: string;
      if (options.docker) {
        output = formatDockerPull(result.fullImagePath);
      } else {
        output = result.fullImagePath;
      }
      
      console.log(output);
      
      if (options.copy) {
        try {
          await clipboardy.write(result.fullImagePath);
          success('Copied to clipboard');
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          error(`Failed to copy to clipboard: ${msg}`);
          info('Please copy manually from the output above');
        }
      }
    } catch (err) {
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });