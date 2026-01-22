'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Item = {
  id?: string
  name?: string
  count?: number
  score?: number
  cta_type?: string
}

type SectionState = {
  loading: boolean
  data: Item[]
  error: string | null
}

export default function InsightPanel() {
  const [topProducts, setTopProducts] = useState<SectionState>({
    loading: true,
    data: [],
    error: null,
  })

  const [topCTA, setTopCTA] = useState<SectionState>({
    loading: true,
    data: [],
    error: null,
  })

  const [stagnant, setStagnant] = useState<SectionState>({
    loading: true,
    data: [],
    error: null,
  })

  useEffect(() => {
    fetch('/api/insight/top-products')
      .then(r => r.json())
      .then(res =>
        setTopProducts({ loading: false, data: res.data || [], error: null })
      )
      .catch(() =>
        setTopProducts({ loading: false, data: [], error: 'Gagal memuat data' })
      )

    fetch('/api/insight/top-cta')
      .then(r => r.json())
      .then(res =>
        setTopCTA({ loading: false, data: res.data || [], error: null })
      )
      .catch(() =>
        setTopCTA({ loading: false, data: [], error: 'Gagal memuat data' })
      )

    fetch('/api/insight/stagnant-products')
      .then(r => r.json())
      .then(res =>
        setStagnant({ loading: false, data: res.data || [], error: null })
      )
      .catch(() =>
        setStagnant({ loading: false, data: [], error: 'Gagal memuat data' })
      )
  }, [])

  return (
    <div className="bg-white rounded-xl border shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Insight & Analytics</h3>
        <Link href="/admin/insight" className="text-sm text-blue-600 hover:underline">
          Lihat detail insight lengkap →
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* TOP PRODUCTS */}
        <InsightBlock
          title="Produk Paling Diminati"
          state={topProducts}
          renderItem={(i) => (
            <span>{i.name} <span className="text-xs text-gray-500">(score {i.score})</span></span>
          )}
        />

        {/* TOP CTA */}
        <InsightBlock
          title="CTA Paling Efektif"
          state={topCTA}
          renderItem={(i) => (
            <span>{i.cta_type} <span className="text-xs text-gray-500">({i.count} klik)</span></span>
          )}
        />

        {/* STAGNANT */}
        <InsightBlock
          title="Produk Stagnan"
          state={stagnant}
          renderItem={(i) => <span>{i.name}</span>}
        />
      </div>
    </div>
  )
}

/* ------------------ */
/* Helper Component */
/* ------------------ */
function InsightBlock({
  title,
  state,
  renderItem,
}: {
  title: string
  state: SectionState
  renderItem: (item: Item) => JSX.Element
}) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-2">{title}</h4>

      {state.loading && (
        <p className="text-sm text-gray-400">Memuat data…</p>
      )}

      {!state.loading && state.data.length === 0 && (
        <p className="text-sm text-gray-400">
          Belum ada data. Sistem akan menampilkan insight saat user mulai berinteraksi.
        </p>
      )}

      {!state.loading && state.data.length > 0 && (
        <ul className="space-y-2 text-sm">
          {state.data.map((item, idx) => (
            <li key={idx} className="flex justify-between">
              {renderItem(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
