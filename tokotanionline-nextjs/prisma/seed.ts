import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@local.dev'
  const password = 'admin123'

  const hashedPassword = await bcrypt.hash(password, 10)

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: 'Super Admin',
      passwordHash: hashedPassword,
      role: 'super_admin',
    },
  })

  console.log('✅ ADMIN CREATED')
  console.log({
    email: admin.email,
    role: admin.role,
  })

  // FASE 7.2: Seed 4 Kategori Publik Inti
  // Sesuai spesifikasi FASE 7.2.1 - KATEGORI PUBLIK INTI (FINAL)
  const categories = [
    {
      name: 'Panduan Dasar',
      slug: 'panduan-dasar',
      type: 'PANDUAN_DASAR' as const,
      description: 'Pengantar topik, konsep dasar, kesalahan umum, dan istilah penting untuk pengunjung baru.',
      summary: 'Pintu masuk website. Panduan lengkap untuk memahami dasar-dasar topik pertanian.',
      sortOrder: 1,
    },
    {
      name: 'Pendalaman & Analisis',
      slug: 'pendalaman-analisis',
      type: 'PENDALAMAN_ANALISIS' as const,
      description: 'Perbandingan, studi kasus, analisis mendalam, dan insight praktis untuk returning visitor.',
      summary: 'Alasan untuk kembali. Analisis mendalam dan studi kasus yang membangun kepercayaan & authority.',
      sortOrder: 2,
    },
    {
      name: 'Solusi & Produk',
      slug: 'solusi-produk',
      type: 'SOLUSI_PRODUK' as const,
      description: 'Cara memilih solusi, penjelasan produk, implementasi, dan use-case untuk pengunjung yang siap mempertimbangkan.',
      summary: 'Jembatan ke keputusan. Menjembatani konten ke solusi nyata tanpa hard-selling.',
      sortOrder: 3,
    },
    {
      name: 'Referensi & Update',
      slug: 'referensi-update',
      type: 'REFERENSI_UPDATE' as const,
      description: 'Update terbaru, FAQ, catatan teknis ringan, dan rujukan untuk pembaca setia.',
      summary: 'Pemelihara authority. Menjaga relevansi jangka panjang dengan update dan referensi.',
      sortOrder: 4,
    },
  ]

  for (const cat of categories) {
    const category = await prisma.contentCategory.upsert({
      where: { type: cat.type },
      update: {
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        summary: cat.summary,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
      create: {
        name: cat.name,
        slug: cat.slug,
        type: cat.type,
        description: cat.description,
        summary: cat.summary,
        sortOrder: cat.sortOrder,
        isActive: true,
      },
    })

    console.log(`✅ CATEGORY CREATED: ${category.name} (${category.slug})`)
  }

  console.log('✅ ALL CATEGORIES SEEDED')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })


