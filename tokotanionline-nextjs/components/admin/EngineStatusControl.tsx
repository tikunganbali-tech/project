'use client';

import { controlEngine } from '@/lib/engine-control';
import { useAdmin } from '@/components/providers/AdminProvider';

export default function EngineStatusControl({
  engine,
  status,
}: {
  engine: string;
  status: string;
}) {
  const { capabilities } = useAdmin();
  const isOn = status === 'ON';

  // Hide button if user doesn't have permission to control engine
  if (!capabilities.canControlEngine) {
    return null;
  }

  async function toggle() {
    await controlEngine(engine, isOn ? 'stop' : 'start');
    window.location.reload();
  }

  return (
    <button
      onClick={toggle}
      className={`mt-3 w-full rounded-lg px-3 py-1.5 text-sm font-semibold ${
        isOn
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-green-600 text-white hover:bg-green-700'
      }`}
    >
      {isOn ? 'Matikan Engine' : 'Nyalakan Engine'}
    </button>
  );
}


