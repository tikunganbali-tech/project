/**
 * STEP 1 - Event Tracking Admin Page
 * Halaman sederhana untuk melihat event log (read-only)
 */

import { getServerSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function EventsPage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/admin/login');
  }

  try {
    // Check if eventLog model exists in Prisma Client
    if (!prisma.eventLog) {
      throw new Error(
        'Prisma Client belum di-generate ulang. Jalankan: npx prisma generate (setelah stop server Next.js)'
      );
    }

    // Get total event count
    const totalEvents = await prisma.eventLog.count();

    // Get 10 latest events
    const latestEvents = await prisma.eventLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        event: true,
        url: true,
        createdAt: true,
      },
    });

    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Tracking</h1>
          <p className="text-gray-600">STEP 1 - Core Loop v1: Event masuk → DB → tampil di admin</p>
        </div>

        {/* Total Events */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Total Events</h2>
          <p className="text-3xl font-bold text-green-700">{totalEvents}</p>
        </div>

        {/* Latest Events List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">10 Event Terakhir</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    URL
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {latestEvents.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      Belum ada event
                    </td>
                  </tr>
                ) : (
                  latestEvents.map((event) => (
                    <tr key={event.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            event.event === 'page_view'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {event.event}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{event.url}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(event.createdAt).toLocaleString('id-ID', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('Error loading events:', error);
    const errorMessage = error?.message || 'Unknown error';
    const isPrismaError = errorMessage.includes('Prisma Client') || errorMessage.includes('eventLog');
    
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Events</h2>
          <p className="text-red-600 mb-2">{errorMessage}</p>
          {isPrismaError && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm font-semibold text-yellow-800 mb-2">Cara memperbaiki:</p>
              <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
                <li>Stop Next.js dev server (Ctrl+C)</li>
                <li>Jalankan: <code className="bg-yellow-100 px-1 rounded">npx prisma generate</code></li>
                <li>Restart Next.js server: <code className="bg-yellow-100 px-1 rounded">npm run dev</code></li>
              </ol>
            </div>
          )}
          <p className="text-sm text-red-500 mt-2">Please check server logs for more details.</p>
        </div>
      </div>
    );
  }
}

