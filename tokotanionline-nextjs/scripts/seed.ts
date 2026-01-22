import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@local.dev';
  const password = 'admin123';

  console.log('🌱 Seeding admin user...');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      passwordHash: hashedPassword, // Update password in case it changed
      name: 'Super Admin',
      role: 'super_admin',
    },
    create: {
      email,
      name: 'Super Admin',
      passwordHash: hashedPassword,
      role: 'super_admin',
    },
  });

  console.log('✅ ADMIN CREATED/UPDATED');
  console.log({
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role,
  });
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

