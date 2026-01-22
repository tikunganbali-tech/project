// Product data
export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  discountPrice?: number;
  stock: number;
  unit: string;
  description: string;
  features: string[];
  imageUrl: string;
  images: string[];
  isFeatured: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

export const products: Product[] = [
  {
    id: '1',
    name: 'Benih Cabe Oriental Seed',
    slug: 'benih-cabe-oriental-seed',
    category: 'Benih',
    price: 85000,
    discountPrice: 75000,
    stock: 50,
    unit: 'pack',
    description: 'Benih cabe berkualitas tinggi dari Oriental Seed dengan tingkat perkecambahan tinggi dan hasil panen melimpah. Cocok untuk dataran rendah hingga menengah.',
    features: [
      'Tingkat perkecambahan 90%+',
      'Tahan terhadap penyakit layu',
      'Hasil panen 15-20 ton/ha',
      'Umur panen 75-85 hari',
      'Buah besar dan seragam'
    ],
    imageUrl: '/assets/product-seeds-display_variant_4.jpg',
    images: ['/assets/product-seeds-display_variant_5.jpg'],
    isFeatured: true,
    metaTitle: 'Benih Cabe Oriental Seed - Berkualitas Tinggi | TOKOTANIONLINE',
    metaDescription: 'Beli benih cabe Oriental Seed berkualitas dengan tingkat perkecambahan 90%+. Hasil panen melimpah hingga 20 ton/ha. Harga terjangkau, stok terbatas!',
    metaKeywords: ['benih cabe', 'oriental seed', 'benih cabe hibrida', 'benih berkualitas']
  },
  {
    id: '2',
    name: 'Benih Kubis Greennova',
    slug: 'benih-kubis-greennova',
    category: 'Benih',
    price: 95000,
    discountPrice: 85000,
    stock: 40,
    unit: 'pack',
    description: 'Benih kubis Greennova dengan kualitas premium, menghasilkan kubis besar dan padat. Cocok untuk dataran tinggi dengan iklim sejuk.',
    features: [
      'Bobot per krop 1.5-2 kg',
      'Tahan terhadap hama ulat',
      'Umur panen 60-70 hari',
      'Tekstur padat dan renyah',
      'Warna hijau segar'
    ],
    imageUrl: '/assets/product-seeds-display_variant_6.jpg',
    images: ['/assets/product-seeds-display_variant_7.jpg'],
    isFeatured: true,
    metaTitle: 'Benih Kubis Greennova Premium | TOKOTANIONLINE',
    metaDescription: 'Benih kubis Greennova menghasilkan krop besar 1.5-2 kg dengan tekstur padat. Cocok untuk dataran tinggi. Pesan sekarang!',
    metaKeywords: ['benih kubis', 'greennova', 'benih sayuran', 'kubis premium']
  },
  {
    id: '3',
    name: 'Fungisida Mantep 80 WP',
    slug: 'fungisida-mantep-80-wp',
    category: 'Fungisida',
    price: 125000,
    stock: 100,
    unit: 'botol',
    description: 'Fungisida Mantep 80 WP efektif mengendalikan penyakit antraknosa, bercak daun, dan busuk buah pada tanaman cabe dan tomat.',
    features: [
      'Bahan aktif Mankozeb 80%',
      'Efektif untuk antraknosa',
      'Dosis 2-3 g/liter air',
      'Interval aplikasi 7 hari',
      'Aman untuk tanaman'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_25.jpg',
    images: ['/assets/product-pesticide-bottles_variant_26.jpg'],
    isFeatured: true,
    metaTitle: 'Fungisida Mantep 80 WP - Atasi Antraknosa | TOKOTANIONLINE',
    metaDescription: 'Fungisida Mantep 80 WP dengan mankozeb 80% efektif mengatasi antraknosa dan bercak daun. Harga murah, hasil maksimal!',
    metaKeywords: ['fungisida mantep', 'mankozeb', 'obat antraknosa', 'fungisida cabe']
  },
  {
    id: '4',
    name: 'Fungisida Manzate 82 WP',
    slug: 'fungisida-manzate-82-wp',
    category: 'Fungisida',
    price: 135000,
    stock: 80,
    unit: 'botol',
    description: 'Fungisida Manzate 82 WP dengan kandungan mankozeb tinggi untuk perlindungan maksimal terhadap penyakit jamur pada tanaman hortikultura.',
    features: [
      'Bahan aktif Mankozeb 82%',
      'Spektrum luas',
      'Dosis 2 g/liter air',
      'Efek protektan kuat',
      'Tahan hujan'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_27.jpg',
    images: ['/assets/product-pesticide-bottles_variant_28.jpg'],
    isFeatured: false,
    metaTitle: 'Fungisida Manzate 82 WP - Proteksi Maksimal | TOKOTANIONLINE',
    metaDescription: 'Manzate 82 WP dengan mankozeb 82% memberikan proteksi maksimal dari penyakit jamur. Tahan hujan dan efektif!',
    metaKeywords: ['fungisida manzate', 'mankozeb 82', 'obat jamur tanaman']
  },
  {
    id: '5',
    name: 'Maher',
    slug: 'maher',
    category: 'Fungisida',
    price: 145000,
    stock: 60,
    unit: 'botol',
    description: 'Fungisida sistemik Maher untuk mengendalikan penyakit busuk daun dan hawar daun pada tanaman padi, jagung, dan sayuran.',
    features: [
      'Bahan aktif Metalaksil + Mankozeb',
      'Sistemik dan kontak',
      'Dosis 2-2.5 g/liter',
      'Efektif untuk hawar daun',
      'Hasil cepat terlihat'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_29.jpg',
    images: ['/assets/product-pesticide-bottles_variant_30.jpg'],
    isFeatured: false,
    metaTitle: 'Fungisida Maher - Sistemik & Kontak | TOKOTANIONLINE',
    metaDescription: 'Fungisida Maher kombinasi metalaksil dan mankozeb. Sistemik dan kontak untuk hawar daun. Hasil cepat!',
    metaKeywords: ['fungisida maher', 'metalaksil', 'obat hawar daun']
  },
  {
    id: '6',
    name: 'Cabriotop',
    slug: 'cabriotop',
    category: 'Fungisida',
    price: 185000,
    stock: 45,
    unit: 'botol',
    description: 'Fungisida premium Cabriotop dengan teknologi terkini untuk perlindungan optimal terhadap penyakit embun tepung dan karat daun.',
    features: [
      'Bahan aktif Pyraclostrobin + Metiram',
      'Teknologi BASF',
      'Dosis 1.5-2 g/liter',
      'Efek kuratif dan protektan',
      'Meningkatkan hasil panen'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_31.jpg',
    images: ['/assets/product-pesticide-bottles_variant_32.jpg'],
    isFeatured: true,
    metaTitle: 'Cabriotop - Fungisida Premium BASF | TOKOTANIONLINE',
    metaDescription: 'Cabriotop fungisida premium dari BASF dengan pyraclostrobin. Efek kuratif dan protektan untuk hasil panen maksimal!',
    metaKeywords: ['cabriotop', 'fungisida basf', 'pyraclostrobin']
  },
  {
    id: '7',
    name: 'Raban',
    slug: 'raban',
    category: 'Fungisida',
    price: 95000,
    stock: 70,
    unit: 'botol',
    description: 'Fungisida Raban efektif mengendalikan penyakit bercak daun dan busuk buah dengan harga terjangkau.',
    features: [
      'Bahan aktif Klorotalonil',
      'Spektrum luas',
      'Dosis 2 ml/liter',
      'Ekonomis',
      'Cocok untuk berbagai tanaman'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_33.jpg',
    images: ['/assets/product-pesticide-bottles_variant_34.jpg'],
    isFeatured: false,
    metaTitle: 'Fungisida Raban - Ekonomis & Efektif | TOKOTANIONLINE',
    metaDescription: 'Fungisida Raban dengan klorotalonil, harga ekonomis tapi efektif untuk bercak daun dan busuk buah!',
    metaKeywords: ['fungisida raban', 'klorotalonil', 'fungisida murah']
  },
  {
    id: '8',
    name: 'Tridex',
    slug: 'tridex',
    category: 'Fungisida',
    price: 165000,
    stock: 55,
    unit: 'botol',
    description: 'Fungisida Tridex dengan formula triple action untuk perlindungan menyeluruh terhadap berbagai penyakit tanaman.',
    features: [
      'Triple action formula',
      'Protektan, kuratif, eradikatif',
      'Dosis 1.5-2 ml/liter',
      'Tahan lama',
      'Efektif untuk embun tepung'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_35.jpg',
    images: ['/assets/product-pesticide-bottles_variant_36.jpg'],
    isFeatured: false,
    metaTitle: 'Tridex - Fungisida Triple Action | TOKOTANIONLINE',
    metaDescription: 'Tridex fungisida dengan triple action: protektan, kuratif, eradikatif. Perlindungan menyeluruh untuk tanaman!',
    metaKeywords: ['fungisida tridex', 'triple action', 'obat embun tepung']
  },
  {
    id: '9',
    name: 'Antila',
    slug: 'antila',
    category: 'Fungisida',
    price: 155000,
    stock: 50,
    unit: 'botol',
    description: 'Fungisida Antila khusus untuk mengendalikan penyakit antraknosa pada cabe dengan efektivitas tinggi.',
    features: [
      'Khusus untuk antraknosa',
      'Efektivitas 95%+',
      'Dosis 2 ml/liter',
      'Aman untuk buah',
      'Tidak meninggalkan residu'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_37.jpg',
    images: ['/assets/product-pesticide-bottles_variant_38.jpg'],
    isFeatured: true,
    metaTitle: 'Antila - Spesialis Antraknosa Cabe | TOKOTANIONLINE',
    metaDescription: 'Fungisida Antila spesialis antraknosa cabe dengan efektivitas 95%+. Aman dan tidak meninggalkan residu!',
    metaKeywords: ['fungisida antila', 'obat antraknosa cabe', 'antraknosa']
  },
  {
    id: '10',
    name: 'Cadilac',
    slug: 'cadilac',
    category: 'Fungisida',
    price: 175000,
    stock: 40,
    unit: 'botol',
    description: 'Fungisida Cadilac premium untuk perlindungan total terhadap penyakit busuk daun dan hawar pada tanaman sayuran.',
    features: [
      'Formula premium',
      'Sistemik translaminar',
      'Dosis 1-1.5 ml/liter',
      'Efek cepat',
      'Tahan hujan 2 jam'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_39.jpg',
    images: ['/assets/product-pesticide-bottles_variant_40.jpg'],
    isFeatured: false,
    metaTitle: 'Cadilac - Fungisida Premium Sistemik | TOKOTANIONLINE',
    metaDescription: 'Cadilac fungisida premium sistemik translaminar. Efek cepat dan tahan hujan untuk perlindungan total!',
    metaKeywords: ['fungisida cadilac', 'sistemik translaminar']
  },
  {
    id: '11',
    name: 'Brofeya',
    slug: 'brofeya',
    category: 'Fungisida',
    price: 115000,
    stock: 65,
    unit: 'botol',
    description: 'Fungisida Brofeya efektif untuk mengendalikan penyakit bercak daun dan busuk batang pada tanaman hortikultura.',
    features: [
      'Bahan aktif Propineb',
      'Kontak protektan',
      'Dosis 2-3 g/liter',
      'Ekonomis',
      'Spektrum luas'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_41.jpg',
    images: ['/assets/product-pesticide-bottles_variant_42.jpg'],
    isFeatured: false,
    metaTitle: 'Brofeya - Fungisida Propineb | TOKOTANIONLINE',
    metaDescription: 'Fungisida Brofeya dengan propineb untuk bercak daun dan busuk batang. Harga ekonomis, spektrum luas!',
    metaKeywords: ['fungisida brofeya', 'propineb', 'obat bercak daun']
  },
  {
    id: '12',
    name: 'Gracia',
    slug: 'gracia',
    category: 'Fungisida',
    price: 195000,
    stock: 35,
    unit: 'botol',
    description: 'Fungisida Gracia teknologi terkini untuk perlindungan maksimal terhadap penyakit jamur pada tanaman buah dan sayuran.',
    features: [
      'Teknologi Syngenta',
      'Bahan aktif Azoxystrobin',
      'Dosis 0.5-1 ml/liter',
      'Efek sistemik kuat',
      'Meningkatkan kualitas buah'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_43.jpg',
    images: ['/assets/product-pesticide-bottles_variant_44.jpg'],
    isFeatured: true,
    metaTitle: 'Gracia - Fungisida Teknologi Syngenta | TOKOTANIONLINE',
    metaDescription: 'Gracia fungisida premium Syngenta dengan azoxystrobin. Sistemik kuat, meningkatkan kualitas buah!',
    metaKeywords: ['fungisida gracia', 'syngenta', 'azoxystrobin']
  },
  {
    id: '13',
    name: 'Dimodis',
    slug: 'dimodis',
    category: 'Fungisida',
    price: 105000,
    stock: 75,
    unit: 'botol',
    description: 'Fungisida Dimodis untuk mengendalikan penyakit embun bulu dan busuk daun pada tanaman sayuran daun.',
    features: [
      'Bahan aktif Dimethomorph',
      'Khusus embun bulu',
      'Dosis 1-2 ml/liter',
      'Sistemik lokal',
      'Aman untuk tanaman'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_45.jpg',
    images: ['/assets/product-pesticide-bottles_variant_46.jpg'],
    isFeatured: false,
    metaTitle: 'Dimodis - Spesialis Embun Bulu | TOKOTANIONLINE',
    metaDescription: 'Fungisida Dimodis dengan dimethomorph khusus untuk embun bulu. Sistemik lokal dan aman!',
    metaKeywords: ['fungisida dimodis', 'dimethomorph', 'obat embun bulu']
  },
  {
    id: '14',
    name: 'Rizotin',
    slug: 'rizotin',
    category: 'Fungisida',
    price: 225000,
    stock: 30,
    unit: 'botol',
    description: 'Fungisida Rizotin premium untuk mengendalikan penyakit busuk akar dan layu pada tanaman dengan efektivitas tinggi.',
    features: [
      'Khusus penyakit tanah',
      'Bahan aktif Metalaksil-M',
      'Dosis 2-3 g/liter',
      'Sistemik akar',
      'Efektivitas 90%+'
    ],
    imageUrl: '/assets/product-pesticide-bottles_variant_47.jpg',
    images: ['/assets/product-pesticide-bottles_variant_48.jpg'],
    isFeatured: false,
    metaTitle: 'Rizotin - Spesialis Penyakit Tanah | TOKOTANIONLINE',
    metaDescription: 'Rizotin fungisida premium untuk busuk akar dan layu. Sistemik akar dengan efektivitas 90%+!',
    metaKeywords: ['fungisida rizotin', 'metalaksil-m', 'obat busuk akar']
  }
];

// Blog data - simplified content without nested template literals
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: string;
  category: string;
  tags: string[];
  imageUrl: string;
  publishedAt: string;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string[];
}

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Cara Mengatasi Penyakit Antraknosa Pada Cabe',
    slug: 'cara-mengatasi-penyakit-antraknosa-pada-cabe',
    excerpt: 'Antraknosa adalah penyakit yang sering menyerang tanaman cabe dan menyebabkan kerugian besar. Pelajari cara efektif mengatasinya.',
    content: 'Antraknosa merupakan salah satu penyakit yang paling ditakuti oleh petani cabe. Gunakan fungisida Mantep 80 WP, Antila, atau Cabriotop untuk pengendalian efektif.',
    author: 'Tim Agronomi TOKOTANIONLINE',
    category: 'Hama & Penyakit',
    tags: ['antraknosa', 'penyakit cabe', 'fungisida', 'tips bertani'],
    imageUrl: '/assets/blog-chili-plant_variant_3.jpg',
    publishedAt: '2024-12-10',
    metaTitle: 'Cara Mengatasi Antraknosa Cabe - Panduan Lengkap | TOKOTANIONLINE',
    metaDescription: 'Panduan lengkap mengatasi penyakit antraknosa pada cabe. Pelajari gejala, penyebab, dan cara pengendalian efektif dengan fungisida yang tepat.',
    metaKeywords: ['antraknosa cabe', 'penyakit cabe', 'cara mengatasi antraknosa', 'fungisida antraknosa']
  },
  {
    id: '2',
    title: 'Cabe Rontok Bunga? Ini Solusinya',
    slug: 'cabe-rontok-bunga-ini-solusinya',
    excerpt: 'Bunga cabe yang rontok sebelum menjadi buah adalah masalah umum. Temukan penyebab dan solusi efektifnya di sini.',
    content: 'Rontok bunga pada tanaman cabe dapat dicegah dengan pemupukan seimbang, pengaturan lingkungan yang baik, dan aplikasi ZPT yang tepat.',
    author: 'Tim Agronomi TOKOTANIONLINE',
    category: 'Tips Bertani',
    tags: ['cabe', 'rontok bunga', 'tips bertani', 'pemupukan'],
    imageUrl: '/assets/blog-chili-plant_variant_4.jpg',
    publishedAt: '2024-12-12',
    metaTitle: 'Cabe Rontok Bunga? Ini Penyebab dan Solusinya | TOKOTANIONLINE',
    metaDescription: 'Atasi masalah bunga cabe rontok dengan panduan lengkap ini. Pelajari penyebab dan solusi efektif untuk meningkatkan hasil panen cabe.',
    metaKeywords: ['cabe rontok bunga', 'bunga cabe gugur', 'tips cabe', 'pemupukan cabe']
  },
  {
    id: '3',
    title: 'Panduan Lengkap Budidaya Cabe Hybrid',
    slug: 'panduan-lengkap-budidaya-cabe-hybrid',
    excerpt: 'Panduan step-by-step budidaya cabe hybrid dari persiapan lahan hingga panen untuk hasil maksimal.',
    content: 'Cabe hybrid menawarkan produktivitas tinggi dengan potensi hasil 15-25 ton/ha. Gunakan Benih Cabe Oriental Seed untuk hasil terbaik.',
    author: 'Tim Agronomi TOKOTANIONLINE',
    category: 'Tips Bertani',
    tags: ['budidaya cabe', 'cabe hybrid', 'panduan bertani', 'tips sukses'],
    imageUrl: '/assets/blog-chili-plant_variant_5.jpg',
    publishedAt: '2024-12-14',
    metaTitle: 'Panduan Lengkap Budidaya Cabe Hybrid - Hasil 20 Ton/Ha | TOKOTANIONLINE',
    metaDescription: 'Panduan step-by-step budidaya cabe hybrid dari persiapan lahan hingga panen. Raih hasil 15-25 ton/ha dengan teknik yang tepat!',
    metaKeywords: ['budidaya cabe hybrid', 'cara tanam cabe', 'panduan bertani cabe', 'cabe hasil tinggi']
  },
  {
    id: '4',
    title: 'Cara Meningkatkan Hasil Panen Kubis',
    slug: 'cara-meningkatkan-hasil-panen-kubis',
    excerpt: 'Tips dan trik meningkatkan produktivitas kubis hingga 2 kg per krop dengan teknik budidaya yang tepat.',
    content: 'Kubis adalah sayuran bernilai ekonomi tinggi dengan potensi hasil 1.5-2 kg per krop. Gunakan Benih Kubis Greennova untuk hasil maksimal.',
    author: 'Tim Agronomi TOKOTANIONLINE',
    category: 'Tips Bertani',
    tags: ['budidaya kubis', 'kubis', 'tips bertani', 'hasil panen'],
    imageUrl: '/assets/blog-cabbage-harvest.jpg',
    publishedAt: '2024-12-15',
    metaTitle: 'Cara Meningkatkan Hasil Panen Kubis 2 Kg/Krop | TOKOTANIONLINE',
    metaDescription: 'Panduan lengkap meningkatkan produktivitas kubis hingga 2 kg per krop. Tips pemupukan, pengairan, dan pengendalian hama yang efektif!',
    metaKeywords: ['budidaya kubis', 'cara tanam kubis', 'hasil panen kubis', 'tips kubis']
  },
  {
    id: '5',
    title: 'Perbedaan Fungisida Mantep 80 WP dan Manzate 82 WP',
    slug: 'perbedaan-fungisida-mantep-80-wp-dan-manzate-82-wp',
    excerpt: 'Mengenal perbedaan, keunggulan, dan cara aplikasi yang tepat untuk Fungisida Mantep 80 WP dan Manzate 82 WP.',
    content: 'Mantep 80 WP dan Manzate 82 WP adalah dua fungisida berbasis mankozeb yang populer. Pilih sesuai kebutuhan dan kondisi lapangan Anda.',
    author: 'Tim Agronomi TOKOTANIONLINE',
    category: 'Fungisida',
    tags: ['fungisida', 'mantep', 'manzate', 'mankozeb', 'perbandingan'],
    imageUrl: '/assets/product-pesticide-bottles_variant_49.jpg',
    publishedAt: '2024-12-16',
    metaTitle: 'Perbedaan Mantep 80 WP vs Manzate 82 WP - Mana yang Lebih Baik? | TOKOTANIONLINE',
    metaDescription: 'Perbandingan lengkap Fungisida Mantep 80 WP dan Manzate 82 WP. Pelajari perbedaan, keunggulan, dan cara aplikasi yang tepat untuk hasil maksimal!',
    metaKeywords: ['mantep 80 wp', 'manzate 82 wp', 'perbedaan fungisida', 'mankozeb', 'fungisida terbaik']
  }
];

// WhatsApp numbers
export const whatsappNumbers = [
  { id: '1', phone: '6281234567890', name: 'Admin 1' },
  { id: '2', phone: '6281234567891', name: 'Admin 2' },
  { id: '3', phone: '6281234567892', name: 'Admin 3' }
];

// Marketplace links
export const marketplaceLinks = {
  shopee: 'https://shopee.co.id/tokotanionline',
  tokopedia: 'https://www.tokopedia.com/tokotanionline'
};

// Site settings
export const siteSettings = {
  siteName: 'TOKOTANIONLINE',
  siteDescription: 'Toko Pertanian Online Terpercaya - Jual Benih, Fungisida, Pupuk, dan Alat Pertanian Berkualitas',
  siteKeywords: ['toko pertanian', 'benih', 'fungisida', 'pupuk', 'alat pertanian', 'saprotan'],
  contactEmail: 'info@tokotanionline.com',
  contactPhone: '6281234567890',
  address: 'Jl. Pertanian No. 123, Jakarta',
  facebookPixel: 'YOUR_FACEBOOK_PIXEL_ID',
  googleAdsTag: 'YOUR_GOOGLE_ADS_TAG',
  googleAnalytics: 'YOUR_GA4_ID',
  tiktokPixel: 'YOUR_TIKTOK_PIXEL_ID'
};