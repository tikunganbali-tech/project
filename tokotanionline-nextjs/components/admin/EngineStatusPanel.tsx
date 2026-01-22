import { fetchEngineStatuses } from '@/lib/engine-hub';
import EngineStatusControl from './EngineStatusControl';
import EngineJobControl from './EngineJobControl';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const ENGINE_LABELS: Record<string, string> = {
  tracking: 'Tracking Engine',
  product_intelligence: 'Product Intelligence',
  content_performance: 'Content Performance',
  ads_insight: 'Ads Insight',
};

export default async function EngineStatusPanel() {
  let statuses: Record<string, string> = {};
  try {
    statuses = await fetchEngineStatuses();
  } catch (error) {
    console.error('Error fetching engine statuses:', error);
    // Set default statuses if fetch fails
    statuses = {
      tracking: 'OFF',
      product_intelligence: 'OFF',
      content_performance: 'OFF',
      ads_insight: 'OFF',
    };
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(ENGINE_LABELS).map(([key, label]) => {
          const status = statuses[key] ?? 'OFF';
          const isOn = status === 'ON';

          return (
            <div
              key={key}
              className="rounded-xl border p-4 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">{label}</h3>
                <span
                  className={`h-3 w-3 rounded-full ${
                    isOn ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                Status: <strong>{status}</strong>
              </p>

              <EngineStatusControl engine={key} status={status} />
              <EngineJobControl engine={key} jobName="manual-run" />
              
              <button className="mt-2 text-xs text-blue-600 hover:underline">
                Jalankan job terkait →
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

