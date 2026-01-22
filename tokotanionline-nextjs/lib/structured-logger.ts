/**
 * PHASE G — Structured Logging with JSON Format & Secret Redaction
 * 
 * Logging dengan:
 * - Level: info, warn, error
 * - Struktur JSON
 * - Redact secrets
 * - File-based rotation (size/time)
 * - Retention minimal 7 hari
 */

import fs from 'fs';
import path from 'path';

export type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
  requestId?: string;
  userId?: string;
  ip?: string;
}

// PHASE G: Secrets to redact
const SECRET_PATTERNS = [
  /password["\s:=]+([^"}\s,]+)/gi,
  /token["\s:=]+([^"}\s,]+)/gi,
  /secret["\s:=]+([^"}\s,]+)/gi,
  /api[_-]?key["\s:=]+([^"}\s,]+)/gi,
  /authorization["\s:=]+([^"}\s,]+)/gi,
  /bearer\s+([^\s]+)/gi,
];

/**
 * PHASE G: Redact secrets from log data
 * 
 * @param data - Data to redact
 * @returns Redacted data
 */
function redactSecrets(data: any): any {
  if (typeof data === 'string') {
    let redacted = data;
    for (const pattern of SECRET_PATTERNS) {
      redacted = redacted.replace(pattern, (match, secret) => {
        return match.replace(secret, '***REDACTED***');
      });
    }
    return redacted;
  }

  if (Array.isArray(data)) {
    return data.map(item => redactSecrets(item));
  }

  if (data && typeof data === 'object') {
    const redacted: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const lowerKey = key.toLowerCase();
        // Redact common secret field names
        if (lowerKey.includes('password') || 
            lowerKey.includes('token') || 
            lowerKey.includes('secret') || 
            lowerKey.includes('apikey') ||
            lowerKey.includes('authorization')) {
          redacted[key] = '***REDACTED***';
        } else {
          redacted[key] = redactSecrets(data[key]);
        }
      }
    }
    return redacted;
  }

  return data;
}

/**
 * PHASE G: Get log file path
 * 
 * @param level - Log level
 * @returns Log file path
 */
function getLogFilePath(level: LogLevel): string {
  const logDir = path.join(process.cwd(), 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return path.join(logDir, `${level}-${date}.jsonl`);
}

/**
 * PHASE G: Write log entry to file
 * 
 * @param entry - Log entry
 */
function writeLogEntry(entry: LogEntry) {
  try {
    const logFile = getLogFilePath(entry.level);
    const logLine = JSON.stringify(entry) + '\n';
    
    // Append to log file
    fs.appendFileSync(logFile, logLine, { encoding: 'utf-8' });
  } catch (error) {
    // Fallback to console if file write fails
    console.error('[logger] Failed to write log entry:', error);
    console.log(JSON.stringify(entry));
  }
}

/**
 * PHASE G: Log info message
 * 
 * @param message - Log message
 * @param context - Additional context
 */
export function logInfo(message: string, context?: Record<string, any>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'info',
    message,
    context: context ? redactSecrets(context) : undefined,
  };
  
  writeLogEntry(entry);
  
  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[INFO] ${message}`, context ? redactSecrets(context) : '');
  }
}

/**
 * PHASE G: Log warning message
 * 
 * @param message - Log message
 * @param context - Additional context
 */
export function logWarn(message: string, context?: Record<string, any>) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'warn',
    message,
    context: context ? redactSecrets(context) : undefined,
  };
  
  writeLogEntry(entry);
  
  // Also log to console
  console.warn(`[WARN] ${message}`, context ? redactSecrets(context) : '');
}

/**
 * PHASE G: Log error message
 * 
 * @param message - Log message
 * @param error - Error object
 * @param context - Additional context
 */
export function logError(
  message: string,
  error?: Error | any,
  context?: Record<string, any>
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: 'error',
    message,
    error: error ? {
      message: error.message || String(error),
      stack: error.stack,
    } : undefined,
    context: context ? redactSecrets(context) : undefined,
  };
  
  writeLogEntry(entry);
  
  // Also log to console
  console.error(`[ERROR] ${message}`, error, context ? redactSecrets(context) : '');
}

/**
 * PHASE G: Log request (for monitoring)
 * 
 * @param method - HTTP method
 * @param path - Request path
 * @param statusCode - Response status code
 * @param duration - Request duration in ms
 * @param ip - Client IP
 * @param userId - User ID (if authenticated)
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number,
  ip?: string,
  userId?: string
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
    message: `${method} ${path} ${statusCode}`,
    context: {
      method,
      path,
      statusCode,
      duration,
      ip,
      userId,
    },
  };
  
  writeLogEntry(entry);
}
