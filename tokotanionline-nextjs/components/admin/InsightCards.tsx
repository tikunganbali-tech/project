'use client';

import { useEffect, useState } from 'react';

interface TopProduct {
  id: string;
  name: string;
  score: number;
}

interface TopCTA {
  cta_type: string;
  count: number;
}

interface StagnantProduct {
  id: string;
  name: string;
}

interface InsightData {
  topProducts: TopProduct[];
  topCTAs: TopCTA[];
  stagnantProducts: StagnantProduct[];
}

export default function InsightCards() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchInsightData() {
      try {
        const [topProductsRes, topCTARes, stagnantRes] = await Promise.all([
          fetch('/api/insight/top-products'),
          fetch('/api/insight/top-cta'),
          fetch('/api/insight/stagnant-products'),
        ]);

        const topProducts = topProductsRes.ok
          ? (await topProductsRes.json()).data || []
          : [];

        const topCTAs = topCTARes.ok
          ? (await topCTARes.json()).data || []
          : [];

        const stagnantProducts = stagnantRes.ok
          ? (await stagnantRes.json()).data || []
          : [];

        setData({
          topProducts,
          topCTAs,
          stagnantProducts,
        });
      } catch (error) {
        console.error('Error fetching insight data:', error);
        setData({
          topProducts: [],
          topCTAs: [],
          stagnantProducts: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchInsightData();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-sm text-yellow-800">Belum cukup data untuk ditampilkan</p>
      </div>
    );
  }

  const hasData = 
    data.topProducts.length > 0 ||
    data.topCTAs.length > 0 ||
    data.stagnantProducts.length > 0;

  if (!hasData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-sm text-yellow-800">Belum cukup data untuk insight. Data akan muncul setelah ada aktivitas pengunjung.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Top Product Insight */}
      {data.topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">🔥</span>
            <h3 className="text-lg font-semibold text-gray-800">Produk Paling Diminati</h3>
          </div>
          <p className="text-gray-700 mb-2">
            <strong className="text-blue-600">{data.topProducts[0].name}</strong> mendapat{' '}
            <strong>{data.topProducts[0].score}</strong> poin interaksi dalam 7 hari terakhir.
          </p>
          {data.topProducts.length > 1 && (
            <p className="text-sm text-gray-500 mt-2">
              Produk lain yang populer: {data.topProducts.slice(1, 3).map(p => p.name).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Stagnant Products Insight */}
      {data.stagnantProducts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">⚠️</span>
            <h3 className="text-lg font-semibold text-gray-800">Produk Stagnan</h3>
          </div>
          <p className="text-gray-700 mb-2">
            <strong>{data.stagnantProducts.length}</strong> produk tidak mendapat klik CTA dalam 7 hari terakhir.
          </p>
          {data.stagnantProducts.length <= 3 && (
            <p className="text-sm text-gray-500 mt-2">
              Produk: {data.stagnantProducts.map(p => p.name).join(', ')}
            </p>
          )}
          <p className="text-sm text-blue-600 mt-3 font-medium">
            💡 Saran: Pertimbangkan promosi atau update konten untuk produk ini.
          </p>
        </div>
      )}

      {/* Top CTA Insight */}
      {data.topCTAs.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">📊</span>
            <h3 className="text-lg font-semibold text-gray-800">CTA Paling Efektif</h3>
          </div>
          <p className="text-gray-700 mb-2">
            CTA <strong className="text-green-600">{data.topCTAs[0].cta_type}</strong> mendapat{' '}
            <strong>{data.topCTAs[0].count}</strong> klik dalam 7 hari terakhir.
          </p>
          {data.topCTAs.length > 1 && (
            <p className="text-sm text-gray-500 mt-2">
              CTA lain: {data.topCTAs.slice(1, 3).map(cta => `${cta.cta_type} (${cta.count})`).join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Action Suggestion */}
      {data.stagnantProducts.length > 0 && data.topProducts.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center mb-3">
            <span className="text-2xl mr-2">🧠</span>
            <h3 className="text-lg font-semibold text-gray-800">Saran Aksi</h3>
          </div>
          <p className="text-gray-700">
            Fokuskan promosi pada <strong className="text-purple-600">{data.topProducts[0].name}</strong> yang sedang populer.
            Pertimbangkan strategi khusus untuk {data.stagnantProducts.length} produk stagnan.
          </p>
        </div>
      )}
    </div>
  );
}

