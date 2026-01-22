/**
 * COUNT CATEGORIES - Detailed Count
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function countCategories() {
  await prisma.$connect();

  const total = await prisma.category.count();
  const structural = await prisma.category.count({ where: { isStructural: true } });
  const leaf = await prisma.category.count({ where: { isStructural: false } });
  
  const level1 = await prisma.category.count({ where: { level: 1 } });
  const level2 = await prisma.category.count({ where: { level: 2 } });
  const level3 = await prisma.category.count({ where: { level: 3 } });
  const level4 = await prisma.category.count({ where: { level: 4 } });

  const contexts = await prisma.categoryContext.count();
  const structuralContexts = await prisma.categoryContext.count({
    where: {
      category: { isStructural: true }
    }
  });
  const leafContexts = await prisma.categoryContext.count({
    where: {
      category: { isStructural: false }
    }
  });

  console.log('Total categories:', total);
  console.log('Structural nodes:', structural);
  console.log('Leaf nodes:', leaf);
  console.log('Level 1:', level1);
  console.log('Level 2:', level2);
  console.log('Level 3:', level3);
  console.log('Level 4:', level4);
  console.log('Total contexts:', contexts);
  console.log('Structural contexts (should be 1):', structuralContexts);
  console.log('Leaf contexts (should be', leaf * 3, '):', leafContexts);

  await prisma.$disconnect();
}

countCategories();
