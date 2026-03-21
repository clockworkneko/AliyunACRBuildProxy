import Conf from 'conf';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

const CONFIG_DIR = path.join(os.homedir(), '.asor');
const CONFIG_FILE = 'config.json';

function getMachineId(): string {
  const machineIdPath = path.join(CONFIG_DIR, '.machine-id');
  
  if (fs.existsSync(machineIdPath)) {
    return fs.readFileSync(machineIdPath, 'utf-8').trim();
  }

  const machineId = crypto.randomBytes(32).toString('hex');
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(machineIdPath, machineId, { mode: 0o600 });
  return machineId;
}

function deriveKey(): Buffer {
  const machineId = getMachineId();
  return crypto.createHash('sha256').update(machineId).digest();
}

function encrypt(text: string): string {
  const key = deriveKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  return `enc:${iv.toString('hex')}:${encrypted}`;
}

function decrypt(encryptedData: string): string {
  if (!encryptedData.startsWith('enc:')) {
    return encryptedData;
  }
  
  const parts = encryptedData.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  
  const iv = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const key = deriveKey();
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

const SENSITIVE_KEYS = ['github-token', 'aliyun-access-key', 'aliyun-secret-key', 'acr-endpoint', 'api-key', 'webhook-secret'] as const;

interface ConfigSchema {
  'github-token'?: string;
  'aliyun-access-key'?: string;
  'aliyun-secret-key'?: string;
  'aliyun-region'?: string;
  'acr-endpoint'?: string; // Personal ACR endpoint (e.g., crpi-xxx.cn-shanghai.personal.cr.aliyuncs.com)
  'default-namespace'?: string;
  'api-key'?: string;
  'webhook-secret'?: string;
  'server-port'?: number;
  'server-host'?: string;
}

class ConfigStore {
  private conf: Conf<ConfigSchema>;

  constructor() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    this.conf = new Conf<ConfigSchema>({
      projectName: 'asor',
      configName: 'config',
      cwd: CONFIG_DIR,
      encryptionKey: undefined,
    });
  }

  get<K extends keyof ConfigSchema>(key: K): ConfigSchema[K] | undefined {
    const value = this.conf.get(key);
    if (value === undefined) {
      return undefined;
    }
    
    if (SENSITIVE_KEYS.includes(key as typeof SENSITIVE_KEYS[number]) && typeof value === 'string') {
      try {
        return decrypt(value) as ConfigSchema[K];
      } catch {
        return value;
      }
    }
    
    return value;
  }

  set<K extends keyof ConfigSchema>(key: K, value: ConfigSchema[K]): void {
    if (SENSITIVE_KEYS.includes(key as typeof SENSITIVE_KEYS[number]) && typeof value === 'string') {
      this.conf.set(key, encrypt(value));
    } else {
      this.conf.set(key, value);
    }
  }

  delete<K extends keyof ConfigSchema>(key: K): void {
    this.conf.delete(key);
  }

  list(): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(this.conf.store)) {
      if (SENSITIVE_KEYS.includes(key as typeof SENSITIVE_KEYS[number]) && typeof value === 'string') {
        try {
          result[key] = decrypt(value);
        } catch {
          result[key] = value;
        }
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}

export const configStore = new ConfigStore();