/**
 * FASE 6.2 — Basic Logger
 * Minimal logging utility dengan redaksi data sensitif
 * 
 * Development → console
 * Production → console (ready to hook to external service later)
 * 
 * Prinsip:
 * - Redaksi data sensitif (password, token, secret)
 * - Sampling wajar (tidak log berlebihan)
 * - Error server-side tercatat
 */

type LogLevel = 'info' | 'warn' | 'error';

// FASE 6.2: Redaksi data sensitif
function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'passwordHash', 'token', 'secret', 'apiKey', 'apikey', 'authorization'];
  const redacted = Array.isArray(data) ? [...data] : { ...data };

  for (const key in redacted) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

function formatMessage(level: LogLevel, message: string, ...args: any[]): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // FASE 6.2: Redaksi args yang sensitif
  const redactedArgs = args.map(arg => redactSensitiveData(arg));
  
  return `${prefix} ${message}`;
}

/**
 * Log info message
 */
export function info(message: string, ...args: any[]): void {
  const redactedArgs = args.map(arg => redactSensitiveData(arg));
  console.log(formatMessage('info', message), ...redactedArgs);
}

/**
 * Log warning message
 */
export function warn(message: string, ...args: any[]): void {
  const redactedArgs = args.map(arg => redactSensitiveData(arg));
  console.warn(formatMessage('warn', message), ...redactedArgs);
}

/**
 * Log error message
 * FASE 6.2: Pastikan error server-side tercatat dengan redaksi
 */
export function error(message: string, ...args: any[]): void {
  const redactedArgs = args.map(arg => redactSensitiveData(arg));
  console.error(formatMessage('error', message), ...redactedArgs);
}

