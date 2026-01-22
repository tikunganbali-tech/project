/**
 * FASE 7.4 — PRODUCTION LOGGER
 * 
 * Production-grade logging with file rotation support
 * - Structured logging (JSON format)
 * - Log levels: info, warn, error
 * - Automatic log rotation (via external script)
 * - Sensitive data redaction
 */

import { writeFile, appendFile, mkdir } from 'fs/promises';
import { join } from 'path';

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
}

const LOG_DIR = process.env.LOG_DIR || join(process.cwd(), 'logs');
const isProduction = process.env.NODE_ENV === 'production';

// Redact sensitive data
function redactSensitive(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'secret', 'token', 'key', 'apiKey', 'authorization'];
  const redacted = { ...data };

  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitive(redacted[key]);
    }
  }

  return redacted;
}

// Ensure log directory exists
async function ensureLogDir() {
  try {
    await mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
}

// Write log entry to file
async function writeLog(level: LogLevel, message: string, context?: Record<string, any>, error?: Error) {
  await ensureLogDir();

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: context ? redactSensitive(context) : undefined,
    error: error ? {
      message: error.message,
      stack: isProduction ? undefined : error.stack,
    } : undefined,
  };

  const logLine = JSON.stringify(entry) + '\n';
  const logFile = join(LOG_DIR, `${level}.log`);

  try {
    await appendFile(logFile, logLine, 'utf-8');
  } catch (err) {
    // Fallback to console if file write fails
    console.error(`[${level.toUpperCase()}] ${message}`, context, error);
  }

  // Also log to console in development
  if (!isProduction) {
    console.log(`[${level.toUpperCase()}] ${message}`, context || '', error || '');
  }
}

export const productionLogger = {
  info: (message: string, context?: Record<string, any>) => {
    writeLog('info', message, context).catch(console.error);
  },

  warn: (message: string, context?: Record<string, any>) => {
    writeLog('warn', message, context).catch(console.error);
  },

  error: (message: string, error?: Error, context?: Record<string, any>) => {
    writeLog('error', message, context, error).catch(console.error);
  },
};

// Engine-specific logger
export const engineLogger = {
  log: (message: string, context?: Record<string, any>) => {
    const logLine = `[${new Date().toISOString()}] [ENGINE] ${message} ${context ? JSON.stringify(redactSensitive(context)) : ''}\n`;
    const logFile = join(LOG_DIR, 'engine.log');
    appendFile(logFile, logLine, 'utf-8').catch(console.error);
  },
};

// Scheduler-specific logger
export const schedulerLogger = {
  log: (message: string, context?: Record<string, any>) => {
    const logLine = `[${new Date().toISOString()}] [SCHEDULER] ${message} ${context ? JSON.stringify(redactSensitive(context)) : ''}\n`;
    const logFile = join(LOG_DIR, 'scheduler.log');
    appendFile(logFile, logLine, 'utf-8').catch(console.error);
  },
};
