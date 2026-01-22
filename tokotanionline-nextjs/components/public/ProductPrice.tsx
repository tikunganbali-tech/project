/**
 * ProductPrice - Pure presentational component
 * 
 * Displays product price
 * Server component only - no client logic
 */

interface ProductPriceProps {
  price: number;
}

export default function ProductPrice({ price }: ProductPriceProps) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl sm:text-4xl md:text-5xl font-bold text-green-700">
          Rp {price.toLocaleString('id-ID')}
        </span>
      </div>
      <p className="text-sm text-gray-600 mt-2">
        Harga sudah termasuk semua biaya
      </p>
    </div>
  );
}
