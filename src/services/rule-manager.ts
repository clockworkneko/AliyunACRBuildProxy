import { configStore } from '../config/store.js';
import { createAcrClient, listBuildRules, createBuildRule, deleteBuildRule } from '../clients/acr.js';
import { getRepoByAlias, getDb, getRulesByRepoId, insertRule, saveDb } from '../db/index.js';
import { listBranches, branchExists } from '../clients/github.js';
import type { Repo, Rule } from '../db/schema.js';

export interface RuleInfo {
  id: number;
  branchPattern: string;
  tagTemplate: string;
  acrRuleId: string | null;
  status: 'active' | 'merged' | 'deleted';
}

export interface CleanupReport {
  totalChecked: number;
  mergedBranches: Array<{ rule: Rule; branchStatus: string }>;
  deletedBranches: Array<{ rule: Rule }>;
  removedCount: number;
}

const MAX_RULES_PER_REPO = 10;

export async function listRules(alias: string): Promise<RuleInfo[]> {
  await getDb();
  
  const repo = getRepoByAlias(alias);
  if (!repo) {
    throw new Error(`Alias "${alias}" not found.`);
  }
  
  const localRules = getRulesByRepoId(repo.id);
  
  const aliyunAccessKey = configStore.get('aliyun-access-key');
  const aliyunSecretKey = configStore.get('aliyun-secret-key');
  
  if (!aliyunAccessKey || !aliyunSecretKey) {
    return localRules.map(rule => ({
      id: rule.id,
      branchPattern: rule.branch_pattern,
      tagTemplate: rule.tag_template,
      acrRuleId: rule.acr_rule_id,
      status: 'active' as const,
    }));
  }
  
  const acrClient = createAcrClient({
    accessKeyId: aliyunAccessKey,
    accessKeySecret: aliyunSecretKey,
    region: repo.acr_region,
  });
  
  const acrRules = await listBuildRules(acrClient, repo.acr_namespace, repo.acr_repo_name);
  
  const ruleInfo: RuleInfo[] = localRules.map(localRule => {
    const acrRule = acrRules.find(r => r.ruleId === localRule.acr_rule_id);
    return {
      id: localRule.id,
      branchPattern: localRule.branch_pattern,
      tagTemplate: localRule.tag_template,
      acrRuleId: localRule.acr_rule_id,
      status: acrRule ? 'active' : 'deleted',
    };
  });
  
  for (const acrRule of acrRules) {
    const exists = localRules.some(r => r.acr_rule_id === acrRule.ruleId);
    if (!exists) {
      ruleInfo.push({
        id: 0,
        branchPattern: acrRule.branch,
        tagTemplate: acrRule.tag,
        acrRuleId: acrRule.ruleId,
        status: 'active',
      });
    }
  }
  
  return ruleInfo;
}

export async function addRule(
  alias: string,
  branchPattern: string,
  tagTemplate: string
): Promise<{ rule: Rule; warning?: string }> {
  await getDb();
  
  const repo = getRepoByAlias(alias);
  if (!repo) {
    throw new Error(`Alias "${alias}" not found.`);
  }
  
  const existingRules = getRulesByRepoId(repo.id);
  if (existingRules.length >= MAX_RULES_PER_REPO) {
    throw new Error(
      `Maximum ${MAX_RULES_PER_REPO} rules allowed per repository. ` +
      `Use 'asor rules ${alias} cleanup' to remove unused rules, ` +
      `or create a new repo with a different alias.`
    );
  }
  
  const aliyunAccessKey = configStore.get('aliyun-access-key');
  const aliyunSecretKey = configStore.get('aliyun-secret-key');
  
  let acrRuleId: string | null = null;
  let warning: string | undefined;
  
  if (aliyunAccessKey && aliyunSecretKey) {
    const acrClient = createAcrClient({
      accessKeyId: aliyunAccessKey,
      accessKeySecret: aliyunSecretKey,
      region: repo.acr_region,
    });
    
    const result = await createBuildRule(
      acrClient,
      repo.acr_namespace,
      repo.acr_repo_name,
      branchPattern,
      tagTemplate
    );
    acrRuleId = result.ruleId;
    
    if (existingRules.length === MAX_RULES_PER_REPO - 1) {
      warning = `Warning: This repo now has ${MAX_RULES_PER_REPO} rules (maximum). ` +
        `Consider cleaning up merged branch rules or creating a new repo.`;
    }
  }
  
  const rule = insertRule({
    repo_id: repo.id,
    branch_pattern: branchPattern,
    tag_template: tagTemplate,
    acr_rule_id: acrRuleId,
  });
  
  return { rule, warning };
}

