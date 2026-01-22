/**
 * PHASE E — Scheduler Job Lifecycle Utilities
 * 
 * State machine dan validasi untuk scheduler job lifecycle
 * Job lifecycle eksplisit, bisa diubah, dimatikan, dan dihapus dengan aman
 */

/**
 * PHASE E: Job Status (WAJIB)
 * Tidak boleh job "abu-abu"
 */
export type JobStatus = 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

/**
 * PHASE E: Valid state transitions
 * Tidak boleh loncat ilegal
 */
const VALID_TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  SCHEDULED: ['RUNNING', 'PAUSED', 'CANCELLED'],
  RUNNING: ['PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['RUNNING', 'CANCELLED'],
  CANCELLED: [], // Terminal state
  COMPLETED: [], // Terminal state
};

/**
 * PHASE E: Check if state transition is valid
 * 
 * @param from - Current status
 * @param to - Target status
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(from: JobStatus, to: JobStatus): boolean {
  if (from === to) {
    return true; // Same state is always valid
  }
  
  const allowedTransitions = VALID_TRANSITIONS[from] || [];
  return allowedTransitions.includes(to);
}

/**
 * PHASE E: Get allowed transitions for a status
 * 
 * @param status - Current status
 * @returns Array of allowed next statuses
 */
export function getAllowedTransitions(status: JobStatus): JobStatus[] {
  return VALID_TRANSITIONS[status] || [];
}

/**
 * PHASE E: Check if job can be deleted (hard delete)
 * 
 * Rules:
 * - RUNNING → ❌ tidak boleh hard delete
 * - COMPLETED → ✅ boleh archive / delete
 * - CANCELLED → ✅ boleh delete
 * - SCHEDULED → ✅ boleh delete (soft cancel first)
 * - PAUSED → ✅ boleh delete
 * 
 * @param status - Current job status
 * @returns true if job can be hard deleted, false otherwise
 */
export function canHardDelete(status: JobStatus): boolean {
  // PHASE E: RUNNING tidak boleh hard delete
  if (status === 'RUNNING') {
    return false;
  }
  
  // All other states can be deleted
  return true;
}

/**
 * PHASE E: Check if job can be paused
 * 
 * @param status - Current job status
 * @returns true if job can be paused, false otherwise
 */
export function canPause(status: JobStatus): boolean {
  return status === 'SCHEDULED' || status === 'RUNNING';
}

/**
 * PHASE E: Check if job can be resumed
 * 
 * @param status - Current job status
 * @returns true if job can be resumed, false otherwise
 */
export function canResume(status: JobStatus): boolean {
  return status === 'PAUSED';
}

/**
 * PHASE E: Check if job can be cancelled
 * 
 * @param status - Current job status
 * @returns true if job can be cancelled, false otherwise
 */
export function canCancel(status: JobStatus): boolean {
  // Can cancel from SCHEDULED, RUNNING, or PAUSED
  // Cannot cancel from CANCELLED or COMPLETED (already terminal)
  return status !== 'CANCELLED' && status !== 'COMPLETED';
}

/**
 * PHASE E: Check if job can be updated (schedule time, batch, etc.)
 * 
 * @param status - Current job status
 * @returns true if job can be updated, false otherwise
 */
export function canUpdate(status: JobStatus): boolean {
  // Can update SCHEDULED or PAUSED jobs
  // Cannot update RUNNING, CANCELLED, or COMPLETED
  return status === 'SCHEDULED' || status === 'PAUSED';
}

/**
 * PHASE E: Validate state transition with error message
 * 
 * @param from - Current status
 * @param to - Target status
 * @returns Error message if invalid, null if valid
 */
export function validateTransition(from: JobStatus, to: JobStatus): string | null {
  if (isValidTransition(from, to)) {
    return null;
  }
  
  const allowed = getAllowedTransitions(from);
  return `Invalid state transition: Cannot transition from ${from} to ${to}. Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`;
}
