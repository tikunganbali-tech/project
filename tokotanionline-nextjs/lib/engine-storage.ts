/**
 * FASE 2 — ENGINE STORAGE
 * 
 * File-based storage untuk EngineStatus dan EngineJob
 * VPS-friendly: deterministik, tercatat, tidak ada DB berat
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { error as logError, info as logInfo } from '@/lib/logger';

// Storage paths
const STORAGE_DIR = path.join(process.cwd(), 'engine', 'storage');
const STATUS_FILE = path.join(STORAGE_DIR, 'engine-status.json');
const JOBS_FILE = path.join(STORAGE_DIR, 'engine-jobs.json');

// Ensure storage directory exists
async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    logInfo('[ENGINE-STORAGE] Storage directory ensured', { path: STORAGE_DIR });
  } catch (err: any) {
    logError('[ENGINE-STORAGE] Failed to create storage directory', {
      path: STORAGE_DIR,
      error: err.message,
    });
    throw err;
  }
}

// ============================================================================
// ENGINE STATUS
// ============================================================================

export interface EngineStatus {
  state: 'idle' | 'running' | 'error';
  lastRunAt: string | null;
  message: string;
}

const DEFAULT_STATUS: EngineStatus = {
  state: 'idle',
  lastRunAt: null,
  message: 'Engine ready',
};

/**
 * Get engine status (always succeeds, returns default if file missing)
 */
export async function getEngineStatus(): Promise<EngineStatus> {
  try {
    await ensureStorage();
    const data = await fs.readFile(STATUS_FILE, 'utf-8');
    const status = JSON.parse(data) as EngineStatus;
    
    // Validate structure
    if (!status.state || !['idle', 'running', 'error'].includes(status.state)) {
      return DEFAULT_STATUS;
    }
    
    return {
      state: status.state,
      lastRunAt: status.lastRunAt || null,
      message: status.message || 'Engine ready',
    };
  } catch (err: any) {
    // File doesn't exist or invalid - return default
    if (err.code === 'ENOENT') {
      return DEFAULT_STATUS;
    }
    logError('[ENGINE-STORAGE] Error reading status', {
      error: err.message,
    });
    return DEFAULT_STATUS;
  }
}

/**
 * Update engine status
 */
export async function updateEngineStatus(update: Partial<EngineStatus>): Promise<void> {
  try {
    await ensureStorage();
    const current = await getEngineStatus();
    const updated: EngineStatus = {
      ...current,
      ...update,
    };
    
    await fs.writeFile(STATUS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    logInfo('[ENGINE-STORAGE] Status updated', { state: updated.state });
  } catch (err: any) {
    logError('[ENGINE-STORAGE] Error updating status', {
      error: err.message,
    });
    throw err;
  }
}

// ============================================================================
// ENGINE JOBS
// ============================================================================

export interface EngineJob {
  id: string;
  type: 'manual' | 'scheduler';
  status: 'queued' | 'running' | 'done' | 'failed';
  startedAt: string | null;
  finishedAt: string | null;
  log: string;
}

/**
 * Get all jobs (returns empty array if file missing)
 */
export async function getEngineJobs(): Promise<EngineJob[]> {
  try {
    await ensureStorage();
    const data = await fs.readFile(JOBS_FILE, 'utf-8');
    const jobs = JSON.parse(data) as EngineJob[];
    
    // Validate and filter invalid entries
    return jobs.filter(job => 
      job.id && 
      ['manual', 'scheduler'].includes(job.type) &&
      ['queued', 'running', 'done', 'failed'].includes(job.status)
    );
  } catch (err: any) {
    // File doesn't exist - return empty array
    if (err.code === 'ENOENT') {
      return [];
    }
    logError('[ENGINE-STORAGE] Error reading jobs', {
      error: err.message,
    });
    return [];
  }
}

/**
 * Add a new job
 */
export async function addEngineJob(job: Omit<EngineJob, 'id'>): Promise<EngineJob> {
  try {
    await ensureStorage();
    const jobs = await getEngineJobs();
    
    const newJob: EngineJob = {
      ...job,
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
    
    jobs.push(newJob);
    
    // Keep only last 100 jobs (prevent file from growing too large)
    const trimmedJobs = jobs.slice(-100);
    
    await fs.writeFile(JOBS_FILE, JSON.stringify(trimmedJobs, null, 2), 'utf-8');
    
    logInfo('[ENGINE-STORAGE] Job added', { jobId: newJob.id, type: newJob.type });
    
    return newJob;
  } catch (err: any) {
    logError('[ENGINE-STORAGE] Error adding job', {
      error: err.message,
    });
    throw err;
  }
}

/**
 * Update a job by ID
 */
export async function updateEngineJob(
  jobId: string,
  update: Partial<Omit<EngineJob, 'id'>>
): Promise<EngineJob | null> {
  try {
    await ensureStorage();
    const jobs = await getEngineJobs();
    const index = jobs.findIndex(j => j.id === jobId);
    
    if (index === -1) {
      return null;
    }
    
    jobs[index] = {
      ...jobs[index],
      ...update,
    };
    
    await fs.writeFile(JOBS_FILE, JSON.stringify(jobs, null, 2), 'utf-8');
    
    logInfo('[ENGINE-STORAGE] Job updated', { jobId, status: jobs[index].status });
    
    return jobs[index];
  } catch (err: any) {
    logError('[ENGINE-STORAGE] Error updating job', {
      jobId,
      error: err.message,
    });
    throw err;
  }
}
