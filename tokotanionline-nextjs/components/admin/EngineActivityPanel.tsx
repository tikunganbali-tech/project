import { fetchEngineLogs } from '@/lib/engine-logs';

export default async function EngineActivityPanel() {
  let logs: any[] = [];
  let error: string | null = null;

  try {
    logs = await fetchEngineLogs(15);
  } catch (err: any) {
    error = err.message || 'Failed to fetch engine logs';
  }

  const levelBadge = (level: string) => {
    const base = 'px-2 py-0.5 rounded text-[10px] font-semibold';
    switch (level) {
      case 'ERROR':
        return `${base} bg-red-100 text-red-700`;
      case 'WARN':
        return `${base} bg-yellow-100 text-yellow-700`;
      case 'INFO':
        return `${base} bg-blue-100 text-blue-700`;
      default:
        return `${base} bg-gray-100 text-gray-700`;
    }
  };

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        Aktivitas Engine
      </h2>

      <div className="space-y-2 text-sm">
        {error && (
          <p className="text-red-500 text-xs">
            {error}
          </p>
        )}

        {!error && logs.length === 0 && (
          <p className="text-sm text-gray-500">
            Belum ada aktivitas tercatat. Sistem akan menampilkan data saat user mulai berinteraksi.
          </p>
        )}

        {!error && logs.map((log, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className={levelBadge((log as any).level)}>
                  {(log as any).level || 'INFO'}
                </span>
                <p className="font-medium text-gray-700">
                  {(log as any).message || '-'}
                </p>
              </div>
              {(log as any).jobId && (
                <p className="text-xs text-gray-500">
                  Job: <span className="font-mono">{(log as any).jobId}</span>
                </p>
              )}
            </div>

            <span className="text-xs text-gray-400">
              {new Date((log as any).timestamp).toLocaleString('id-ID')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

