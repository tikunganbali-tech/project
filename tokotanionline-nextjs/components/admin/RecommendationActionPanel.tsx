import ActionCard from './ActionCard'

async function getActions() {
  try {
    // Construct URL - use environment variable or fallback to localhost for dev
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                    (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000')
    const url = baseUrl ? `${baseUrl}/api/recommendations/actions` : '/api/recommendations/actions'
    
    const res = await fetch(url, { 
      cache: 'no-store',
    })

    if (!res.ok) {
      console.warn('[RecommendationActionPanel] Failed to fetch actions:', res.status)
      return []
    }

    const json = await res.json()
    return json.data ?? []
  } catch (error) {
    console.error('[RecommendationActionPanel] Error fetching actions:', error)
    return []
  }
}

export default async function RecommendationActionPanel() {
  const actions = await getActions()

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          Rekomendasi Tindakan Sistem
        </h2>
        <p className="text-sm text-gray-600">
          Saran otomatis berbasis aktivitas pengguna (read-only).
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="text-sm text-gray-500 italic">
          Belum ada rekomendasi. Sistem akan menampilkan saran setelah data terkumpul.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {actions.map((action: any) => (
            <ActionCard key={action.id} {...action} />
          ))}
        </div>
      )}
    </section>
  )
}

