import { configStore } from '../config/store.js';
import { createAcrClient, createNamespace, namespaceExists, createRepository, createBuildRule, getAcrPullUrl, getRepository, deleteRepository, listBuildRules, deleteBuildRule } from '../clients/acr.js';
import { createBranch, createFile, repoExists, createRepo, getGitHubRepo, branchExists } from '../clients/github.js';
import { getDb, insertRepo, getRepoByAlias, deleteRepo, updateRepoRepoId, insertRule, getRulesByRepoId } from '../db/index.js';
import type { Repo } from '../db/schema.js';

export interface ProvisionInput {
  imageName: string;
  imageTag: string;
  alias?: string;
  namespace?: string;
  region?: string;
}

export interface ProvisionResult {
  alias: string;
  acrUrl: string;
  dockerPullCommand: string;
  repo: Repo;
}

function generateAlias(imageName: string, imageTag: string): string {
  const safeName = imageName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  const safeTag = imageTag.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
  return `${safeName}-${safeTag}`;
}

function generateDockerfile(imageName: string, imageTag: string): string {
  return `FROM ${imageName}:${imageTag}\n`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

export async function provisionRepo(input: ProvisionInput): Promise<ProvisionResult> {
  const githubToken = configStore.get('github-token');
  const aliyunAccessKey = configStore.get('aliyun-access-key');
  const aliyunSecretKey = configStore.get('aliyun-secret-key');
  
  if (!githubToken) {
    throw new Error('GitHub token not configured. Run: asor config set github-token <token>');
  }
  
  if (!aliyunAccessKey || !aliyunSecretKey) {
    throw new Error('Aliyun credentials not configured. Run: asor config set aliyun-access-key <key> && asor config set aliyun-secret-key <secret>');
  }
  
  const region = input.region || configStore.get('aliyun-region') || 'cn-hongkong';
  const namespace = input.namespace || configStore.get('default-namespace') || 'asor';
  const alias = input.alias || generateAlias(input.imageName, input.imageTag);
  
  await getDb();
  
  const existingRepo = getRepoByAlias(alias);
  if (existingRepo) {
    throw new Error(`Alias "${alias}" already exists. Use a different alias or remove the existing one first.`);
  }
  
  const acrClient = createAcrClient({
    accessKeyId: aliyunAccessKey,
    accessKeySecret: aliyunSecretKey,
    region,
  });
  
  const nsExists = await withRetry(() => namespaceExists(acrClient, namespace));
  if (!nsExists) {
    await withRetry(() => createNamespace(acrClient, namespace));
  }
  
  const repoName = alias;
  const acrRepo = await withRetry(() => createRepository(acrClient, namespace, repoName, region));
  
  let githubOwner: string | null = null;
  let githubRepoName: string | null = null;
  let githubBranch: string | null = null;
  
  try {
    const existingRepo = await withRetry(() => repoExists(githubToken, 'asor-dockerfiles', 'asor-dockerfiles'));
    
    if (!existingRepo) {
      const newRepo = await withRetry(() => createRepo(githubToken, 'asor-dockerfiles', 'Dockerfiles for ASOR managed images'));
      githubOwner = newRepo.owner;
      githubRepoName = newRepo.repo;
    } else {
      githubOwner = 'asor-dockerfiles';
      githubRepoName = 'asor-dockerfiles';
    }
    
    const defaultBranch = (await getGitHubRepo(githubToken, githubOwner, githubRepoName)).defaultBranch;
    githubBranch = alias;
    
    const branchAlreadyExists = await withRetry(() => branchExists(githubToken, githubOwner as string, githubRepoName as string, githubBranch as string));
    
    if (!branchAlreadyExists) {
      await withRetry(() => createBranch(githubToken, githubOwner!, githubRepoName!, githubBranch!, defaultBranch));
    }
    
    const dockerfile = generateDockerfile(input.imageName, input.imageTag);
    await withRetry(() => createFile(
      githubToken,
      githubOwner!,
      githubRepoName!,
      githubBranch!,
      'Dockerfile',
      dockerfile,
      `Add Dockerfile for ${alias}`
    ));
    
    await withRetry(() => createBuildRule(acrClient, namespace, repoName, githubBranch!, input.imageTag));
  } catch (err) {
    console.error('Warning: GitHub integration failed, but ACR repo created:', err instanceof Error ? err.message : String(err));
  }
  
  const repo = insertRepo({
    alias,
    image_name: input.imageName,
    image_tag: input.imageTag,
    github_owner: githubOwner,
    github_repo: githubRepoName,
    github_branch: githubBranch,
    acr_namespace: namespace,
    acr_repo_name: repoName,
    acr_region: region,
    acr_repo_id: acrRepo.repoId,
  });
  
  const acrUrl = getAcrPullUrl(region, namespace, repoName);
  
  return {
    alias,
    acrUrl,
    dockerPullCommand: `docker pull ${acrUrl}`,
    repo,
  };
}

import { getAllRepos } from '../db/index.js';

export async function listRepos(): Promise<Repo[]> {
  await getDb();
  return getAllRepos();
}

export interface RemoveResult {
  alias: string;
  acrDeleted: boolean;
}

export async function removeRepo(alias: string, options: { force?: boolean; keepAcr?: boolean } = {}): Promise<RemoveResult> {
  const aliyunAccessKey = configStore.get('aliyun-access-key');
  const aliyunSecretKey = configStore.get('aliyun-secret-key');
  
  await getDb();
  
  const repo = getRepoByAlias(alias);
  if (!repo) {
    throw new Error(`Alias "${alias}" not found.`);
  }
  
  let acrDeleted = false;
  
  if (!options.keepAcr && aliyunAccessKey && aliyunSecretKey) {
    try {
      const acrClient = createAcrClient({
        accessKeyId: aliyunAccessKey,
        accessKeySecret: aliyunSecretKey,
        region: repo.acr_region,
      });
      
      const rules = await withRetry(() => listBuildRules(acrClient, repo.acr_namespace, repo.acr_repo_name));
      for (const rule of rules) {
        try {
          await withRetry(() => deleteBuildRule(acrClient, repo.acr_namespace, repo.acr_repo_name, rule.ruleId));
        } catch (err) {
          console.error(`Warning: Failed to delete build rule ${rule.ruleId}:`, err instanceof Error ? err.message : String(err));
        }
      }
      
      await withRetry(() => deleteRepository(acrClient, repo.acr_namespace, repo.acr_repo_name));
      acrDeleted = true;
    } catch (err) {
      if (!options.force) {
        throw new Error(`Failed to delete ACR repository: ${err instanceof Error ? err.message : String(err)}. Use --force to skip ACR deletion.`);
      }
      console.error('Warning: Failed to delete ACR repository:', err instanceof Error ? err.message : String(err));
    }
  }
  
  const deleted = deleteRepo(alias);
  if (!deleted) {
    throw new Error(`Failed to delete local record for "${alias}".`);
  }
  
  return {
    alias,
    acrDeleted,
  };
}