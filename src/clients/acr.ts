import { $OpenApiUtil } from '@alicloud/openapi-core';
import * as $Cr from '@alicloud/cr20181201';

const Config = $OpenApiUtil.Config;

export interface AcrConfig {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
}

interface AcrClient {
  listNamespace(request: $Cr.ListNamespaceRequest): Promise<$Cr.ListNamespaceResponse>;
  getNamespace(request: $Cr.GetNamespaceRequest): Promise<$Cr.GetNamespaceResponse>;
  createNamespace(request: $Cr.CreateNamespaceRequest): Promise<$Cr.CreateNamespaceResponse>;
  getRepository(request: $Cr.GetRepositoryRequest): Promise<$Cr.GetRepositoryResponse>;
  createRepository(request: $Cr.CreateRepositoryRequest): Promise<$Cr.CreateRepositoryResponse>;
  deleteRepository(request: $Cr.DeleteRepositoryRequest): Promise<$Cr.DeleteRepositoryResponse>;
  createRepoBuildRule(request: $Cr.CreateRepoBuildRuleRequest): Promise<$Cr.CreateRepoBuildRuleResponse>;
  listRepoBuildRule(request: $Cr.ListRepoBuildRuleRequest): Promise<$Cr.ListRepoBuildRuleResponse>;
  deleteRepoBuildRule(request: $Cr.DeleteRepoBuildRuleRequest): Promise<$Cr.DeleteRepoBuildRuleResponse>;
  createBuildRecordByRule(request: $Cr.CreateBuildRecordByRuleRequest): Promise<$Cr.CreateBuildRecordByRuleResponse>;
}

export function createAcrClient(config: AcrConfig): AcrClient {
  const openApiConfig = new Config({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
  });
  
  openApiConfig.endpoint = `registry.${config.region}.aliyuncs.com`;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Client = ($Cr as any).default;
  return new Client(openApiConfig);
}

export async function validateAcrCredentials(
  accessKeyId: string,
  accessKeySecret: string,
  region: string
): Promise<boolean> {
  const client = createAcrClient({ accessKeyId, accessKeySecret, region });
  
  try {
    const request = new $Cr.ListNamespaceRequest({ pageNo: 1, pageSize: 1 });
    await client.listNamespace(request);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Aliyun ACR credentials validation failed: ${message}`);
  }
}

export async function listNamespaces(
  client: AcrClient
): Promise<string[]> {
  const response = await client.listNamespace(new $Cr.ListNamespaceRequest({ pageNo: 1, pageSize: 100 }));
  const body = response.body as { namespaces?: Array<{ namespaceName?: string }> };
  return body.namespaces?.map(n => n.namespaceName || '').filter(Boolean) || [];
}

export async function namespaceExists(
  client: AcrClient,
  namespace: string
): Promise<boolean> {
  try {
    const response = await client.listNamespace(new $Cr.ListNamespaceRequest({ 
      namespaceName: namespace,
      pageNo: 1, 
      pageSize: 1 
    }));
    const body = response.body as { namespaces?: Array<{ namespaceName?: string }> };
    return (body.namespaces?.length || 0) > 0;
  } catch {
    return false;
  }
}

export async function createNamespace(
  client: AcrClient,
  namespace: string
): Promise<void> {
  const request = new $Cr.CreateNamespaceRequest({
    namespaceName: namespace,
  });
  await client.createNamespace(request);
}

export async function createRepository(
  client: AcrClient,
  namespace: string,
  repoName: string,
  region: string
): Promise<{ repoId: string; repoUrl: string }> {
  const request = new $Cr.CreateRepositoryRequest({
    repoNamespace: namespace,
    repoName: repoName,
    repoType: 'PUBLIC',
    summary: `Managed by asor`,
  });
  
  await client.createRepository(request);
  
  const repoUrl = `registry.${region}.aliyuncs.com/${namespace}/${repoName}`;
  
  return {
    repoId: `${namespace}/${repoName}`,
    repoUrl,
  };
}

export async function getRepository(
  client: AcrClient,
  namespace: string,
  repoName: string
): Promise<{ repoId: string; repoUrl: string } | null> {
  try {
    await client.getRepository(new $Cr.GetRepositoryRequest({
      repoNamespace: namespace,
      repoName: repoName,
    }));
    return { repoId: `${namespace}/${repoName}`, repoUrl: '' };
  } catch {
    return null;
  }
}

export async function deleteRepository(
  client: AcrClient,
  namespace: string,
  repoName: string
): Promise<void> {
  const request = new $Cr.DeleteRepositoryRequest({
    repoNamespace: namespace,
    repoName: repoName,
  });
  await client.deleteRepository(request);
}

export async function createBuildRule(
  client: AcrClient,
  namespace: string,
  repoName: string,
  branch: string,
  tag: string
): Promise<{ ruleId: string }> {
  const request = new $Cr.CreateRepoBuildRuleRequest({
    repoNamespace: namespace,
    repoName: repoName,
    buildRuleName: `${branch}-${tag}`,
    dockerfileLocation: './',
    branch: branch,
    imageTag: tag,
  });
  
  const response = await client.createRepoBuildRule(request);
  const body = response.body as { buildRuleId?: string };
  
  return { ruleId: body.buildRuleId || '' };
}

export async function listBuildRules(
  client: AcrClient,
  namespace: string,
  repoName: string
): Promise<Array<{ ruleId: string; branch: string; tag: string }>> {
  const request = new $Cr.ListRepoBuildRuleRequest({
    repoNamespace: namespace,
    repoName: repoName,
    pageNo: 1,
    pageSize: 50,
  });
  
  const response = await client.listRepoBuildRule(request);
  const body = response.body as { buildRules?: Array<{ 
    buildRuleId?: string; 
    branch?: string;
    imageTag?: string;
  }> };
  
  return (body.buildRules || []).map(rule => ({
    ruleId: rule.buildRuleId || '',
    branch: rule.branch || '',
    tag: rule.imageTag || '',
  }));
}

export async function deleteBuildRule(
  client: AcrClient,
  namespace: string,
  repoName: string,
  ruleId: string
): Promise<void> {
  const request = new $Cr.DeleteRepoBuildRuleRequest({
    repoNamespace: namespace,
    repoName: repoName,
    buildRuleId: ruleId,
  });
  await client.deleteRepoBuildRule(request);
}

export async function triggerBuild(
  client: AcrClient,
  namespace: string,
  repoName: string,
  buildRuleId: string
): Promise<{ buildId: string }> {
  const request = new $Cr.CreateBuildRecordByRuleRequest({
    repoNamespace: namespace,
    repoName: repoName,
    buildRuleId: buildRuleId,
  });
  
  const response = await client.createBuildRecordByRule(request);
  const body = response.body as { buildId?: string };
  
  return { buildId: body.buildId || '' };
}

export function getAcrPullUrl(region: string, namespace: string, repoName: string): string {
  return `registry.${region}.aliyuncs.com/${namespace}/${repoName}`;
}