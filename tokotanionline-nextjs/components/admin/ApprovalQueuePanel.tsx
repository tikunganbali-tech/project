import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import ApprovalActionButtons from './ApprovalActionButtons'

export default async function ApprovalQueuePanel() {
  const session = await getServerSession()

  // Fetch ALL approvals (PENDING, APPROVED, EXECUTED) for visibility
  const approvals = await prisma.actionApproval.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50, // Limit to recent 50
  })

  const isSuperAdmin = session?.user && (session.user as any).role === 'super_admin'

  return (
    <section className="bg-white rounded-xl border shadow-sm p-6">
      <h2 className="text-lg font-semibold mb-4">Antrian Persetujuan Aksi</h2>

      {approvals.length === 0 && (
        <p className="text-sm text-gray-500">
          Tidak ada aksi yang menunggu persetujuan.
        </p>
      )}

      <ul className="space-y-3">
        {approvals.map(item => (
          <li
            key={item.id}
            className="border rounded-lg p-4 flex justify-between items-start"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{item.actionType}</p>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    item.status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800'
                      : item.status === 'APPROVED'
                      ? 'bg-green-100 text-green-800'
                      : item.status === 'EXECUTED'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Priority: {item.priority} · Requested by {item.requestedBy}
              </p>
              {item.executedAt && (
                <p className="text-xs text-blue-600 mt-1">
                  ✅ Executed at: {new Date(item.executedAt).toLocaleString()}
                </p>
              )}
            </div>

            <ApprovalActionButtons
              approvalId={item.id}
              status={item.status}
              isSuperAdmin={isSuperAdmin || false}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

