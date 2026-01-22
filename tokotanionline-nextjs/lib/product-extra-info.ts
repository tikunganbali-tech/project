/**
 * M-09: Product Extra Info Utilities
 * Ensures all additional info fields are always filled
 */

/**
 * Generate general dosage based on category (safe, non-medical)
 */
function generateGeneralDosage(productName: string, category?: string | null): string {
  const categoryLower = category?.toLowerCase() || '';
  
  if (categoryLower.includes('pupuk')) {
    return `Gunakan sesuai anjuran untuk jenis tanaman dan fase pertumbuhan. Konsultasikan dengan ahli pertanian untuk dosis optimal sesuai kondisi lahan dan tanaman Anda.`;
  }
  if (categoryLower.includes('pestisida')) {
    return `Gunakan sesuai anjuran pada label kemasan. Perhatikan interval aplikasi dan waktu tunggu sebelum panen. Ikuti petunjuk keselamatan yang tertera.`;
  }
  return `Gunakan sesuai petunjuk pada kemasan produk. Untuk dosis optimal, sesuaikan dengan kondisi dan kebutuhan spesifik Anda. Konsultasikan dengan ahli jika diperlukan.`;
}

/**
 * M-09: Ensure Product Extra Info (WAJIB TERISI SEMUA FIELD)
 * Priority: Manual override > AI generate > Fallback deterministik
 * 
 * @param input - Current field values (may be empty/null)
 * @param keyword - Product name/keyword
 * @param category - Product category name
 * @returns Object with all fields guaranteed to be filled
 */
export function ensureProductExtraInfo(
  input: {
    specifications?: string | null;
    problemSolution?: string | null;
    applicationMethod?: string | null;
    dosage?: string | null;
    advantages?: string | null;
    safetyNotes?: string | null;
  },
  keyword: string,
  category?: string | null
): {
  specifications: string;
  problemSolution: string;
  applicationMethod: string;
  dosage: string;
  advantages: string;
  safetyNotes: string;
} {
  const categoryName = category || 'produk pertanian';
  const keywordName = keyword || 'produk';

  return {
    specifications: input.specifications?.trim() || 
      `<ul><li>Spesifikasi ${keywordName} kategori ${categoryName}</li><li>Kualitas premium dengan standar tinggi</li><li>Terjamin keaslian dan kualitasnya</li></ul>`,
    problemSolution: input.problemSolution?.trim() || 
      `Apa masalah yang diselesaikan ${keywordName}?\n\n${keywordName} dirancang untuk mengatasi kebutuhan dalam aplikasi pertanian dan perkebunan. Produk ini memberikan solusi praktis dengan kualitas terjamin.\n\nBagaimana cara ${keywordName} bekerja?\n\nProduk ini bekerja secara efektif dengan formula yang telah teruji, memberikan hasil optimal sesuai kebutuhan pengguna.`,
    applicationMethod: input.applicationMethod?.trim() || 
      `Gunakan ${keywordName} sesuai petunjuk penggunaan pada kemasan. Pastikan mengikuti instruksi yang dianjurkan untuk hasil optimal.`,
    dosage: input.dosage?.trim() || 
      generateGeneralDosage(keywordName, categoryName),
    advantages: input.advantages?.trim() || 
      `Manfaat utama ${keywordName} untuk kebutuhan Anda:\n\n- Kualitas premium dengan standar tinggi\n- Mudah digunakan dan praktis\n- Hasil optimal dan terjamin\n- Terpercaya dan aman digunakan`,
    safetyNotes: input.safetyNotes?.trim() || 
      `Simpan ${keywordName} di tempat kering dan aman. Hindari paparan sinar matahari langsung dan jaga dari jangkauan anak-anak. Produk asli bergaransi.`,
  };
}
