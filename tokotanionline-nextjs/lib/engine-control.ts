export async function controlEngine(
  engineName: string,
  action: 'start' | 'stop'
) {
  const res = await fetch(
    `/api/engines/control?name=${engineName}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    }
  );

  if (!res.ok) {
    throw new Error('Failed to control engine');
  }
}

