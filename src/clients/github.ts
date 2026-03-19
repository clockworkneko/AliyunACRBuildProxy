import { Octokit } from '@octokit/rest';

export async function validateGithubToken(token: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  
  try {
    const { data: user } = await octokit.rest.users.getAuthenticated();
    return !!user.login;
  } catch (err) {
    throw new Error(`GitHub token validation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function getGitHubUser(token: string): Promise<string> {
  const octokit = new Octokit({ auth: token });
  const { data: user } = await octokit.rest.users.getAuthenticated();
  return user.login;
}

export async function getGitHubRepo(token: string, owner: string, repo: string): Promise<{ defaultBranch: string }> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.repos.get({ owner, repo });
  return { defaultBranch: data.default_branch || 'main' };
}

export async function listBranches(token: string, owner: string, repo: string): Promise<string[]> {
  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.repos.listBranches({ owner, repo, per_page: 100 });
  return data.map(b => b.name);
}

export async function branchExists(token: string, owner: string, repo: string, branch: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  try {
    await octokit.rest.repos.getBranch({ owner, repo, branch });
    return true;
  } catch {
    return false;
  }
}

export async function createBranch(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  baseBranch: string
): Promise<void> {
  const octokit = new Octokit({ auth: token });
  
  const { data: ref } = await octokit.rest.git.getRef({
    owner,
    repo,
    ref: `heads/${baseBranch}`,
  });

  await octokit.rest.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: ref.object.sha,
  });
}

export async function createFile(
  token: string,
  owner: string,
  repo: string,
  branch: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const octokit = new Octokit({ auth: token });
  
  await octokit.rest.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  });
}

export async function repoExists(token: string, owner: string, repo: string): Promise<boolean> {
  const octokit = new Octokit({ auth: token });
  try {
    await octokit.rest.repos.get({ owner, repo });
    return true;
  } catch {
    return false;
  }
}

export async function createRepo(token: string, name: string, description: string): Promise<{ owner: string; repo: string }> {
  const octokit = new Octokit({ auth: token });
  
  const { data } = await octokit.rest.repos.createForAuthenticatedUser({
    name,
    description,
    private: false,
    auto_init: true,
  });

  return {
    owner: data.owner.login,
    repo: data.name,
  };
}