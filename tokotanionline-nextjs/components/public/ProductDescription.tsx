/**
 * ProductDescription - Pure presentational component
 * 
 * Displays product description
 * Server component only - no client logic
 */

interface ProductDescriptionProps {
  description: string;
}

export default function ProductDescription({ description }: ProductDescriptionProps) {
  return (
    <div className="prose prose-lg max-w-none">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Deskripsi Produk</h2>
      <div className="text-gray-700 whitespace-pre-wrap">
        {description}
      </div>
    </div>
  );
}
