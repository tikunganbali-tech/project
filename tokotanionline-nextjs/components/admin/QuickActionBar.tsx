'use client';

import { useAdmin } from '@/components/providers/AdminProvider';

export default function QuickActionBar() {
  const { capabilities } = useAdmin();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <ActionCard
        title="Refresh Insight"
        desc="Perbarui data insight & analytics terbaru"
        actionLabel="Refresh"
      />

      {capabilities.canRunJob && (
        <ActionCard
          title="Jalankan Engine Job"
          desc="Jalankan job engine manual (aman)"
          actionLabel="Run Job"
        />
      )}

      <ActionCard
        title="Cek System Health"
        desc="Lihat status dan performa sistem"
        actionLabel="View"
      />
    </div>
  );
}

function ActionCard({
  title,
  desc,
  actionLabel,
}: {
  title: string;
  desc: string;
  actionLabel: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500 mt-1">{desc}</p>
      </div>
      <button className="mt-4 self-start text-sm font-semibold text-blue-600 hover:underline">
        {actionLabel} →
      </button>
    </div>
  );
}

