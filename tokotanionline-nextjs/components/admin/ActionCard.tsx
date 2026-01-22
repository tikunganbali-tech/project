import { previewDecision } from '@/lib/decision-preview'

type ActionCardProps = {
  label: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH'
  suggestion: string
  reason: string
  category: 'PRODUCT' | 'CTA'
  action?: 'PROMOTE' | 'OPTIMIZE' | 'REVIEW'
}

const priorityColor = {
  HIGH: 'border-red-500 bg-red-50',
  MEDIUM: 'border-yellow-500 bg-yellow-50',
  LOW: 'border-gray-300 bg-gray-50',
}

export default function ActionCard({
  label,
  priority,
  suggestion,
  reason,
  category,
  action,
}: ActionCardProps) {
  // Generate preview if action type is provided
  const preview =
    action &&
    previewDecision({
      id: '',
      category,
      action,
      priority,
      label,
      suggestion,
      reason,
    })

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${priorityColor[priority]}`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        <span className="text-xs font-semibold text-gray-700">
          {priority}
        </span>
      </div>

      <p className="text-sm text-gray-800 mb-2">{suggestion}</p>

      <p className="text-xs text-gray-500 italic">
        Alasan: {reason}
      </p>

      <div className="mt-2 text-xs text-gray-600">
        Kategori: {category}
      </div>

      {preview && (
        <div className="mt-3 text-xs text-gray-700 border-t pt-2">
          <div className="font-semibold mb-1">
            Jika dijalankan, sistem akan:
          </div>
          <div className="text-gray-600 mb-1">
            Engine: {preview.engine}
          </div>
          <ul className="list-disc pl-4 space-y-1">
            {preview.effects.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

