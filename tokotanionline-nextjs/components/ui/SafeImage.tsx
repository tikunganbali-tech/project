import Image from 'next/image';
import { normalizeImageSrc } from '@/lib/normalizeImageSrc';

export default function SafeImage({
  src,
  alt,
  height = 200,
}: {
  src: string;
  alt: string;
  height?: number;
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
      }}
    >
      <Image
        src={normalizeImageSrc(src)}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
    </div>
  );
}
