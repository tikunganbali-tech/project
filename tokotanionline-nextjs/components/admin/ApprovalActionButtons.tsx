'use client'

import { useAdmin } from '@/components/providers/AdminProvider'
import { useRouter } from 'next/navigation'

export default function ApprovalActionButtons({
  approvalId,
  status,
  isSuperAdmin = false,
}: {
  approvalId: string
  status: string
  isSuperAdmin?: boolean
}) {
  // R5-FINAL A2: No isSuperAdmin from context (client-side session removed)
  // Use isSuperAdmin prop only (passed from server components)
  const { safeMode } = useAdmin()
  const router = useRouter()

  async function handle(decision: 'APPROVED' | 'REJECTED') {
    try {
      const res = await fetch('/api/actions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: approvalId, decision }),
      })

      if (!res.ok) {
        console.error('Failed to approve/reject action')
        return
      }

      router.refresh()
    } catch (error) {
      console.error('Error approving/rejecting action:', error)
    }
  }

  async function handleExecute() {
    if (!confirm('⚠️ EXECUTE action ini? Proses tidak bisa dibatalkan!')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/actions/${approvalId}/execute`, {
        method: 'POST',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(`❌ Execution failed: ${data.error || data.message || 'Unknown error'}`)
        return
      }

      alert('✅ Action executed successfully!')
      router.refresh()
    } catch (error) {
      console.error('Error executing action:', error)
      alert('❌ Error executing action')
    }
  }

  return (
    <div className="flex gap-2">
      {status === 'PENDING' && (
        <>
          <button
            onClick={() => handle('APPROVED')}
            className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            Approve
          </button>
          <button
            onClick={() => handle('REJECTED')}
            className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Reject
          </button>
        </>
      )}

      {status === 'APPROVED' && isSuperAdmin && !safeMode && (
        <button
          onClick={handleExecute}
          className="px-3 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 font-bold"
        >
          🚀 EXECUTE
        </button>
      )}

      {status === 'EXECUTED' && (
        <span className="px-3 py-1 text-xs bg-gray-500 text-white rounded">
          ✅ Executed
        </span>
      )}
    </div>
  )
}

