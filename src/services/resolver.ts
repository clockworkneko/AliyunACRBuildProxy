import { getDb, getRepoByAlias, getAllRepos } from '../db/index.js';
import type { Repo } from '../db/schema.js';

export interface ResolveResult {
  alias: string;
  tag: string | null;
  acrUrl: string;
  fullImagePath: string;
  repo: Repo;
}

export interface ResolveOptions {
  tag?: string;
}

export async function resolve(alias: string, options: ResolveOptions = {}): Promise<ResolveResult> {
  await getDb();
  
  const aliasOnly = alias.includes(':') ? alias.split(':')[0] : alias;
  const tagFromAlias = alias.includes(':') ? alias.split(':')[1] : null;
  
  const repo = getRepoByAlias(aliasOnly);
  if (!repo) {
    throw new Error(`Alias "${aliasOnly}" not found. Run "asor list" to see available aliases.`);
  }
  
  const tag = options.tag || tagFromAlias || repo.image_tag;
  const acrUrl = `registry.${repo.acr_region}.aliyuncs.com/${repo.acr_namespace}/${repo.acr_repo_name}`;
  const fullImagePath = `${acrUrl}:${tag}`;
  
  return {
    alias: aliasOnly,
    tag,
    acrUrl,
    fullImagePath,
    repo,
  };
}

export async function findAliasesByImage(imageName: string): Promise<Repo[]> {
  await getDb();
  
  const allRepos = getAllRepos();
  return allRepos.filter(repo => repo.image_name === imageName);
}

export function formatDockerPull(imagePath: string): string {
  return `docker pull ${imagePath}`;
}