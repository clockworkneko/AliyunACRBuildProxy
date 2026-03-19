export interface Repo {
  id: number;
  alias: string;
  image_name: string;
  image_tag: string;
  github_owner: string | null;
  github_repo: string | null;
  github_branch: string | null;
  acr_namespace: string;
  acr_repo_name: string;
  acr_region: string;
  acr_repo_id: string | null;
  created_at: string;
}

export interface Rule {
  id: number;
  repo_id: number;
  branch_pattern: string;
  tag_template: string;
  acr_rule_id: string | null;
  created_at: string;
}

export const CREATE_REPOS_TABLE = `
CREATE TABLE IF NOT EXISTS repos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  alias TEXT UNIQUE NOT NULL,
  image_name TEXT NOT NULL,
  image_tag TEXT NOT NULL,
  github_owner TEXT,
  github_repo TEXT,
  github_branch TEXT,
  acr_namespace TEXT NOT NULL,
  acr_repo_name TEXT NOT NULL,
  acr_region TEXT NOT NULL,
  acr_repo_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)
`;

export const CREATE_RULES_TABLE = `
CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  repo_id INTEGER NOT NULL,
  branch_pattern TEXT NOT NULL,
  tag_template TEXT NOT NULL,
  acr_rule_id TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (repo_id) REFERENCES repos(id) ON DELETE CASCADE
)
`;

export const CREATE_ALIAS_INDEX = `
CREATE INDEX IF NOT EXISTS idx_repos_alias ON repos(alias)
`;