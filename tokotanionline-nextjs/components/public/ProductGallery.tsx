/**
 * ProductGallery - Pure presentational component
 * 
 * Displays product image gallery
 * Server component only - no client logic
 * 
 * TEMPORARILY USING <img> INSTEAD OF next/image FOR DEBUGGING SSR 500 ERROR
 */

// import Image from 'next/image';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

interface ProductGalleryProps {
  images: string[];
  productName: string;
}

export default function ProductGallery({ images, productName }: ProductGalleryProps) {
  // Defensive: Ensure images is array and filter out null/empty values
  const validImages = Array.isArray(images) 
    ? images.filter((img): img is string => Boolean(img && typeof img === 'string'))
    : [];

  if (validImages.length === 0) {
    return (
      <div className="w-full h-64 sm:h-80 md:h-96 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
        <span className="text-sm">Gambar Tidak Tersedia</span>
      </div>
    );
  }

  const mainImage = validImages[0];
  const thumbnails = validImages.slice(1, 5); // Show max 4 thumbnails

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative w-full h-64 sm:h-80 md:h-96 bg-gray-100 rounded-lg overflow-hidden">
        <img
          src={normalizeImageSrc(mainImage)}
          alt={productName}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Thumbnails */}
      {thumbnails.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {thumbnails.map((image, index) => (
            <div
              key={index}
              className="relative w-full h-16 sm:h-20 md:h-24 bg-gray-100 rounded-lg overflow-hidden"
            >
              <img
                src={normalizeImageSrc(image)}
                alt={`${productName} - Gambar ${index + 2}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