export async function removeRule(alias: string, ruleId: number): Promise<void> {
  await getDb();
  
  const repo = getRepoByAlias(alias);
  if (!repo) {
    throw new Error(`Alias "${alias}" not found.`);
  }
  
  const rules = getRulesByRepoId(repo.id);
  const rule = rules.find(r => r.id === ruleId);
  
  if (!rule) {
    throw new Error(`Rule ${ruleId} not found for alias "${alias}".`);
  }
  
  const aliyunAccessKey = configStore.get('aliyun-access-key');
  const aliyunSecretKey = configStore.get('aliyun-secret-key');
  
  if (rule.acr_rule_id && aliyunAccessKey && aliyunSecretKey) {
    const acrClient = createAcrClient({
      accessKeyId: aliyunAccessKey,
      accessKeySecret: aliyunSecretKey,
      region: repo.acr_region,
    });
    
    try {
      await deleteBuildRule(
        acrClient,
        repo.acr_namespace,
        repo.acr_repo_name,
        rule.acr_rule_id
      );
    } catch (err) {
      console.error(`Warning: Failed to delete ACR build rule: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  
  const database = await getDb();
  const stmt = database.prepare('DELETE FROM rules WHERE id = ?');
  stmt.bind([ruleId]);
  stmt.step();
  stmt.free();
  saveDb();
}

export async function cleanupRules(
  alias: string,
  options: { dryRun?: boolean; force?: boolean } = {}
): Promise<CleanupReport> {
  await getDb();
  
  const repo = getRepoByAlias(alias);
  if (!repo) {
    throw new Error(`Alias "${alias}" not found.`);
  }
  
  if (!repo.github_owner || !repo.github_repo) {
    throw new Error(`No GitHub repository associated with "${alias}". Cannot check branch status.`);
  }
  
  const githubToken = configStore.get('github-token');
  if (!githubToken) {
    throw new Error('GitHub token not configured. Run: asor config set github-token <token>');
  }
  
  const rules = getRulesByRepoId(repo.id);
  const report: CleanupReport = {
    totalChecked: rules.length,
    mergedBranches: [],
    deletedBranches: [],
    removedCount: 0,
  };
  
  let branches: string[] = [];
  try {
    branches = await listBranches(githubToken, repo.github_owner, repo.github_repo);
  } catch (err) {
    throw new Error(`Failed to list branches: ${err instanceof Error ? err.message : String(err)}`);
  }
  
  for (const rule of rules) {
    const branchExistsInRepo = branches.includes(rule.branch_pattern);
    
    if (!branchExistsInRepo) {
      const exists = await branchExists(githubToken, repo.github_owner, repo.github_repo, rule.branch_pattern);
      
      if (!exists) {
        report.deletedBranches.push({ rule });
      } else {
        report.mergedBranches.push({ rule, branchStatus: 'merged' });
      }
    }
  }
  
  const rulesToRemove = [...report.mergedBranches, ...report.deletedBranches];
  
  if (!options.dryRun && rulesToRemove.length > 0) {
    for (const item of rulesToRemove) {
      try {
        await removeRule(alias, item.rule.id);
        report.removedCount++;
      } catch (err) {
        console.error(`Failed to remove rule ${item.rule.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
  
  return report;
}

export async function getRuleCount(alias: string): Promise<{ current: number; max: number }> {
  await getDb();
  
  const repo = getRepoByAlias(alias);
  if (!repo) {
    throw new Error(`Alias "${alias}" not found.`);
  }
  
  const rules = getRulesByRepoId(repo.id);
  
  return {
    current: rules.length,
    max: MAX_RULES_PER_REPO,
  };
}