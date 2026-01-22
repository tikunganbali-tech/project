/**
 * PHASE G — Basic Monitoring Metrics
 * 
 * Metric minimal:
 * - Request count
 * - Error rate (4xx/5xx)
 * - Latency p95
 * - Job success/fail
 * 
 * Prinsip:
 * - In-memory store (lightweight)
 * - No external dependencies
 * - Simple aggregation
 */

interface RequestMetric {
  timestamp: number;
  method: string;
  path: string;
  statusCode: number;
  duration: number;
}

interface JobMetric {
  timestamp: number;
  jobType: string;
  success: boolean;
  duration?: number;
}

// PHASE G: In-memory metrics store
const requestMetrics: RequestMetric[] = [];
const jobMetrics: JobMetric[] = [];

// PHASE G: Keep only last 1000 metrics (to prevent memory leak)
const MAX_METRICS = 1000;

/**
 * PHASE G: Record request metric
 * 
 * @param method - HTTP method
 * @param path - Request path
 * @param statusCode - Response status code
 * @param duration - Request duration in ms
 */
export function recordRequest(
  method: string,
  path: string,
  statusCode: number,
  duration: number
) {
  requestMetrics.push({
    timestamp: Date.now(),
    method,
    path,
    statusCode,
    duration,
  });

  // Keep only last MAX_METRICS
  if (requestMetrics.length > MAX_METRICS) {
    requestMetrics.shift();
  }
}

/**
 * PHASE G: Record job metric
 * 
 * @param jobType - Job type
 * @param success - Whether job succeeded
 * @param duration - Job duration in ms
 */
export function recordJob(
  jobType: string,
  success: boolean,
  duration?: number
) {
  jobMetrics.push({
    timestamp: Date.now(),
    jobType,
    success,
    duration,
  });

  // Keep only last MAX_METRICS
  if (jobMetrics.length > MAX_METRICS) {
    jobMetrics.shift();
  }
}

/**
 * PHASE G: Get request count
 * 
 * @param timeWindowMs - Time window in milliseconds (default: last 5 minutes)
 * @returns Request count
 */
export function getRequestCount(timeWindowMs: number = 5 * 60 * 1000): number {
  const cutoff = Date.now() - timeWindowMs;
  return requestMetrics.filter(m => m.timestamp >= cutoff).length;
}

/**
 * PHASE G: Get error rate (4xx/5xx)
 * 
 * @param timeWindowMs - Time window in milliseconds (default: last 5 minutes)
 * @returns Error rate (0-1)
 */
export function getErrorRate(timeWindowMs: number = 5 * 60 * 1000): number {
  const cutoff = Date.now() - timeWindowMs;
  const recent = requestMetrics.filter(m => m.timestamp >= cutoff);
  
  if (recent.length === 0) {
    return 0;
  }

  const errors = recent.filter(m => m.statusCode >= 400).length;
  return errors / recent.length;
}

/**
 * PHASE G: Get latency p95
 * 
 * @param timeWindowMs - Time window in milliseconds (default: last 5 minutes)
 * @returns P95 latency in ms
 */
export function getLatencyP95(timeWindowMs: number = 5 * 60 * 1000): number {
  const cutoff = Date.now() - timeWindowMs;
  const recent = requestMetrics
    .filter(m => m.timestamp >= cutoff)
    .map(m => m.duration)
    .sort((a, b) => a - b);

  if (recent.length === 0) {
    return 0;
  }

  const p95Index = Math.floor(recent.length * 0.95);
  return recent[p95Index] || 0;
}

/**
 * PHASE G: Get job success rate
 * 
 * @param timeWindowMs - Time window in milliseconds (default: last 5 minutes)
 * @returns Job success rate (0-1)
 */
export function getJobSuccessRate(timeWindowMs: number = 5 * 60 * 1000): number {
  const cutoff = Date.now() - timeWindowMs;
  const recent = jobMetrics.filter(m => m.timestamp >= cutoff);
  
  if (recent.length === 0) {
    return 1; // No jobs = 100% success
  }

  const successes = recent.filter(m => m.success).length;
  return successes / recent.length;
}

/**
 * PHASE G: Get all metrics summary
 * 
 * @returns Metrics summary
 */
export function getMetricsSummary() {
  const timeWindow = 5 * 60 * 1000; // 5 minutes
  
  return {
    requests: {
      count: getRequestCount(timeWindow),
      errorRate: getErrorRate(timeWindow),
      latencyP95: getLatencyP95(timeWindow),
    },
    jobs: {
      successRate: getJobSuccessRate(timeWindow),
    },
    timestamp: new Date().toISOString(),
  };
}
