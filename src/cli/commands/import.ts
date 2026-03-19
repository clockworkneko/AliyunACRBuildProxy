import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { provisionRepo } from '../../services/orchestrator.js';
import { configStore } from '../../config/store.js';
import { success, error, info, spinner, warning } from '../output.js';

interface ImportItem {
  githubUrl: string;
  alias: string;
  namespace?: string;
  region?: string;
}

interface DockerComposeService {
  image?: string;
}

interface DockerCompose {
  services?: Record<string, DockerComposeService>;
}

export const importCommand = new Command('import')
  .description('Import repositories from JSON or docker-compose.yml')
  .argument('<file>', 'Path to import file (JSON or docker-compose.yml)')
  .option('--dry-run', 'Show what would be imported without actually importing')
  .option('--skip-existing', 'Skip repositories that already exist')
  .action(async (filePath: string, options) => {
    const spin = spinner('Reading import file...');
    
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        spin.fail();
        error(`File not found: ${filePath}`);
        return;
      }

      const ext = path.extname(filePath).toLowerCase();
      const content = fs.readFileSync(filePath, 'utf-8');
      
      let items: ImportItem[] = [];
      
      if (ext === '.json') {
        // Parse JSON file
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          items = data;
        } else if (data.repositories && Array.isArray(data.repositories)) {
          items = data.repositories;
        } else {
          spin.fail();
          error('Invalid JSON format. Expected array or { repositories: [...] }');
          return;
        }
      } else if (ext === '.yml' || ext === '.yaml') {
        // Parse docker-compose.yml
        const compose: DockerCompose = parseYaml(content);
        items = extractFromCompose(compose);
      } else {
        spin.fail();
        error('Unsupported file format. Use .json or .yml/.yaml');
        return;
      }

      spin.succeed(`Found ${items.length} repositories to import`);

      if (items.length === 0) {
        warning('No repositories found in file');
        return;
      }

      // Show preview
      info('\nPreview:');
      items.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.alias} → ${item.githubUrl}`);
      });

      if (options.dryRun) {
        info('\nDry run mode - no changes made');
        return;
      }

      // Import repositories
      const results = {
        success: 0,
        failed: 0,
        skipped: 0,
        errors: [] as string[]
      };

      for (const item of items) {
        const itemSpin = spinner(`Importing ${item.alias}...`);
        
        try {
          // Check if already exists (if skip-existing is enabled)
          if (options.skipExisting) {
            // This would need a check function in orchestrator
            // For now, we'll just try and catch the error
          }

          await provisionRepo({
            imageName: item.alias,
            imageTag: 'latest',
            alias: item.alias,
            namespace: item.namespace || configStore.get('default-namespace') || 'asor',
            region: item.region || configStore.get('aliyun-region') || 'cn-beijing',
          });

          itemSpin.succeed();
          results.success++;
        } catch (err) {
          itemSpin.fail();
          const message = err instanceof Error ? err.message : String(err);
          
          if (message.includes('already exists') && options.skipExisting) {
            results.skipped++;
            warning(`Skipped ${item.alias} - already exists`);
          } else {
            results.failed++;
            results.errors.push(`${item.alias}: ${message}`);
            error(`Failed to import ${item.alias}: ${message}`);
          }
        }
      }

      // Summary
      console.log('');
      success(`Import complete: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`);
      
      if (results.errors.length > 0) {
        console.log('');
        info('Errors:');
        results.errors.forEach(e => console.log(`  - ${e}`));
      }

    } catch (err) {
      spin.fail();
      const message = err instanceof Error ? err.message : String(err);
      error(`Import failed: ${message}`);
    }
  });

// Simple YAML parser for docker-compose
function parseYaml(content: string): DockerCompose {
  const result: DockerCompose = { services: {} };
  const lines = content.split('\n');
  let currentService: string | null = null;
  let inServices = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check if we're in services section
    if (trimmed === 'services:') {
      inServices = true;
      continue;
    }
    
    // Check for service definition (2-space indent)
    if (inServices && line.startsWith('  ') && !line.startsWith('    ') && trimmed.endsWith(':')) {
      currentService = trimmed.slice(0, -1);
      result.services![currentService] = {};
      continue;
    }
    
    // Check for image property (4-space indent)
    if (currentService && line.startsWith('    image:')) {
      const image = trimmed.replace('image:', '').trim();
      result.services![currentService].image = image;
    }
  }

  return result;
}

// Extract repositories from docker-compose
function extractFromCompose(compose: DockerCompose): ImportItem[] {
  const items: ImportItem[] = [];
  
  if (!compose.services) {
    return items;
  }

  for (const [serviceName, service] of Object.entries(compose.services)) {
    if (service.image && service.image.includes('/')) {
      // Try to construct GitHub URL from image name
      // Format: username/repo or registry/username/repo
      const parts = service.image.split('/');
      
      if (parts.length >= 2) {
        const repoPart = parts[parts.length - 1].split(':')[0]; // Remove tag
        const userPart = parts[parts.length - 2];
        
        // Only import if it looks like a GitHub repo (no registry prefix)
        if (!parts[0].includes('.') && !parts[0].includes(':')) {
          items.push({
            githubUrl: `https://github.com/${userPart}/${repoPart}`,
            alias: serviceName,
          });
        }
      }
    }
  }

  return items;
}
