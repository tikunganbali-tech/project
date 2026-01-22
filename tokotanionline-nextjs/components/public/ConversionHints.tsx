/**
 * PHASE F — F3: Conversion Hints (Micro-UX)
 * 
 * Prinsip:
 * - Generic & aman (bukan klaim hukum)
 * - Isyarat keputusan ringan
 * - Membantu pengambilan keputusan user
 */

interface ConversionHintsProps {
  type?: 'product' | 'blog' | 'general';
  className?: string;
}

export default function ConversionHints({ type = 'general', className = '' }: ConversionHintsProps) {
  const hints = {
    product: [
      'Sudah digunakan oleh ratusan petani',
      'Produk tersedia & siap dikirim',
      'Konsultasi sebelum beli',
    ],
    blog: [
      'Artikel berdasarkan pengalaman praktis',
      'Konsultasi gratis untuk kebutuhan Anda',
    ],
    general: [
      'Layanan terpercaya sejak 2020',
      'Konsultasi gratis tersedia',
    ],
  };

  const selectedHints = hints[type] || hints.general;

  return (
    <div className={`text-sm text-gray-600 space-y-2 ${className}`}>
      {selectedHints.map((hint, index) => (
        <div key={index} className="flex items-center gap-2">
          <svg
            className="h-4 w-4 text-green-600 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{hint}</span>
        </div>
      ))}
    </div>
  );
}
