import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Runtime imports (CommonJS for ESM/CJS interop)
const openapi = require('@alicloud/openapi-core');
const $Cr = require('@alicloud/cr20160607');

const Config = openapi.$OpenApiUtil.Config;

export interface AcrConfig {
  accessKeyId: string;
  accessKeySecret: string;
  region: string;
  endpoint?: string; // For personal ACR: crpi-xxx.cn-shanghai.personal.cr.aliyuncs.com
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface AcrClient {
  getNamespaceList(request: any): Promise<any>;
  getNamespace(request: any): Promise<any>;
  createNamespace(request: any): Promise<any>;
  getRepo(request: any): Promise<any>;
  createRepo(request: any): Promise<any>;
  deleteRepo(request: any): Promise<any>;
  createRepoBuildRule(request: any): Promise<any>;
  getRepoBuildRuleList(request: any): Promise<any>;
  deleteRepoBuildRule(request: any): Promise<any>;
}

export function createAcrClient(config: AcrConfig): AcrClient {
  const openApiConfig = new Config({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
  });
  
  // Use custom endpoint if provided (personal ACR), otherwise build from region
  if (config.endpoint) {
    // Ensure endpoint has https:// prefix
    const endpoint = config.endpoint.startsWith('http') 
      ? config.endpoint 
      : `https://${config.endpoint}`;
    openApiConfig.endpoint = endpoint;
  } else {
    openApiConfig.endpoint = `registry.${config.region}.aliyuncs.com`;
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Client = $Cr.default;
  return new Client(openApiConfig);
}

export async function validateAcrCredentials(
  accessKeyId: string,
  accessKeySecret: string,
  region: string,
  endpoint?: string
): Promise<boolean> {
  const client = createAcrClient({ accessKeyId, accessKeySecret, region, endpoint });
  
  try {
    const request = new $Cr.GetNamespaceListRequest({ pageNo: 1, pageSize: 1 });
    await client.getNamespaceList(request);
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Aliyun ACR credentials validation failed: ${message}`);
  }
}

export async function listNamespaces(
  client: AcrClient
): Promise<string[]> {
  const response = await client.getNamespaceList(new $Cr.GetNamespaceListRequest({ pageNo: 1, pageSize: 100 }));
  const body = response.body as { namespaces?: Array<{ namespaceName?: string }> };
  return body.namespaces?.map(n => n.namespaceName || '').filter(Boolean) || [];
}

export async function namespaceExists(
  client: AcrClient,
  namespace: string
): Promise<boolean> {
  try {
    const response = await client.getNamespaceList(new $Cr.GetNamespaceListRequest({ 
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
  // Personal ACR: namespace is auto-created when creating first repo
  // Skip explicit namespace creation
  console.log(`ℹ️  Namespace "${namespace}" will be auto-created on first repo creation`);
}

export async function createRepository(
  client: AcrClient,
  namespace: string,
  repoName: string,
  region: string
): Promise<{ repoId: string; repoUrl: string }> {
  // Personal ACR: Skip API call (repo auto-created on first push)
  console.log(`ℹ️  Repo "${namespace}/${repoName}" will be auto-created on first push`);
  
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
    await client.getRepo(new $Cr.GetRepoRequest({
      repoNamespaceName: namespace,
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
  const request = new $Cr.DeleteRepoRequest({
    repoNamespaceName: namespace,
    repoName: repoName,
  });
  await client.deleteRepo(request);
}

export async function createBuildRule(
  client: AcrClient,
  namespace: string,
  repoName: string,
  branch: string,
  tag: string
): Promise<{ ruleId: string }> {
  const request = new $Cr.CreateRepoBuildRuleRequest({
    repoNamespaceName: namespace,
    repoName: repoName,
    buildRuleName: `${branch}-${tag}`,
    dockerfileLocation: './',
    buildRule: branch,
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
  const request = new $Cr.GetRepoBuildRuleListRequest({
    repoNamespaceName: namespace,
    repoName: repoName,
    pageNo: 1,
    pageSize: 50,
  });
  
  const response = await client.getRepoBuildRuleList(request);
  const body = response.body as { buildRules?: Array<{ 
    buildRuleId?: string; 
    buildRule?: string;
    imageTag?: string;
  }> };
  
  return (body.buildRules || []).map(rule => ({
    ruleId: rule.buildRuleId || '',
    branch: rule.buildRule || '',
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
    repoNamespaceName: namespace,
    repoName: repoName,
    buildRuleId: ruleId,
  });
  await client.deleteRepoBuildRule(request);
}

export function getAcrPullUrl(endpoint: string, namespace: string, repoName: string): string {
  return `${endpoint}/${namespace}/${repoName}`;
}
