import initSqlJs, { Database } from 'sql.js';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CREATE_REPOS_TABLE, CREATE_RULES_TABLE, CREATE_ALIAS_INDEX, Repo, Rule } from './schema.js';

const DB_DIR = path.join(os.homedir(), '.asor');
const DB_FILE = path.join(DB_DIR, 'asor.db');

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (db) return db;

  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    db = new SQL.Database();
    db.run(CREATE_REPOS_TABLE);
    db.run(CREATE_RULES_TABLE);
    db.run(CREATE_ALIAS_INDEX);
    saveDb();
  }

  return db;
}

export function saveDb(): void {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  }
}

export function closeDb(): void {
  if (db) {
    saveDb();
    db.close();
    db = null;
  }
}

export function insertRepo(repo: Omit<Repo, 'id' | 'created_at'>): Repo {
  const database = db;
  if (!database) throw new Error('Database not initialized');

  const stmt = database.prepare(`
    INSERT INTO repos (alias, image_name, image_tag, github_owner, github_repo, github_branch, acr_namespace, acr_repo_name, acr_region, acr_repo_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run([
    repo.alias,
    repo.image_name,
    repo.image_tag,
    repo.github_owner || null,
    repo.github_repo || null,
    repo.github_branch || null,
    repo.acr_namespace,
    repo.acr_repo_name,
    repo.acr_region,
    repo.acr_repo_id || null,
  ]);
  stmt.free();

  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0]?.values[0]?.[0] as number;

  saveDb();

  return {
    id,
    created_at: new Date().toISOString(),
    ...repo,
  };
}

export function getRepoByAlias(alias: string): Repo | null {
  const database = db;
  if (!database) throw new Error('Database not initialized');

  const stmt = database.prepare('SELECT * FROM repos WHERE alias = ?');
  stmt.bind([alias]);

  if (stmt.step()) {
    const row = stmt.get();
    stmt.free();
    return {
      id: row[0] as number,
      alias: row[1] as string,
      image_name: row[2] as string,
      image_tag: row[3] as string,
      github_owner: row[4] as string | null,
      github_repo: row[5] as string | null,
      github_branch: row[6] as string | null,
      acr_namespace: row[7] as string,
      acr_repo_name: row[8] as string,
      acr_region: row[9] as string,
      acr_repo_id: row[10] as string | null,
      created_at: row[11] as string,
    };
  }

  stmt.free();
  return null;
}

export function getAllRepos(): Repo[] {
  const database = db;
  if (!database) throw new Error('Database not initialized');

  const results: Repo[] = [];
  const stmt = database.prepare('SELECT * FROM repos ORDER BY created_at DESC');

  while (stmt.step()) {
    const row = stmt.get();
    results.push({
      id: row[0] as number,
      alias: row[1] as string,
      image_name: row[2] as string,
      image_tag: row[3] as string,
      github_owner: row[4] as string | null,
      github_repo: row[5] as string | null,
      github_branch: row[6] as string | null,
      acr_namespace: row[7] as string,
      acr_repo_name: row[8] as string,
      acr_region: row[9] as string,
      acr_repo_id: row[10] as string | null,
      created_at: row[11] as string,
    });
  }

  stmt.free();
  return results;
}

export function deleteRepo(alias: string): boolean {
  const database = db;
  if (!database) throw new Error('Database not initialized');

  const repo = getRepoByAlias(alias);
  if (!repo) return false;

  const stmt = database.prepare('DELETE FROM repos WHERE id = ?');
  stmt.bind([repo.id]);
  stmt.step();
  stmt.free();

  saveDb();
  return true;
}

export function updateRepoRepoId(alias: string, acrRepoId: string): void {
  const database = db;
  if (!database) throw new Error('Database not initialized');

  const stmt = database.prepare('UPDATE repos SET acr_repo_id = ? WHERE alias = ?');
  stmt.run([acrRepoId, alias]);
  stmt.free();

  saveDb();
}

export function insertRule(rule: Omit<Rule, 'id' | 'created_at'>): Rule {
  const database = db;
  if (!database) throw new Error('Database not initialized');

  const stmt = database.prepare(`
    INSERT INTO rules (repo_id, branch_pattern, tag_template, acr_rule_id)
    VALUES (?, ?, ?, ?)
  `);
  
  stmt.run([
    rule.repo_id,
    rule.branch_pattern,
    rule.tag_template,
    rule.acr_rule_id || null,
  ]);
  stmt.free();

  const result = database.exec('SELECT last_insert_rowid() as id');
  const id = result[0]?.values[0]?.[0] as number;

  saveDb();

  return {
    id,
    created_at: new Date().toISOString(),
    ...rule,
  };
}

export function getRulesByRepoId(repoId: number): Rule[] {
  const database = db;
  if (!database) throw new Error('Database not initialized');

  const results: Rule[] = [];
  const stmt = database.prepare('SELECT * FROM rules WHERE repo_id = ?');
  stmt.bind([repoId]);

  while (stmt.step()) {
    const row = stmt.get();
    results.push({
      id: row[0] as number,
      repo_id: row[1] as number,
      branch_pattern: row[2] as string,
      tag_template: row[3] as string,
      acr_rule_id: row[4] as string | null,
      created_at: row[5] as string,
    });
  }

  stmt.free();
  return results;
}