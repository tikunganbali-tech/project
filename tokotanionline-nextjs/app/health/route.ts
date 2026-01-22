/**
 * Runtime convenience health endpoint.
 *
 * Requirement: `/health` should be OK (prod-like runtime checks).
 * Implementation: delegate to the canonical `/api/health` handler.
 */

export { GET, dynamic, revalidate } from '../api/health/route';

