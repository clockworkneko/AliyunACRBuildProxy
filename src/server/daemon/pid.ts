import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, readFileSync, writeFileSync, unlinkSync } from 'fs';

const PID_FILENAME = 'asor-server.pid';

export function getPidFilePath(): string {
  return join(tmpdir(), PID_FILENAME);
}

export function writePidFile(pid: number): void {
  writeFileSync(getPidFilePath(), String(pid), 'utf-8');
}

export function readPidFile(): number | null {
  const path = getPidFilePath();
  if (!existsSync(path)) {
    return null;
  }
  const content = readFileSync(path, 'utf-8').trim();
  const pid = parseInt(content, 10);
  return isNaN(pid) ? null : pid;
}

export function removePidFile(): void {
  const path = getPidFilePath();
  if (existsSync(path)) {
    unlinkSync(path);
  }
}

export function pidFileExists(): boolean {
  return existsSync(getPidFilePath());
}