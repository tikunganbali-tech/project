import { prisma } from '@/lib/db';

export async function getBestSellingProductSlugs(limit = 2) {
  const events = await prisma.eventLog.findMany({
    where: {
      event: {
        in: ['page_view', 'click_cta'],
      },
      url: {
        startsWith: '/products/',
      },
    },
    select: {
      url: true,
    },
  });

  const counter: Record<string, number> = {};

  for (const e of events) {
    const slug = e.url?.replace('/products/', '');
    if (!slug) continue;
    counter[slug] = (counter[slug] || 0) + 1;
  }

  const sorted = Object.entries(counter)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([slug]) => slug);

  return sorted;
}


