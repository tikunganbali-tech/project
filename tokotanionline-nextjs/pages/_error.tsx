import NextErrorComponent from 'next/error';

/**
 * Legacy pages router error boundary.
 *
 * Some Next.js build/export paths still expect `/_error` to exist even when the
 * app primarily uses the App Router. Keeping this file avoids build-time
 * PageNotFoundError without changing runtime flow.
 */
export default NextErrorComponent;

