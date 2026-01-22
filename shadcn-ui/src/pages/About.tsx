import { Target, Users, Award, Heart } from 'lucide-react';

export default function About() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-green-700 text-white py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-4">Tentang Kami</h1>
          <p className="text-green-100 text-lg">
            Mitra terpercaya petani Indonesia sejak 2020
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Hero Image */}
        <div className="mb-12">
          <img
            src="/assets/about-team.jpg"
            alt="Tim TOKOTANIONLINE"
            className="w-full h-96 object-cover rounded-lg shadow-lg"
          />
        </div>

        {/* Story */}
        <div className="max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold mb-6 text-center">Cerita Kami</h2>
          <div className="prose prose-lg max-w-none text-gray-700 space-y-4">
            <p>
              TOKOTANIONLINE lahir dari kepedulian kami terhadap petani Indonesia yang sering kesulitan mendapatkan sarana produksi pertanian (saprotan) berkualitas dengan harga terjangkau. Sejak 2020, kami berkomitmen untuk menjadi jembatan antara petani dengan produk-produk pertanian terbaik.
            </p>
            <p>
              Kami memahami bahwa kesuksesan panen dimulai dari pemilihan input yang tepat. Oleh karena itu, kami hanya menyediakan produk-produk berkualitas tinggi dari brand terpercaya, mulai dari benih unggul, fungisida efektif, pupuk bernutrisi, hingga alat pertanian modern.
            </p>
            <p>
              Dengan pengalaman lebih dari 4 tahun melayani ribuan petani di seluruh Indonesia, kami terus berinovasi untuk memberikan pelayanan terbaik. Tidak hanya menjual produk, kami juga menyediakan konsultasi gratis dan edukasi pertanian melalui artikel-artikel berkualitas di blog kami.
            </p>
          </div>
        </div>

        {/* Values */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-center">Nilai-Nilai Kami</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Kualitas Terjamin</h3>
              <p className="text-gray-600 text-sm">
                Semua produk dijamin original dan berkualitas tinggi dari distributor resmi
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Fokus Pelanggan</h3>
              <p className="text-gray-600 text-sm">
                Kepuasan dan kesuksesan petani adalah prioritas utama kami
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Profesional</h3>
              <p className="text-gray-600 text-sm">
                Tim ahli yang berpengalaman siap memberikan konsultasi terbaik
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-green-700" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Kepercayaan</h3>
              <p className="text-gray-600 text-sm">
                Membangun hubungan jangka panjang berdasarkan kepercayaan
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-green-700 text-white rounded-lg shadow-lg p-8 mb-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold mb-2">4+</div>
              <div className="text-green-100">Tahun Berpengalaman</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">5000+</div>
              <div className="text-green-100">Petani Terlayani</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">100+</div>
              <div className="text-green-100">Produk Berkualitas</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">98%</div>
              <div className="text-green-100">Kepuasan Pelanggan</div>
            </div>
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Misi Kami</h2>
          <p className="text-xl text-gray-700 mb-8">
            "Memberdayakan petani Indonesia dengan menyediakan akses mudah ke produk pertanian berkualitas tinggi dan pengetahuan praktis untuk meningkatkan produktivitas dan kesejahteraan mereka."
          </p>
        </div>
      </div>
    </div>
  );
}