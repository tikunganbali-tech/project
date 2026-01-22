export type EngineLog = {
  level: 'INFO' | 'WARN' | 'ERROR' | string;
  message: string;
  jobId?: string;
  timestamp: string;
};

export async function fetchEngineLogs(limit = 20): Promise<EngineLog[]> {
  const baseUrl =
    process.env.ENGINE_HUB_URL ||
    process.env.GO_ENGINE_API_URL ||
    'http://localhost:8090';

  const res = await fetch(`${baseUrl}/logs?limit=${limit}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch engine logs');
  }

  return res.json();
}


