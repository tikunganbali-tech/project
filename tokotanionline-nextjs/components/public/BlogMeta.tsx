/**
 * BlogMeta - Pure presentational component
 * 
 * Displays blog post metadata (date, author info)
 * Server component only - no client logic
 */

interface BlogMetaProps {
  publishedAt: string | Date;
}

export default function BlogMeta({ publishedAt }: BlogMetaProps) {
  const formatDate = (date: string | Date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="flex items-center gap-4 text-sm text-gray-600 mb-6">
      <time dateTime={typeof publishedAt === 'string' ? publishedAt : publishedAt.toISOString()}>
        {formatDate(publishedAt)}
      </time>
    </div>
  );
}
