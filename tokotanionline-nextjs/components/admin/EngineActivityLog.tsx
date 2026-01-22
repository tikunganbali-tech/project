import { prisma } from '@/lib/db';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function EngineActivityLog() {
  let logs: Array<{
    id: string;
    event: string;
    url: string | null;
    createdAt: Date;
  }> = [];
  
  try {
    logs = await prisma.eventLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 15,
      select: {
        id: true,
        event: true,
        url: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('Error fetching engine activity logs:', error);
  }

  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="space-y-3 text-sm">
        {logs.length === 0 && (
          <p className="text-sm text-gray-500">
            Belum ada aktivitas tercatat. Sistem akan menampilkan data saat user mulai berinteraksi.
          </p>
        )}

        {logs.map(log => (
          <div
            key={log.id}
            className="flex items-start justify-between border-b pb-2 last:border-b-0"
          >
            <div>
              <p className="font-medium text-gray-800">
                {log.event}
              </p>
              <p className="text-gray-500 text-xs">
                {log.url || '-'}
              </p>
            </div>

            <span className="text-xs text-gray-400">
              {new Date(log.createdAt).toLocaleString('id-ID', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t mt-4">
        <Link
          href="/admin/activity"
          className="text-xs text-blue-600 hover:underline"
        >
          Lihat detail aktivitas lengkap →
        </Link>
      </div>
    </section>
  );
}

