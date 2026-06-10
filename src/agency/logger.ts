import type { LogEntry } from './types.ts';

const MAX_LOGS = 1000;
const logs: LogEntry[] = [];

function push(level: LogEntry['level'], scope: string, message: string) {
  const entry: LogEntry = { ts: new Date().toISOString(), level, scope, message };
  logs.push(entry);
  if (logs.length > MAX_LOGS) logs.splice(0, logs.length - MAX_LOGS);
  const line = `[${entry.ts}] [${scope}] ${message}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (scope: string, message: string) => push('info', scope, message),
  warn: (scope: string, message: string) => push('warn', scope, message),
  error: (scope: string, message: string) => push('error', scope, message),
  recent: (limit = 200): LogEntry[] => logs.slice(-limit).reverse(),
};
