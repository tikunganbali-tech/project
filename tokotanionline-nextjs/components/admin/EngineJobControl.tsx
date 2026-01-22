'use client';

import { useAdmin } from '@/components/providers/AdminProvider';

export default function EngineJobControl({
  engine,
  jobName,
}: {
  engine: string;
  jobName: string;
}) {
  const { capabilities } = useAdmin();

  // Hide button if user doesn't have permission to run jobs
  if (!capabilities.canRunJob) {
    return null;
  }

  async function run() {
    await fetch('/api/engines/jobs/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ engine, name: jobName }),
    });

    window.location.reload();
  }

  return (
    <button
      onClick={run}
      className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
    >
      Jalankan Job
    </button>
  );
}


