import chalk from 'chalk';
import ora, { Ora } from 'ora';

export function success(message: string): void {
  console.error(chalk.green('✓'), message);
}

export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

export function warning(message: string): void {
  console.error(chalk.yellow('⚠'), message);
}

export function info(message: string): void {
  console.error(chalk.blue('ℹ'), message);
}

export function spinner(text: string): Ora {
  return ora(text).start();
}

export function dim(message: string): void {
  console.error(chalk.dim(message));
}