import { Command } from 'commander';
import { configStore } from '../../config/store.js';
import { validateGithubToken } from '../../clients/github.js';
import { validateAcrCredentials } from '../../clients/acr.js';
import { success, error, info, spinner } from '../output.js';

const VALID_KEYS = [
  'github-token',
  'aliyun-access-key',
  'aliyun-secret-key',
  'aliyun-region',
  'acr-endpoint',
  'default-namespace',
  'api-key',
  'webhook-secret',
] as const;

type ConfigKey = typeof VALID_KEYS[number];

function isValidKey(key: string): key is ConfigKey {
  return VALID_KEYS.includes(key as ConfigKey);
}

function isSensitiveKey(key: string): boolean {
  return key.includes('token') || key.includes('secret') || key.includes('key');
}

function maskValue(value: string): string {
  if (value.length <= 8) return '****';
  return `${value.slice(0, 4)}****${value.slice(-4)}`;
}

export const configCommand = new Command('config')
  .description('Manage configuration and credentials')
  .addCommand(
    new Command('set')
      .description('Set a configuration value')
      .argument('<key>', 'Configuration key')
      .argument('<value>', 'Configuration value')
      .action(async (key: string, value: string) => {
        if (!isValidKey(key)) {
          error(`Invalid key: ${key}`);
          error(`Valid keys: ${VALID_KEYS.join(', ')}`);
          process.exit(1);
        }

        const spin = spinner(`Setting ${key}...`);
        try {
          configStore.set(key, value);
          spin.succeed();
          success(`${key} set successfully`);
        } catch (err) {
          spin.fail();
          error(`Failed to set ${key}: ${err instanceof Error ? err.message : String(err)}`);
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('get')
      .description('Get a configuration value')
      .argument('<key>', 'Configuration key')
      .option('--show', 'Show full value (even sensitive ones)')
      .action((key: string, options: { show?: boolean }) => {
        if (!isValidKey(key)) {
          error(`Invalid key: ${key}`);
          error(`Valid keys: ${VALID_KEYS.join(', ')}`);
          process.exit(1);
        }

        const value = configStore.get(key);
        if (value === undefined) {
          info(`${key} is not set`);
          return;
        }

        if (isSensitiveKey(key) && !options.show) {
          console.log(maskValue(value));
        } else {
          console.log(value);
        }
      })
  )
  .addCommand(
    new Command('list')
      .description('List all configuration values')
      .option('--show', 'Show full values (including sensitive ones)')
      .action((options: { show?: boolean }) => {
        const allConfig = configStore.list();
        if (Object.keys(allConfig).length === 0) {
          info('No configuration values set');
          return;
        }

        for (const [key, value] of Object.entries(allConfig)) {
          if (isSensitiveKey(key) && !options.show) {
            console.log(`${key}: ${maskValue(value as string)}`);
          } else {
            console.log(`${key}: ${value}`);
          }
        }
      })
  )
  .addCommand(
    new Command('validate')
      .description('Validate configured credentials')
      .action(async () => {
        const githubToken = configStore.get('github-token');
        const aliyunAccessKey = configStore.get('aliyun-access-key');
        const aliyunSecretKey = configStore.get('aliyun-secret-key');
        const aliyunRegion = configStore.get('aliyun-region') || 'cn-hongkong';
        const acrEndpoint = configStore.get('acr-endpoint'); // Optional for personal ACR

        let hasErrors = false;

        if (githubToken) {
          const spin = spinner('Validating GitHub token...');
          try {
            await validateGithubToken(githubToken);
            spin.succeed('GitHub token: valid');
          } catch (err) {
            spin.fail('GitHub token: invalid');
            error(err instanceof Error ? err.message : String(err));
            hasErrors = true;
          }
        } else {
          info('GitHub token: not set');
        }

        if (aliyunAccessKey && aliyunSecretKey) {
          const spin = spinner('Validating Aliyun credentials...');
          try {
            // For personal ACR, skip API validation (requires Docker Registry V2 auth flow)
            // Just validate that credentials are configured
            if (acrEndpoint) {
              spin.succeed('Aliyun credentials: configured (personal ACR)');
              info(`Endpoint: ${acrEndpoint}`);
            } else {
              // Enterprise ACR - validate via API
              await validateAcrCredentials(aliyunAccessKey, aliyunSecretKey, aliyunRegion, acrEndpoint);
              spin.succeed('Aliyun credentials: valid');
            }
          } catch (err) {
            spin.fail('Aliyun credentials: invalid');
            error(err instanceof Error ? err.message : String(err));
            hasErrors = true;
          }
        } else {
          info('Aliyun credentials: not set');
        }

        if (hasErrors) {
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('delete')
      .description('Delete a configuration value')
      .argument('<key>', 'Configuration key')
      .action((key: string) => {
        if (!isValidKey(key)) {
          error(`Invalid key: ${key}`);
          error(`Valid keys: ${VALID_KEYS.join(', ')}`);
          process.exit(1);
        }

        configStore.delete(key);
        success(`${key} deleted`);
      })
  );