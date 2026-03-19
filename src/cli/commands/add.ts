import { Command } from 'commander';
import { provisionRepo } from '../../services/orchestrator.js';
import { configStore } from '../../config/store.js';
import { success, error, info, spinner, dim } from '../output.js';

export const addCommand = new Command('add')
  .description('Add a repository mapping')
  .argument('<image:tag>', 'Source image with tag (e.g., nginx:latest)')
  .option('-a, --alias <name>', 'Alias name for the mapping')
  .option('-n, --namespace <namespace>', 'ACR namespace')
  .option('-r, --region <region>', 'ACR region')
  .action(async (imageTag: string, options: { alias?: string; namespace?: string; region?: string }) => {
    const parts = imageTag.split(':');
    if (parts.length !== 2) {
      error('Invalid image:tag format. Expected format: <image>:<tag>');
      process.exit(1);
    }
    
    const [imageName, tag] = parts;
    if (!imageName || !tag) {
      error('Invalid image:tag format. Both image name and tag are required.');
      process.exit(1);
    }
    
    const githubToken = configStore.get('github-token');
    const aliyunAccessKey = configStore.get('aliyun-access-key');
    const aliyunSecretKey = configStore.get('aliyun-secret-key');
    
    if (!githubToken) {
      error('GitHub token not configured.');
      info('Run: asor config set github-token <token>');
      process.exit(1);
    }
    
    if (!aliyunAccessKey || !aliyunSecretKey) {
      error('Aliyun credentials not configured.');
      info('Run: asor config set aliyun-access-key <key>');
      info('Run: asor config set aliyun-secret-key <secret>');
      process.exit(1);
    }
    
    const spin = spinner(`Provisioning ${imageTag}...`);
    
    try {
      const result = await provisionRepo({
        imageName,
        imageTag: tag,
        alias: options.alias,
        namespace: options.namespace,
        region: options.region,
      });
      
      spin.succeed();
      success(`Repository "${result.alias}" created successfully!`);
      console.log();
      dim('ACR URL:');
      console.log(`  ${result.acrUrl}`);
      console.log();
      dim('Docker pull command:');
      console.log(`  ${result.dockerPullCommand}`);
    } catch (err) {
      spin.fail();
      error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  });