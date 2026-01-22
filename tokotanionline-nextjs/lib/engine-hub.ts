export type EngineStatus = 'ON' | 'OFF' | 'BUSY' | 'ERROR';

export async function fetchEngineStatuses(): Promise<Record<string, EngineStatus>> {
  const baseUrl = process.env.ENGINE_HUB_URL;

  if (!baseUrl) {
    throw new Error('ENGINE_HUB_URL not set');
  }

  const res = await fetch(`${baseUrl}/engines`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('Failed to fetch engine status');
  }

  return res.json();
}


